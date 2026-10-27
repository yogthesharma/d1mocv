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

- Status: Open (needs owner confirmation)
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

- Status: Verified (one day sampled, 1 January 2026)
- Observation: 8 publishes per day at 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30 and 22:30 UTC. Each publish covers 73 hourly start times, about 72 hours ahead.
- Consequence: With the 09:00 cutoff the latest usable publish on D-1 is 07:30. The 09:30 publish is after the cutoff and is never used.
- To confirm: the same schedule holds for the whole month (checked by the data validation step).

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
