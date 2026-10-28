# Part 1 slides — editable source

The deck is `part1-slides.pptx` (six slides, 16:9). Narration lives in the
speaker notes of each slide. This file is the plain-text source so the deck
can be rebuilt or pasted into any tool.

## Slide 1 — Title

**Wind forecast desk**
A day-ahead wind forecasting and error pilot for the trading desk — January 2026

Notes (~0:00-0:35): Hi, I'm presenting the pilot we ran on day-ahead wind
forecasting. You buy power for tomorrow before you know the wind. This tool
answers the two questions your desk asked: what forecast did we actually have
when we decided, and how wrong is it, in megawatts.

## Slide 2 — The problem

- You buy electricity for tomorrow, one day ahead.
- Wind is free but uncertain, so you forecast it and buy the gap from thermal plants.
- The decision is made on D-1, before gate closure (09:20 EPEX, 09:50 N2EX UK time).
- So what matters is the forecast that existed when you decided — not the one published after.

Notes (~0:35-1:15): The desk buys power a day ahead. Wind is free but
weather-dependent, so the gap is bought from thermal plants. The decision is
made the day before delivery, before the day-ahead auctions close at 09:20 and
09:50 UK time. So the only forecast that counts is the one that existed at
decision time.

## Slide 3 — Two questions, one rule

1. What was the latest national wind forecast available when we decided?
2. How wrong is that forecast, in MW, so we can size a buffer?

The rule: only forecasts published at or before the decision cutoff count.
Everything published later is ignored.

Data: Elexon WINDFOR (forecasts) and FUELHH (actuals), national wind, January 2026.

Notes (~1:15-1:50): The pilot answers two questions: the latest national wind
forecast available at the moment of decision, and how wrong it typically is.
One rule makes it fair: only forecasts published at or before the cutoff
count. Data is Elexon's national wind only: WINDFOR forecasts and FUELHH
actuals.

## Slide 4 — January 2026 at a glance

- **31 decision days** — 1,488 half-hours checked
- **2,042 MW** — typical miss (mean absolute error)
- **+1,748 MW** — forecast runs high on average — you would be short
- **5,310 MW** — P95 buffer: 19 of 20 half-hours miss by less

Notes (~1:50-2:30): Over 31 decision days and 1,488 half-hours: the typical
miss is about 2 gigawatts. The forecast runs about 1.7 gigawatts high on
average — relying on it alone would leave you short. And 19 out of 20
half-hours miss by less than 5.3 gigawatts, which is how you size the buffer.

## Slide 5 — Live demo

Decision view · Accuracy view · move the cutoff and watch the numbers change

Notes (~2:30-5:00) DEMO. Decision view for 5 January, a typical day (MAE
2,093): the 48 half-hours with the forecast that existed at 09:00, the chart
with the planning band. Then Accuracy: the metrics, the takeaway, and the
horizon chart showing shorter horizons are more accurate. Move the cutoff to
00:00: early slots have no forecast and are dropped and counted. Back to
09:00: nothing dropped. Close with the buffer message.

## Slide 6 — What we recommend

- Size the buffer from P95: about 5.3 GW covered 19 of 20 January half-hours.
- Watch the bias: the forecast runs 1.7 GW high — consider a correction study.
- Next: scheduled live ingest, out-of-sample validation, other fuels.

Notes (~5:00 close): Our recommendation: plan buffers from the P95 miss, and
treat the 1.7 gigawatt bias as a known lean while we study a correction. Next
steps are a live ingest job, out-of-sample validation, and extending to other
fuels. Thank you.

## Demo dates (from the data, 09:00 cutoff)

- Typical: 2026-01-05 — MAE 2,093 MW, bias +1,835 MW (mirrors the month)
- Calm: 2026-01-18 — MAE 743 MW, bias −730 MW (the only overbought story)
- Worst miss: 2026-01-27 — MAE 5,375 MW, bias +5,375 MW (why buffers exist)