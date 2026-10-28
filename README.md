# Asli hai?

One tap before a parent pays. A voice agent calls the real family member, checks the family word, and tells the parent "safe, don't pay" while they wait.

The full design lives in [PLAN.md](PLAN.md).

## Layout

| Path | What |
| --- | --- |
| `agents/` | Bolna graph agents: parent line and family check, on the Sarvam and comparison stacks |
| `backend/` | FastAPI + SQLite: places calls, decides the verdict, fires it into the parent's live call |
| `web/` | `signup.html` registers a family; `tap.html` is the parent's one-tap button |
| `scripts/` | `new_session.py` runs a test session, `fire_event.py` fires an event by hand, `render_agents.py` fills agent placeholders |

## Run

```bash
pip install -r requirements.txt
cp .env.example .env    # fill BOLNA_API_KEY, TOOL_SECRET, PUBLIC_BASE_URL
python -m uvicorn backend.app:app --port 8000
```

Bolna has to reach the backend over HTTPS, so expose port 8000 through a tunnel and put its URL in `PUBLIC_BASE_URL`.

- Sign up a family: `http://localhost:8000/web/signup.html`
- The parent's button: the `tap.html?f=...` link the signup page returns

## Agents

```bash
python scripts/push_agents.py             # creates the agents, or updates them when AGENT_ID_* is already in .env
```

Re-run it whenever `agents/*.json` or `PUBLIC_BASE_URL` changes. `render_agents.py` writes the filled-in JSON to `build/agents/` without touching Bolna.

## Family summary

After each session the backend WhatsApps a short summary to every family contact. It runs a published Bolna workflow whose `aisensy_whatsapp` node sends an approved AiSensy template; `backend/notify.py` is the sender.

1. In AiSensy, submit the template body from `python scripts/summary_workflow.py --template-text` as a Utility template (language `en`), then launch it as an API campaign once approved.
2. In Bolna, link the AiSensy project under Integrations.
3. Put the template and campaign names in `.env` as `AISENSY_TEMPLATE_NAME` and `AISENSY_CAMPAIGN_NAME`.
4. `python scripts/summary_workflow.py` prints the workflow; `--publish` creates it in Bolna and prints the `SUMMARY_WORKFLOW_ID` for `.env`.

Sending happens in the background, so a slow or failing provider never delays the verdict. Each message carries `reference_id` `<session>-<priority>`, so Bolna refuses a second run for the same contact.

## Test

```bash
python -m pytest
python scripts/new_session.py <family_id> --expect child_safe   # places a real call; asks first
```

`new_session.py` logs each run to `test_runs.csv` with seconds to verdict and the current passing streak. The gate is 10 in a row.
