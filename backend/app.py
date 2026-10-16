import asyncio
import hmac
import logging
import os
import re
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db
from .bolna import Bolna
from .stacks import DEFAULT_STACK, STACKS, Session, pick_stack, stack_for_agent
from .verdict import CHILD_CONFIRMED, CHILD_SAFE, NOT_CONFIRMED, decide, normalize_word

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("asli")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
RETAP_WINDOW_S = 30
DRILL_WINDOW_S = 30 * 60
UNREACHED = {"no-answer", "busy", "failed", "canceled", "error", "balance-low"}
TERMINAL = UNREACHED | {"completed", "call-disconnected", "stopped"}
DRILL_EXPECTED = {1: CHILD_SAFE, 2: CHILD_SAFE, 3: "authority", 4: "authority"}
AUTHORITY_MARK = "डिजिटल अरेस्ट नाम की कोई चीज़"
PAID_MARK = "अभी तुरंत 1930 पर कॉल कीजिए"
PLACEHOLDER = re.compile(r"^%\(\w+\)s$")


class Runtime:
    def __init__(self):
        self.bolna = None
        self.timers: dict[str, asyncio.Task] = {}
        self.tasks: set[asyncio.Task] = set()

    def spawn(self, coro) -> asyncio.Task:
        task = asyncio.create_task(coro)
        self.tasks.add(task)
        task.add_done_callback(self._reap)
        return task

    def _reap(self, task: asyncio.Task) -> None:
        self.tasks.discard(task)
        if not task.cancelled() and task.exception():
            log.error("background task failed", exc_info=task.exception())


rt = Runtime()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    owned = rt.bolna is None
    if owned:
        rt.bolna = Bolna()
    yield
    for task in list(rt.tasks):
        task.cancel()
    rt.timers.clear()
    if owned:
        await rt.bolna.aclose()
        rt.bolna = None


app = FastAPI(title="Asli hai?", lifespan=lifespan)


def require_secret(request: Request) -> None:
    expected = os.getenv("TOOL_SECRET", "")
    auth = request.headers.get("authorization", "")
    given = auth[7:] if auth.lower().startswith("bearer ") else ""
    if not expected or not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(401, "Bad or missing secret")


async def payload(request: Request) -> dict:
    try:
        body = await request.json()
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {}


def clean(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"none", "null", "undefined"} or PLACEHOLDER.match(text):
        return None
    return text


def parse_amount(value) -> float | None:
    digits = re.sub(r"[^\d.]", "", clean(value) or "")
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def to_e164(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10:
        digits = "91" + digits
    if len(digits) != 12 or not digits.startswith("91") or digits[2] not in "6789":
        raise ValueError(raw)
    return "+" + digits


def tokens(text: str | None) -> set[str]:
    return {t for t in re.split(r"[^\wऀ-ॿ]+", (text or "").lower()) if t}


def contact_order(contacts: list[dict], claimed_name: str | None) -> list[dict]:
    ordered = sorted(contacts, key=lambda c: c["priority"])
    said = tokens(claimed_name)
    match = next((c for c in ordered if said & tokens(f"{c['name']} {c['relation'] or ''}")), None)
    if match is None:
        return ordered
    return [match] + [c for c in ordered if c is not match]


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(8)}"


def get_session(session_id: str | None) -> dict:
    session = db.one("SELECT * FROM sessions WHERE id = ?", session_id) if session_id else None
    if not session:
        raise HTTPException(404, "Unknown session")
    return session


def family_contacts(family_id: str) -> list[dict]:
    return db.all_rows("SELECT * FROM contacts WHERE family_id = ? ORDER BY priority", family_id)


def claim_from_execution(data: dict) -> str | None:
    extracted = {**(data.get("extracted_data") or {}), **(data.get("node_extracted_data") or {})}
    transcript = str(data.get("transcript") or "")
    if extracted.get("claimed_authority") or AUTHORITY_MARK in transcript:
        return "authority"
    if extracted.get("paid_amount") is not None or PAID_MARK in transcript:
        return "paid"
    return None


async def finish(session_id: str, event: str, properties: dict, reason: str) -> bool:
    now = time.time()
    if not db.execute("UPDATE sessions SET verdict = ?, verdict_at = ? WHERE id = ? AND verdict IS NULL", event, now, session_id):
        return False
    timer = rt.timers.pop(session_id, None)
    if timer and timer is not asyncio.current_task():
        timer.cancel()

    session = db.one("SELECT * FROM sessions WHERE id = ?", session_id)
    if session["parent_run_id"]:
        try:
            await rt.bolna.fire_event(session["parent_run_id"], event, properties)
        except Exception:
            log.exception("fire_event failed session=%s event=%s", session_id, event)

    seconds = round(now - session["started_at"], 1)
    log.info("verdict session=%s stack=%s event=%s reason=%s seconds_to_verdict=%.1f",
             session_id, session["stack"], event, reason, seconds)
    if session["drill_id"]:
        record_drill(session["drill_id"], event, seconds)
    if session["parent_ended_at"]:
        await send_summary(session_id)
    return True


def record_drill(drill_id: int, outcome: str | None, seconds: float | None) -> None:
    drill = db.one("SELECT script FROM drills WHERE id = ?", drill_id)
    correct = int(DRILL_EXPECTED.get(drill["script"]) == outcome) if drill else None
    db.execute("UPDATE drills SET seconds_to_verdict = ?, verdict_correct = ? WHERE id = ?", seconds, correct, drill_id)


async def verdict_timeout(session_id: str) -> None:
    await asyncio.sleep(float(os.getenv("VERDICT_TIMEOUT_S", "75")))
    rt.timers.pop(session_id, None)
    await finish(session_id, NOT_CONFIRMED, {}, "timeout")


async def dial(session_id: str, start: int) -> None:
    session = db.one("SELECT * FROM sessions WHERE id = ?", session_id)
    family = db.one("SELECT parent_name FROM families WHERE id = ?", session["family_id"])
    order = contact_order(family_contacts(session["family_id"]), session["claimed_name"])
    agent_id = STACKS.get(session["stack"], {}).get("check")
    if not agent_id:
        log.error("no check agent for stack=%s", session["stack"])
        order = []

    for contact in order[start:]:
        if db.one("SELECT verdict FROM sessions WHERE id = ?", session_id)["verdict"]:
            return
        user_data = {
            "session_id": session_id,
            "child_name": contact["name"],
            "parent_name": family["parent_name"],
            "claimed_name": session["claimed_name"] or contact["name"],
            "amount_asked": session["amount"] or 0,
            "did_call": "Unsure",
            "spoken_word": "",
        }
        try:
            run_id = await rt.bolna.place_call(agent_id, contact["phone"], user_data)
        except Exception:
            log.exception("check call failed session=%s priority=%s", session_id, contact["priority"])
            continue
        db.execute("UPDATE sessions SET check_run_id = ?, contact_priority = ? WHERE id = ?", run_id, contact["priority"], session_id)
        log.info("check call session=%s priority=%s run=%s", session_id, contact["priority"], run_id)
        return

    await finish(session_id, NOT_CONFIRMED, {}, "no contact reachable")


def summary_text(session: dict, family: dict) -> str:
    who = session["claimed_name"] or "someone"
    amount = f" for Rs {session['amount']:,.0f}" if session["amount"] else ""
    outcomes = {
        CHILD_SAFE: f"The family said they did not call. Saathi told {family['parent_name']} it was fake and not to pay.",
        CHILD_CONFIRMED: f"The family confirmed the call with the family word. Saathi told {family['parent_name']} it was genuine.",
        NOT_CONFIRMED: f"Saathi could not reach the family in time and told {family['parent_name']} not to pay until they speak to you.",
        "authority": f"The caller claimed to be police or an official. Saathi told {family['parent_name']} to hang up and not pay.",
        "paid": f"{family['parent_name']} may have already sent money or an OTP. Saathi told them to call 1930 and their bank. Please call them now.",
    }
    outcome = outcomes.get(session["verdict"] or session["claim_type"], f"{family['parent_name']} used the line; no verdict was reached.")
    return f"Asli hai?: {family['parent_name']} got a call from {who} asking{amount}. {outcome}"


async def send_summary(session_id: str) -> None:
    if not db.execute("UPDATE sessions SET summary_sent_at = ? WHERE id = ? AND summary_sent_at IS NULL", time.time(), session_id):
        return
    session = db.one("SELECT * FROM sessions WHERE id = ?", session_id)
    family = db.one("SELECT * FROM families WHERE id = ?", session["family_id"])
    text = summary_text(session, family)
    for contact in family_contacts(session["family_id"]):
        log.info("summary session=%s to=%s text=%s", session_id, contact["phone"], text)


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    relation: str = Field("", max_length=40)
    phone: str = Field(max_length=20)


class FamilyIn(BaseModel):
    parent_name: str = Field(min_length=1, max_length=60)
    parent_phone: str = Field(max_length=20)
    language: str = Field("hi", max_length=10)
    contacts: list[ContactIn] = Field(min_length=1, max_length=2)
    family_word_latin: str = Field(min_length=1, max_length=60)
    family_word_devanagari: str = Field(min_length=1, max_length=60)
    invite_code: str = ""


class TriggerIn(BaseModel):
    family_id: str = Field(max_length=40)
    drill_id: int | None = None


@app.get("/")
def home():
    return RedirectResponse("/web/signup.html")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/families")
def register_family(body: FamilyIn):
    code = os.getenv("SIGNUP_CODE")
    if code and not hmac.compare_digest(body.invite_code.strip().encode(), code.encode()):
        raise HTTPException(403, "That invite code isn't valid. Ask the pilot team for yours.")
    try:
        parent_phone = to_e164(body.parent_phone)
        phones = [to_e164(c.phone) for c in body.contacts]
    except ValueError:
        raise HTTPException(400, "Use a 10-digit Indian mobile number for every phone.")
    if not normalize_word(body.family_word_latin) or not re.search(r"[ऀ-ॿ]", body.family_word_devanagari):
        raise HTTPException(400, "Type the family word in English letters and in Hindi letters.")
    if db.one("SELECT 1 FROM families WHERE parent_phone = ?", parent_phone):
        raise HTTPException(409, "This parent's number is already registered.")

    family_id = new_id("f")
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO families (id, parent_name, parent_phone, language, family_word_latin, family_word_devanagari) VALUES (?, ?, ?, ?, ?, ?)",
            (family_id, body.parent_name.strip(), parent_phone, body.language, body.family_word_latin.strip(), body.family_word_devanagari.strip()),
        )
        conn.executemany(
            "INSERT INTO contacts (family_id, name, relation, phone, priority) VALUES (?, ?, ?, ?, ?)",
            [(family_id, c.name.strip(), c.relation.strip(), phone, i) for i, (c, phone) in enumerate(zip(body.contacts, phones), 1)],
        )
    log.info("family registered id=%s contacts=%d", family_id, len(phones))
    return {"family_id": family_id, "tap_url": f"/web/tap.html?f={family_id}"}


@app.post("/trigger")
async def trigger(body: TriggerIn):
    family = db.one("SELECT * FROM families WHERE id = ?", body.family_id)
    if not family:
        raise HTTPException(404, "Unknown family")
    now = time.time()
    recent = db.one(
        "SELECT id FROM sessions WHERE family_id = ? AND started_at > ? AND parent_ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
        family["id"], now - RETAP_WINDOW_S,
    )
    if recent:
        return {"session_id": recent["id"], "repeat": True}

    drill = db.one(
        "SELECT id FROM drills d WHERE family_id = ? AND (id = ? OR (? IS NULL AND ran_at > ?))"
        " AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.drill_id = d.id) ORDER BY ran_at DESC LIMIT 1",
        family["id"], body.drill_id, body.drill_id, now - DRILL_WINDOW_S,
    )
    drill_id = drill["id"] if drill else None
    stack = pick_stack(Session(drill_id))
    agent_id = STACKS.get(stack, {}).get("parent")
    if not agent_id:
        raise HTTPException(503, f"No parent agent configured for stack {stack}")

    session_id = new_id("s")
    db.execute("INSERT INTO sessions (id, family_id, stack, started_at, drill_id) VALUES (?, ?, ?, ?, ?)",
               session_id, family["id"], stack, now, drill_id)
    if drill_id:
        db.execute("UPDATE drills SET used_line = 1, stack = ? WHERE id = ?", stack, drill_id)

    user_data = {"session_id": session_id, "parent_name": family["parent_name"], "timezone": "Asia/Kolkata"}
    try:
        run_id = await rt.bolna.place_call(agent_id, family["parent_phone"], user_data)
    except Exception:
        log.exception("parent call failed session=%s", session_id)
        db.execute("UPDATE sessions SET parent_ended_at = ? WHERE id = ?", time.time(), session_id)
        raise HTTPException(502, "Could not place the call")
    db.execute("UPDATE sessions SET parent_run_id = ? WHERE id = ?", run_id, session_id)
    log.info("session started id=%s stack=%s drill=%s run=%s", session_id, stack, drill_id, run_id)
    return {"session_id": session_id}


@app.post("/tools/start_verification", dependencies=[Depends(require_secret)])
async def start_verification(request: Request):
    data = await payload(request)
    session = get_session(clean(data.get("session_id")))
    claimed_name = clean(data.get("claimed_name"))
    started = db.execute(
        "UPDATE sessions SET verification_started_at = ?, claimed_name = ?, amount = ?, story = ?, claim_type = 'family'"
        " WHERE id = ? AND verification_started_at IS NULL",
        time.time(), claimed_name, parse_amount(data.get("amount_asked")), clean(data.get("story")), session["id"],
    )
    if not started:
        claimed_name = session["claimed_name"]
    order = contact_order(family_contacts(session["family_id"]), claimed_name)
    calling = order[0]["name"] if order else ""
    if not started:
        current = next((c for c in order if c["priority"] == session["contact_priority"]), None)
        log.info("start_verification repeat ignored session=%s", session["id"])
        return {"calling": current["name"] if current else calling}

    rt.timers[session["id"]] = rt.spawn(verdict_timeout(session["id"]))
    rt.spawn(dial(session["id"], 0))
    return {"calling": calling}


@app.post("/tools/report_verdict", dependencies=[Depends(require_secret)])
async def report_verdict(request: Request):
    data = await payload(request)
    session = get_session(clean(data.get("session_id")))
    family = db.one("SELECT * FROM families WHERE id = ?", session["family_id"])
    contact = db.one("SELECT name FROM contacts WHERE family_id = ? AND priority = ?", session["family_id"], session["contact_priority"])
    event, properties = decide(clean(data.get("did_call")), clean(data.get("spoken_word")), family, contact["name"] if contact else "")
    await finish(session["id"], event, properties, "report")
    return {"received": True}


@app.post("/webhooks/bolna")
async def bolna_webhook(request: Request):
    run_id = clean((await payload(request)).get("id"))
    session = db.one("SELECT * FROM sessions WHERE check_run_id = ? OR parent_run_id = ?", run_id, run_id) if run_id else None
    if not session:
        return {"ok": True}
    # Bolna webhooks are unsigned, so act only on the execution as Bolna's API reports it.
    try:
        data = await rt.bolna.get_execution(run_id)
    except Exception:
        log.exception("get_execution failed run=%s", run_id)
        return {"ok": False}
    status = (clean(data.get("status")) or "").lower()
    if session["check_run_id"] == run_id:
        await on_check_status(session, run_id, status, data)
    elif status in TERMINAL:
        await on_parent_ended(session, data)
    return {"ok": True}


def not_answered(status: str, data: dict) -> bool:
    if status in UNREACHED or data.get("answered_by_voice_mail"):
        return True
    return status in {"completed", "call-disconnected"} and not data.get("conversation_duration")


async def on_check_status(session: dict, run_id: str, status: str, data: dict) -> None:
    unreached = not_answered(status, data)
    if session["verdict"] or not (unreached or status in TERMINAL):
        return
    # Bolna repeats status webhooks; clearing the run id lets exactly one of them advance the session.
    if not db.execute("UPDATE sessions SET check_run_id = NULL WHERE id = ? AND check_run_id = ?", session["id"], run_id):
        return
    if not unreached:
        await finish(session["id"], NOT_CONFIRMED, {}, f"check call {status} without report")
        return
    order = contact_order(family_contacts(session["family_id"]), session["claimed_name"])
    index = next((i for i, c in enumerate(order) if c["priority"] == session["contact_priority"]), len(order))
    log.info("check call unreached session=%s status=%s priority=%s", session["id"], status, session["contact_priority"])
    await dial(session["id"], index + 1)


async def on_parent_ended(session: dict, data: dict) -> None:
    claim_type = session["claim_type"] or claim_from_execution(data)
    if not db.execute("UPDATE sessions SET parent_ended_at = ?, claim_type = ? WHERE id = ? AND parent_ended_at IS NULL",
                      time.time(), claim_type, session["id"]):
        return
    if session["drill_id"] and not session["verification_started_at"]:
        record_drill(session["drill_id"], claim_type, None)
    if session["verdict"] or not session["verification_started_at"]:
        await send_summary(session["id"])


@app.get("/lookup", dependencies=[Depends(require_secret)])
def lookup(contact_number: str = "", agent_id: str = "", execution_id: str = ""):
    try:
        phone = to_e164(contact_number)
    except ValueError:
        phone = None
    family = db.one("SELECT * FROM families WHERE parent_phone = ?", phone) if phone else None
    if not family:
        return {}
    session_id = new_id("s")
    stack = stack_for_agent(agent_id) or DEFAULT_STACK
    db.execute("INSERT INTO sessions (id, family_id, parent_run_id, stack, started_at) VALUES (?, ?, ?, ?, ?)",
               session_id, family["id"], execution_id or None, stack, time.time())
    return {"session_id": session_id, "parent_name": family["parent_name"], "timezone": "Asia/Kolkata"}


app.mount("/web", StaticFiles(directory=WEB_DIR, html=True), name="web")
