# PLAN

Single source of truth for progress. See Decisions.md (what and why) and Tech.md (stack and structure).
Tick items as they are finished. Nothing in the assessment should be missing from this file.

## Done

- [x] Read and understood the assessment (problem, requirements, deliverables)
- [x] Understood the core idea: use the latest forecast published at or before the D-1 cutoff, compare to actual
- [x] Wrote Decisions.md (cutoff, scope, error sign, metrics, data handling, deployment, repo naming)
- [x] Wrote Tech.md (frontend, backend, data, tests, project-wide tooling, repo layout)
- [x] Chose stack: Vite + React + TS, Tailwind, shadcn/ui, shadcn charts, TanStack Query; FastAPI, pandas, pyarrow, uv
- [x] Chose UI layout: shadcn Sidebar (controls on top, nav for Decision, Accuracy, Assistant)
- [x] Trimmed API to what the assessment asks: health, meta, forecast-at-decision, accuracy
- [x] Decided on no authentication (public data, evaluators need open access)
- [x] Decided on AI chat as optional, gated, built only after core is deployed
- [x] Decided on deployment: Vercel (fallback Render for backend)
- [x] Decided repo naming: random anonymous name, same for Vercel project
- [x] Reviewed the plan for gaps (this revision): decision-date interpretation, data validation, privacy hygiene, video hygiene, Vercel layout, README contents, acceptance checks

## Assessment traceability

| Assessment item | Delivered by | Verified by |
|---|---|---|
| Req 1: latest forecast available at decision time | /api/forecast-at-decision, Decision view | cutoff tests, hand cross-check |
| Req 2: quantitative forecast accuracy | /api/accuracy, Accuracy view | metric math tests |
| Wind only, national level, Elexon only | fetch script | data validation checks |
| Decisions made in January 2026 only | /api/meta range, 404 outside range | API tests |
| React frontend, Python backend | frontend/, backend/ | build and pytest |
| Docker | Dockerfiles, docker-compose | run from a clean clone |
| Deployed on Vercel or Heroku | live URL | incognito check |
| AI tools mentioned in README | README section | final README check |
| Unlisted YouTube video, 2 parts, 10 min max | video | incognito playback |
| Public repo with anonymous name | GitHub repo | privacy scan |
| README: files and directories, how to start, live link | README | follow it on a clean clone |
| Submission form | form | all links opened in incognito |

## To do

### Phase 0: Setup and facts
- [x] Generate random name, create folder, git init
- [x] Set neutral git identity for this repo BEFORE the first commit, verify with git config user.name and user.email
- [ ] Decide which GitHub account owns the repo (own account or a throwaway), create the empty public repo with the same name
- [x] Add .gitignore (python, node, .env, .vercel, raw data) and .env.example from the start
- [x] Create ASSUMPTIONS.md and record every assumption there (add to it in every phase)
- [x] Copy Decisions.md, Tech.md, PLAN.md into repo root
- [x] Verify tools: uv, Node 20+, Docker, git (and Claude Code if used)
- [x] Read the Elexon docs for FUELHH and WINDFOR: parameters, response format, whether a key is needed, rate limits; try one small request
- [x] Verify the real day-ahead gate closure time and set the cutoff default with a note of the source for the README
- [x] Confirm the decision-date interpretation (A2 in ASSUMPTIONS.md, confirmed by the owner)

### Phase 1: Data and cutoff logic
- [x] Scaffold backend with uv (fastapi, uvicorn, pandas, pyarrow, httpx, pydantic-settings, pytest, ruff)
- [x] Check pyproject.toml authors field is neutral (uv init may copy it from git config)
- [x] Write scripts/fetch_data.py: FUELHH (WIND) actuals and ALL WINDFOR forecast versions for the needed range, chunked by date, retries with backoff, dedupe, UTC, write parquet to data/
- [x] Run the fetch script locally and commit the small parquet files, so reviewers never need to fetch
- [x] Data validation checks (script or tests): 48 slots per day, no duplicate (startTime, publishTime), no nulls, MW units, coverage of the full range; rows published after their own target hour are expected (A10); write down any known gaps
- [x] Check parquet size (matters for Vercel)
- [x] Explore: publishTimes per startTime, forecast lead times, behaviour at the chosen cutoff, how many slots get dropped
- [x] Implement the cutoff selection function in services/ (publishTime <= cutoff, inclusive)
- [x] pytest cases: published exactly at cutoff, just after cutoff, multiple versions, none available (dropped and counted)
- [x] Independent cross-check of the selection with a plain Python loop over every delivery day and four cutoffs (the metrics cross-check is in Phase 2)

### Phase 2: Backend
- [ ] Config via pydantic-settings (default cutoff hour, data path, CORS origins)
- [ ] Data loader (parquet into DataFrames at startup, clear error if a data file is missing)
- [ ] Metrics service: MAE, RMSE, bias, P90, P95, error by forecast horizon (hour-of-day optional), cross-checked against a plain Python loop
- [ ] Pydantic response models (include publishTime, horizon, delivery date, dropped slot count)
- [ ] Endpoints: /api/health, /api/meta, /api/forecast-at-decision, /api/accuracy
- [ ] Input validation, 422 for bad params, 404 for decision dates outside January 2026
- [ ] CORS restricted to the app's own domains, request logging
- [ ] API tests with TestClient and metric math checks
- [ ] ruff clean, type hints in place, OpenAPI docs at /docs look right

### Phase 3: Early deploy check (walking skeleton)
- [ ] Decide the Vercel layout: api/index.py exposing the FastAPI app, vercel.json rewrites for /api/*, frontend build output
- [ ] Deploy a skeleton: /api/health plus a blank frontend page that calls it
- [ ] Confirm pandas and pyarrow fit the function size limit and cold start is acceptable
- [ ] If too heavy: precompute aggregates at build time and ship small JSON/parquet, or move the backend to Render
- [ ] Export requirements.txt from uv.lock for Vercel
- [ ] Confirm Deployment Protection is off, project name is the anonymous one, and the URL works in incognito
- [ ] Set environment variables on Vercel

### Phase 4: Frontend
- [ ] Vite + React + TS (strict), Tailwind, shadcn/ui setup, API base URL from env var
- [ ] Sidebar layout with decision date picker, cutoff selector, nav, React Router (3 routes)
- [ ] Generate API types from the OpenAPI schema
- [ ] TanStack Query hooks for each endpoint
- [ ] Decision view: KPI cards, forecast vs actual chart, table of 48 half-hours with publishTime, banner when slots were dropped
- [ ] Accuracy view: KPI cards, error by horizon chart, optional hour-of-day chart, plain-English takeaway generated from the numbers
- [ ] Show the assumptions in the UI: cutoff time, UTC, the sign of the error next to the bias number
- [ ] Units (MW) and UTC labelled everywhere, sensible number formatting, chart tooltips
- [ ] Loading, empty and error states
- [ ] Works at phone width, keyboard-usable controls, readable contrast
- [ ] Light and dark theme
- [ ] Neutral page title and favicon, no personal info anywhere
- [ ] ESLint, Prettier, a few Vitest tests, clean production build

### Phase 5: Docker and full deploy
- [ ] Backend Dockerfile (uv sync --frozen), .dockerignore
- [ ] Frontend multi-stage build
- [ ] docker-compose with healthchecks
- [ ] Test `docker compose up` from a fresh clone in a new folder, then `docker compose down`
- [ ] Production deploy on Vercel (frontend static, backend function), set env vars and CORS
- [ ] Smoke test the live URL in incognito and at phone width: load, change date, change cutoff, switch views, check numbers match local

### Phase 6: Optional AI chat (only after core is built, tested and deployed)
- [ ] Define tools: get_meta, get_forecast_at_decision, get_accuracy, calling the same services as the dashboard
- [ ] POST /api/chat with Claude API tool use
- [ ] System prompt restricts answers to this Elexon data and January 2026, refuses anything else
- [ ] Feature flag, server-side key only (never in the frontend bundle), per-IP rate limit, token cap
- [ ] Assistant view in the frontend, hidden when the flag is off, small note that answers come from the computed data
- [ ] Handle Vercel timeouts (fallback to non-streaming)
- [ ] Test with a short question set: numbers match the dashboard, out-of-scope questions are refused, missing key is handled
- [ ] If not finished: cut it and mention it as a next step in the video

### Phase 7: Polish, CI, README, privacy
- [ ] GitHub Actions: lint and tests (cut early if short on time, after AI chat)
- [ ] Makefile or scripts: dev, test, fetch-data
- [ ] README contents:
  - [ ] Overview and the two questions the app answers
  - [ ] Assumptions: cutoff time and its source, UTC, decision-date interpretation, error sign
  - [ ] Metric definitions
  - [ ] Directory and file listing
  - [ ] How to start: with Docker, and without Docker (uv and npm)
  - [ ] How to run tests and how to regenerate the data
  - [ ] Live app link
  - [ ] AI tools used (stated explicitly)
  - [ ] Limitations and next steps
  - [ ] Architecture diagram and a couple of screenshots
- [ ] Privacy scan: git log author and email, pyproject authors, package.json author, README, Dockerfiles, lockfiles, local paths, Vercel URLs
- [ ] Secrets scan: no API keys or .env committed anywhere in history
- [ ] Remove TODOs, debug logging and dead code

### Phase 8: Video
- [ ] Pick the demo dates from the data (a typical day, a calm day, a big-miss day) and note the key numbers
- [ ] Write a short script for each part
- [ ] Part 1 (max 5 min): customer pitch, the two questions answered, the demo, the buffer takeaway
- [ ] Part 2 (max 5 min): architecture, data pipeline, cutoff logic and tests, code tour, dev practices, trade-offs, next steps
- [ ] Recording hygiene: incognito or clean browser profile, no bookmarks or personal tabs, notifications off, terminal prompt and paths neutral, check audio
- [ ] Rehearse, record, total under 10 minutes
- [ ] Upload to YouTube as unlisted (not private) and check the channel name does not identify you
- [ ] Play the video in incognito

### Phase 9: Submit
- [ ] Open the video, repo and live app links in incognito and confirm access
- [ ] Repo is public, anonymous name, README matches the requirements
- [ ] Final check of the app on the live URL
- [ ] Fill in the submission form and keep the confirmation
- [ ] Keep the deployment live and unchanged while the submission is under review

## Definition of done

- Both requirements work on the live URL, with numbers that match the local run and the hand cross-check
- Cutoff logic tests pass in CI or locally
- A fresh clone runs with docker compose using only the README
- No personal information in the repo, history, deployment URL or video
- Video, repo and app all open in incognito

## Out of scope (mention as next steps in the video)

- Other fuel types, solar, demand, prices or any non-Elexon data
- Our own forecasting model
- Authentication and role-based access
- Live data refresh from Elexon
- Forecast revision history per slot

## Cut order if scope runs short

1. AI chat
2. CI
3. Dark mode
4. Hour-of-day chart

Never cut: cutoff-logic tests, the early Vercel deploy check, the README, the video.

## Open items

- Vercel size limit with pandas and pyarrow (resolved in Phase 3)
- Which GitHub account owns the repo
- UI polish level
