# Decisions

**Status:** draft, agreed before any code is written. Change an item here first, then change the code.

## Goal

Help a UK utility's day-ahead trading team do two things:

1. See the latest wind forecast that existed at the moment they had to decide (D-1).
2. Quantify how wrong wind forecasts usually are, so they can size a buffer.

Data: Elexon only. FUELHH (actual wind, `fuelType WIND`) and WINDFOR (forecast wind).

## Core logic

For each target half-hour on delivery day D, use the forecast with the latest `publishTime` at or before the decision cutoff on D-1. Forecasts published after the cutoff are never used (they would be future information).

## Decisions

**Cutoff time**

- Default 09:00 UTC on D-1, configurable in the UI.
- Assumption: sits safely before day-ahead gate closure. VERIFY the real gate time and update README and video accordingly.

**Forecast selection**

- Latest `publishTime <= cutoff` per `startTime`.
- Slots with no forecast before the cutoff are dropped and the UI shows how many.

**Date scope**

- Delivery days 1 to 31 January 2026.
- Fetch forecasts from about 25 Dec 2025 so Jan 1 is covered. Actuals for Jan 1 to 31.

**Timezone**

- Everything in UTC. January is GMT so UTC equals UK local time. State this in the README.

**Error definition**

- `error = forecast - actual`.
- Positive: forecast too high, trader assumed more wind than arrived, so they bought too little other power and are short.
- Negative: forecast too low, so they overbought.
- Show this wording next to the bias number in the UI.

**Metrics**

- MAE, RMSE, bias, P90 and P95 of absolute error.
- MAPE skipped: blows up when wind is near zero.

**Extra analysis**

- Error by forecast horizon (`startTime - publishTime`).
- Error by hour of day.
- Nothing fancier, 16 hour cap.

**Data handling**

- Fetch once with a script, clean, ship small parquet files with the app.
- No live Elexon calls from the deployed app.
- Fetch script stays in the repo so the data is reproducible.

**Deployment**

- Vercel: React static plus FastAPI as a serverless function.
- Fallback: frontend on Vercel, backend on Render.
- Test a deploy early. Do not leave it to the end.

**Repo**

- Public GitHub repo with a random anonymous name (e.g. kjhwr).
- Same random name for the Vercel project.
- Neutral git identity before the first commit.
- README states AI tool usage, directory layout, run steps, live link, assumptions.

**Cutoff UI**

- Add a cutoff selector. Makes the demo more interesting and shows the assumption is configurable.

## Time plan (16 hour hard cap)

| Hours | Work |
| ----- | ---- |
| 2h    | data exploration and cutoff logic |
| 4h    | backend and tests |
| 4h    | frontend |
| 2h    | Docker and deploy |
| 2h    | video |
| 2h    | buffer and polish |

Cut order if time runs short: CI, then dark mode, then hour-of-day chart. Never cut the cutoff-logic tests.

## Open items

- [ ] Verify the real day-ahead gate closure time.
- [ ] Confirm Vercel Python function size is OK with pandas and pyarrow (or precompute data).
- [ ] Decide UI polish level.