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
python scripts/render_agents.py           # writes build/agents/*.json with the URL and secret filled in
```

Create each rendered agent in Bolna, then put the returned ids in `.env` as `AGENT_ID_*`.

## Test

```bash
python -m pytest
python scripts/new_session.py <family_id> --expect child_safe   # places a real call; asks first
```

`new_session.py` logs each run to `test_runs.csv` with seconds to verdict and the current passing streak. The gate is 10 in a row.
