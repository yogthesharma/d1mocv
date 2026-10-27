# Tech

## Frontend

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS
- shadcn/ui: button, card, select, tabs, popover, calendar, skeleton, tooltip, badge, alert, table
- shadcn charts (Recharts wrapper)
- TanStack Query for data fetching
- date-fns, always in UTC
- API types generated from the FastAPI OpenAPI schema (openapi-typescript)
- Light and dark theme via shadcn tokens
- ESLint + Prettier, a few Vitest tests for helpers
- React Router with three routes (/decision, /accuracy, /assistant) so each view has its own URL, driven by the sidebar

UI structure (shadcn Sidebar, collapsible on mobile):
- Sidebar top: app name, delivery date picker, cutoff time selector
- Sidebar nav: Decision view, Accuracy, Assistant (Assistant only if the AI chat flag is on)
- Decision view: KPI cards, forecast vs actual chart for the chosen day, table of the 48 half-hours with publishTime
- Accuracy view: KPI cards (MAE, RMSE, bias, P90, P95), error by horizon chart, optional error by hour chart, "what this means" takeaway panel
- Assistant view: chat UI (optional, see AI chat section)
- States: skeleton loaders, empty state, error alert

## Backend

- Python 3.12, FastAPI + Uvicorn
- uv for dependency and environment management: pyproject.toml + uv.lock committed, `uv sync` to install, `uv run` to execute (app, tests, fetch script)
- Docker image installs from uv.lock (`uv sync --frozen`) so local, Docker and CI all use identical versions
- Vercel: export requirements.txt from the lockfile (`uv export --no-dev --no-hashes > requirements.txt`) since Vercel's Python runtime reads requirements.txt
- Pydantic v2 response models for every endpoint (OpenAPI docs at /docs)
- pydantic-settings for config (default cutoff hour, data path, CORS origins)
- pandas + pyarrow, parquet loaded once at startup
- httpx for the fetch script
- pytest + FastAPI TestClient
- ruff for lint and format (installed as a uv dev dependency), type hints everywhere
- Standard logging, one line per request

Layout:
- routers/   HTTP only
- services/  forecast selection, metrics
- data/      loading
- schemas/   Pydantic models
- core/      config, errors

Endpoints (kept to exactly what the assessment needs):
- GET /api/health
- GET /api/meta (available date range, default cutoff)
- GET /api/forecast-at-decision?date=&cutoff_hour=
  Requirement 1: the 48 half-hours with selected forecast, its publishTime, and the actual.
- GET /api/accuracy?start=&end=&cutoff_hour=
  Requirement 2: MAE, RMSE, bias, P90/P95 of absolute error, error by forecast horizon. Error by hour of day included only if time allows.
- POST /api/chat (optional, behind a feature flag, see AI chat section)

Error handling: consistent JSON errors, 422 for bad dates, 404 for dates outside January 2026.

## Data

- scripts/fetch_data.py pulls FUELHH (WIND) and WINDFOR from Elexon in date chunks with retries.
- Cleans, dedupes, converts to UTC, writes parquet into data/.
- Deployed app only reads the parquet files.

## AI chat (optional, gated)

Only built after the core is finished, tested and deployed (target: start around hour 11). Hard cap about 2 hours.

- POST /api/chat using the Claude API with tool use, streaming the reply
- Tools call the same service functions as the dashboard (forecast at decision, accuracy), so every number comes from computed data, never from the model
- System prompt restricts answers to this Elexon wind data and January 2026; refuse anything else
- Example questions: "How much buffer should I plan for Jan 15?", "Was the forecast biased on windy days?"
- API key server-side only, never in the frontend
- Feature flag (env var) and per-IP rate limit; if the key is missing the Assistant nav item is hidden
- Watch Vercel function timeouts with streaming; fall back to non-streaming if needed
- If not finished in time, cut it and mention it in the video as a next step

## Tests (must have)

Cutoff logic, using small hand-made fixtures:
- forecast published exactly at cutoff (included)
- forecast published just after cutoff (excluded)
- multiple versions, latest before cutoff wins
- no forecast available (slot dropped and counted)

Plus a few API tests and metric math checks.

## Project-wide

- Docker: multi-stage frontend build, backend image, docker-compose, healthchecks
- Makefile or npm scripts: dev, test, fetch-data
- CI: GitHub Actions running lint and tests (first thing to cut if short on time)
- Small meaningful commits, proper .gitignore

## Repo layout (target)

```
<random-name>/
  backend/
    app/ (routers, services, data, schemas, core)
    tests/
  frontend/
  scripts/fetch_data.py
  data/
  docker-compose.yml
  README.md
  Decisions.md
  Tech.md
```

## Known risks

- Vercel serverless size limit vs pandas + pyarrow. Test deploy early, or precompute metrics and ship small JSON/parquet.
- Scope vs 16 hours. See cut order in Decisions.md.
