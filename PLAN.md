# PLAN

Single source of truth for progress. See Decisions.md (what and why) and Tech.md (stack and structure).
Tick items as they are finished. Nothing in the assessment should be missing from this file.

## Done

- [x] Read and understood the assessment (problem, requirements, deliverables)
- [x] Understood the core idea: use the latest forecast published at or before the D-1 cutoff, compare to actual
- [x] Wrote Decisions.md (cutoff, scope, error sign, metrics, data handling, deployment, repo naming)
- [x] Wrote Tech.md (frontend, backend, data, tests, project-wide tooling, repo layout)
- [x] Chose stack: Vite + React + TS, Tailwind, shadcn/ui, shadcn charts, TanStack Query; FastAPI, pandas, pyarrow, uv
- [x] Chose UI layout: shadcn Sidebar (controls on top, nav for Decision, Accuracy, ~~Assistant~~)
- [x] Trimmed API to what the assessment asks: health, meta, forecast-at-decision, accuracy
- [x] Decided on no authentication (public data, evaluators need open access)
- [x] ~~Decided on AI chat as optional, gated, built only after core is deployed~~
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
- [x] Config via pydantic-settings (default cutoff hour, data path, CORS origins)
- [x] Data loader (parquet into DataFrames at startup, clear error if a data file is missing)
- [x] Metrics service: MAE, RMSE, bias, P90, P95, error by forecast horizon (hour-of-day optional), cross-checked against a plain Python loop
- [x] Pydantic response models (include publishTime, horizon, delivery date, dropped slot count)
- [x] Endpoints: /api/health, /api/meta, /api/forecast-at-decision, /api/accuracy
- [x] Input validation, 422 for bad params, 404 for decision dates outside January 2026
- [x] CORS restricted to the app's own domains, request logging
- [x] API tests with TestClient and metric math checks
- [x] ruff clean, type hints in place
- [x] OpenAPI docs: schema reviewed (summaries, descriptions, parameter text added). The Swagger UI page itself could not be rendered in the in-app browser because its script loads from a CDN that pane did not load, so it was not seen rendered

### Phase 3: Early deploy check (walking skeleton)
- [x] Decide the Vercel layout: api/index.py exposing the FastAPI app, vercel.json rewrites for /api/*, frontend build output
- [x] Deploy a skeleton: /api/health plus a blank frontend page that calls it
- [x] Confirm pandas and pyarrow fit the function size limit (39.2 MB) and responses are acceptable (warm 0.4 to 1.0 s; cold start not measured separately)
- [x] If too heavy: not needed, the full backend fits
- [x] Export requirements.txt from uv.lock for Vercel
- [x] Confirm Deployment Protection is off, project name is the anonymous one, and the URL works in incognito
- [x] Environment variables on Vercel: none needed yet (defaults match, same domain); ~~revisit in Phase 6 for the AI chat key~~

### Phase 4: Frontend
- [x] Vite + React + TS (strict), Tailwind, shadcn/ui setup, API base URL from env var
- [x] Sidebar layout with decision date picker, cutoff selector, nav, React Router (~~3~~ routes)
- [x] Generate API types from the OpenAPI schema
- [x] TanStack Query hooks for each endpoint
- [x] Decision view: KPI cards, forecast vs actual chart, table of 48 half-hours with publishTime, banner when slots were dropped
- [x] Accuracy view: KPI cards, error by horizon chart, optional hour-of-day chart, plain-English takeaway generated from the numbers
- [x] Show the assumptions in the UI: cutoff time, UTC, the sign of the error next to the bias number
- [x] Units (MW) and UTC labelled everywhere, sensible number formatting, chart tooltips
- [x] Loading and error states (an empty state is not reachable with this data; missing metrics are handled)
- [x] Works at phone width (checked at 375px, no horizontal page scroll)
- [x] Keyboard-usable controls, readable contrast (axe-core: 0 violations on both views in light and dark; Tab order checked: date, cutoff, nav, sidebar toggle, theme, chart, table)
- [x] Light and dark theme
- [x] Neutral page title and favicon, no personal info anywhere
- [x] ESLint, Prettier, a few Vitest tests, clean production build (views are lazy-loaded; first load is about 515 kB, 167 kB gzipped, and the charts load on demand)

### Phase 5: Docker and full deploy
- [x] Backend Dockerfile (uv sync --frozen), .dockerignore
- [x] Frontend multi-stage build
- [x] docker-compose with healthchecks
- [x] Test `docker compose up` from a fresh copy of the repo in a new folder (tracked and unignored files only, built with layer cache), then `docker compose down`. Also tested from a real GitHub clone in an empty folder on host ports 18000/18080: health and meta OK, the 48 slots of 2026-01-16 at the 09:00 cutoff with none dropped, UI served, then down -v. The first attempt on default ports hit an already-allocated host port 8000, so it was rerun with the documented API_PORT/WEB_PORT overrides.
- [x] Production deploy on Vercel (frontend static, backend function), set env vars and CORS
- [x] Smoke test the live URL anonymously and at phone width: load, change cutoff, switch views, numbers match local and Docker (MAE 2,042 MW, bias +1,748 MW at 09:00)

### Phase 6: Optional AI chat (only after core is built, tested and deployed) — dropped: a streaming chat does not make sense on a serverless deploy
~~- [ ] Define tools: get_meta, get_forecast_at_decision, get_accuracy, calling the same services as the dashboard~~
~~- [ ] POST /api/chat with Claude API tool use~~
~~- [ ] System prompt restricts answers to this Elexon data and January 2026, refuses anything else~~
~~- [ ] Feature flag, server-side key only (never in the frontend bundle), per-IP rate limit, token cap~~
~~- [ ] Assistant view in the frontend, hidden when the flag is off, small note that answers come from the computed data~~
~~- [ ] Handle Vercel timeouts (fallback to non-streaming)~~
~~- [ ] Test with a short question set: numbers match the dashboard, out-of-scope questions are refused, missing key is handled~~
- [ ] ~~If not finished: cut it and mention it as a next step in the video~~

### Phase 7: Polish, CI, README, privacy
- [x] GitHub Actions: lint, tests, build, generated-file drift checks and a Docker build (every step was also run locally first; the workflow has run on GitHub and passed). The drift check caught stale generated API types, now regenerated
- [x] Makefile or scripts: dev, test, fetch-data
- [x] README contents:
  - [x] Overview and the two questions the app answers
  - [x] Assumptions: cutoff time and its source, UTC, decision-date interpretation, error sign
  - [x] Metric definitions
  - [x] Directory and file listing
  - [x] How to start: with Docker, and without Docker (uv and npm)
  - [x] How to run tests and how to regenerate the data
  - [x] Live app link
  - [x] AI tools used (stated explicitly)
  - [x] Limitations and next steps
  - [x] Architecture diagram and a couple of screenshots
- [x] Privacy scan: git log author and email (neutral), pyproject and package.json authors (none), README, Dockerfiles, lockfiles (public registries only), local paths, screenshots metadata. Clean. Not covered by a scan: the GitHub repo owner and Vercel per-deployment URLs contain the account name, so only share the production alias
- [x] Secrets scan: no API keys, tokens or .env files in any commit (checked the full history with patterns for common key formats; only .env.example is tracked)
- [x] Remove TODOs, debug logging and dead code (none found in backend, frontend, scripts or api)

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

1. ~~AI chat~~
2. CI
3. Dark mode
4. Hour-of-day chart

Never cut: cutoff-logic tests, the early Vercel deploy check, the README, the video.

## Open items

- Vercel size limit with pandas and pyarrow (resolved in Phase 3)
- Which GitHub account owns the repo
- UI polish level
