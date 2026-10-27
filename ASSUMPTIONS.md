# Assumptions

Every assumption the app depends on. Each has an ID, the statement, the reason, how it was checked, and what changes if it is wrong. Add new items at the end; do not renumber.

Status values: Verified (checked against a source or live API), Unverified (reasonable, not confirmed), Open (needs an answer from the owner).

## A1. Decision cutoff is 09:00 UTC on D-1

- Status: Verified (reasoning from public gate closure times)
- Statement: The buying decision is made on D-1 and only forecasts published at or before 09:00 UTC on D-1 are usable. The cutoff is configurable in the UI.
- Reason: GB day-ahead auctions close at 09:20 UK time (EPEX) and 09:50 UK time (N2EX). A 09:00 cutoff sits before both, leaving time to act on the forecast.
- Check: Published exchange information, see sources below. January is GMT, so UK time equals UTC.
- If wrong: change the default in config and the README; the logic does not depend on the value.
- Sources: [Nord Pool, about the day-ahead GB auction](https://support.nordpoolgroup.com/support/solutions/articles/8000088463-about-the-day-ahead-gb-auction), [Modo Energy, wholesale power prices](https://developers.modoenergy.com/docs/wholesale-power-prices), [S&P Global note on UK day-ahead timing](https://www.spglobal.com/commodity-insights/en/pricing-benchmarks/our-methodology/subscriber-notes/120920-platts-to-amend-uk-day-ahead-power-assessments-timing-from-jan-4)
- Caveat: these sources are partly from 2020 and 2021; current rulebooks were not checked.

## A2. Decision dates are 1 to 31 January 2026

- Status: Verified (confirmed by the owner)
- Statement: "Purchase decisions made in January 2026" means decision dates 1 to 31 January, so delivery days are 2 January to 1 February 2026.
- Reason: The decision is made on D-1, so the delivery day is one day after the decision date.
- If wrong: only the fetch range and the date limits in the API change.

## A3. All times are UTC

- Status: Verified
- Statement: Every timestamp is UTC. January is GMT, so UTC equals UK local time.
- Check: Both Elexon datasets return times with a Z suffix.
- If wrong: not applicable for January 2026.

## A4. Error = forecast minus actual

- Status: Unverified (a convention, chosen on purpose)
- Statement: Positive error means the forecast was too high, so the buyer assumed more wind than arrived and bought too little other power (short). Negative means overbought.
- If wrong: flip the sign in one place and the UI wording.

## A5. WINDFOR is hourly and FUELHH is half-hourly

- Status: Verified (one live request each)
- Statement: WINDFOR startTime values fall only on the hour. FUELHH startTime values are every 30 minutes.
- Rule (assumption): the hourly forecast for hour H is applied to both half-hours H:00 and H:30, so each of the 48 half-hours of a delivery day has a forecast to compare.
- Reason: Without a rule, half of the half-hours would have no forecast. Repeating the value is the simplest rule and does not invent data.
- If wrong: replace the rule (for example interpolation) in the join step only.

## A6. WINDFOR publish schedule in January 2026

- Status: Verified (full fetched range, 29 Dec 2025 to 1 Feb 2026)
- Observation: exactly 8 publishes every day, at 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30 and 22:30 UTC. One extra time, 12:25, appears on one occasion. Each publish covers 73 hourly start times, about 72 hours ahead.
- Consequence: With the 09:00 cutoff the latest usable publish on D-1 is 07:30 on every delivery day. The 09:30 publish is after the cutoff and is never used.

## A7. FUELHH stream parameters

- Status: Verified (one live request)
- Observation: `settlementDateFrom`, `settlementDateTo` and `fuelType=WIND` work on the stream endpoint. Both dates are inclusive. One row per half-hour, no duplicate startTime in the sample.
- Consequence: The non-stream endpoint is not needed.

## A8. Data is a static snapshot

- Status: Verified (design choice)
- Statement: Data is fetched once by a script and shipped as parquet. The deployed app makes no Elexon calls.
- Reason: Reliable demo, no rate limits, fast responses. The data is historical, so it does not change.
- If wrong: add an ingest job and database (listed as a next step).

## A9. Forecast used for a slot is the latest version at or before the cutoff

- Status: Verified (task wording)
- Statement: Among all forecasts for a startTime, take the one with the greatest publishTime that is less than or equal to the cutoff. A forecast published exactly at the cutoff is included.
- Slots with no such forecast are dropped and counted, not filled.

## A10. Some WINDFOR rows are published after their own target hour

- Status: Verified
- Observation: 3697 of 18080 forecast rows have publish_time later than start_time. Each publish includes a few hours that have already started.
- Rule: no special handling. A D-1 cutoff is always before the delivery day, so these rows are never selected. They are kept in the data because the horizon analysis uses all versions.

## A11. Forecast horizon at the default cutoff

- Status: Verified
- Observation: With the 09:00 cutoff, all 48 half-hours of every delivery day (2 Jan to 1 Feb) have a forecast, all from the 07:30 publish on D-1. The horizon (target time minus publish time) runs from 16.5 to 40.0 hours across the day. At a 00:00 cutoff on D-1 up to 4 slots a day have no forecast and are dropped (longest horizon 47.0 hours). At a 23:59 cutoff nothing is dropped.
- Consequence: Dropped slots only appear for early cutoffs, and the UI shows how many.

## A12. Data coverage and units

- Status: Verified
- Statement: Actuals cover 2 Jan to 1 Feb 2026, 1488 half-hours, no gaps, no duplicates, no nulls. Generation is in MW, 1695 to 17805 for actuals and 2250 to 21353 for forecasts. Forecasts cover every delivery hour with 16 to 32 versions per hour.
- Check: backend/app/data/validation.py, run by scripts/fetch_data.py and by the tests.
- Rows published after their own target hour are allowed by the validator (A10); they are reported by `count_after_target`, not treated as errors.

## A13. API parameters are decision dates and whole-hour cutoffs

- Status: Unverified (design choice)
- Statement: `/api/forecast-at-decision` takes `decision_date` (the day the buyer decides, D-1) and the response also gives `delivery_date`. `/api/accuracy` takes `start` and `end` as decision dates. `cutoff_hour` is a whole UTC hour from 0 to 23 on the decision date, default 9. Decision dates outside 1 to 31 January 2026 return 404.
- Reason: The assessment talks about purchase decisions made in January, so the user picks the decision day. Whole hours keep the selector simple; the logic itself accepts any minute.
- If wrong: rename the parameter or add minutes in the router only.

## A14. How the accuracy numbers are defined

- Status: Unverified (design choice)
- Statement: Overall and by-hour metrics use the decision-time forecast for each half-hour, so they change with the cutoff. Percentiles (P90, P95) are of the absolute error with linear interpolation. The by-horizon view uses every published forecast version for the delivery days in range, in 6 hour buckets of target time minus publish time, and does not depend on the cutoff. Versions published after their target slot started are excluded from it (A10).
- Reason: The by-horizon view shows how much better forecasts get closer to delivery, which is what tells the team whether waiting for a later forecast would help.
- If wrong: change the bucket size or restrict the view to decision-time forecasts in services/metrics.py.

## A15. Observation: forecasts run high at every horizon

- Status: Verified (observation, cause not established)
- Observation: Over all 31 decision days at the 09:00 cutoff, MAE is about 2,040 MW, RMSE about 2,510 MW, P95 absolute error about 5,310 MW, and bias about +1,750 MW (forecast above actual). The bias is positive in every horizon bucket, including forecasts made 0 to 6 hours ahead (about +1,430 MW), so it is not only a long-range weather error.
- Possible cause (not verified): the two Elexon datasets may not measure exactly the same thing, for example in how embedded or non-metered wind is counted. This was not investigated further and the app does not correct for it.
- Consequence: The app reports it as it is. The bias number is shown with its meaning so the team can add it to their buffer, and the limitation is listed for the video and README.

## A16. Vercel deployment layout

- Status: Verified (deployed and tested)
- Statement: One Vercel project named like the repo. The React build (`frontend/dist`) is served statically, and `api/index.py` exposes the FastAPI app as one Python function, with `backend/app` and `data` bundled in. `vercel.json` sets `"framework": null`; without that, Vercel treats the project as a FastAPI backend, skips the Python dependency install and ignores the frontend output. Python 3.12 comes from `.python-version`.
- Size: the function is 39.2 MB with pandas and pyarrow, so no precomputing or separate backend is needed. Warm responses took about 0.4 to 1.0 seconds for `/api/accuracy`. A true cold start was not measured separately.
- Access: the production alias `d1mocv.vercel.app` opens without a Vercel login. Other Vercel URLs for the same project contain the account name, so only the production alias should be shared.
- `requirements.txt` at the repo root is exported from `backend/uv.lock` and must be re-exported whenever backend dependencies change: `uv export --project backend --no-dev --no-hashes --no-emit-project -o requirements.txt`.
- No environment variables are needed yet: the defaults match, and the app and API share one domain, so CORS is not involved.

