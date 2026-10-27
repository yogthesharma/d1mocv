"""Independent cross-check: a plain Python loop must give the same answer as the pandas code.

The loop below deliberately shares no code with app.services.selection. It walks the raw
rows one by one and applies the rule in words: for each half-hour, among forecasts for
that hour published at or before the cutoff, take the latest.
"""

from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path

import pandas as pd
import pytest

from app.services.selection import build_decision

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def plain_loop(forecast_rows, actual_by_start, delivery_day: date, cutoff_time: time):
    cutoff = datetime.combine(delivery_day - timedelta(days=1), cutoff_time, tzinfo=UTC)
    midnight = datetime.combine(delivery_day, time(0), tzinfo=UTC)
    out = []
    for slot in range(48):
        start = midnight + timedelta(minutes=30 * slot)
        hour = start.replace(minute=0)
        best = None
        for start_time, publish_time, generation in forecast_rows:
            if start_time != hour or publish_time > cutoff:
                continue
            if best is None or publish_time > best[0]:
                best = (publish_time, generation)
        actual = actual_by_start.get(start)
        if best is None:
            out.append((start, None, None, actual, None))
        else:
            out.append((start, best[1], best[0], actual, best[1] - actual))
    return out


@pytest.mark.parametrize("cutoff_time", [time(9, 0), time(7, 30), time(12, 0), time(3, 0)])
def test_pandas_selection_matches_plain_loop_for_every_delivery_day(cutoff_time):
    forecasts = pd.read_parquet(DATA_DIR / "forecasts.parquet")
    actuals = pd.read_parquet(DATA_DIR / "actuals.parquet")
    forecast_rows = [
        (row.start_time.to_pydatetime(), row.publish_time.to_pydatetime(), row.generation)
        for row in forecasts.itertuples()
    ]
    actual_by_start = {
        row.start_time.to_pydatetime(): row.generation for row in actuals.itertuples()
    }

    day = date(2026, 1, 2)
    while day <= date(2026, 2, 1):
        expected = plain_loop(forecast_rows, actual_by_start, day, cutoff_time)
        table = build_decision(forecasts, actuals, day, cutoff_time).table

        for (start, forecast, publish, actual, error), row in zip(
            expected, table.itertuples(), strict=True
        ):
            assert row.start_time.to_pydatetime() == start
            assert row.actual == actual
            if forecast is None:
                assert pd.isna(row.forecast)
                assert pd.isna(row.publish_time)
            else:
                assert row.forecast == forecast
                assert row.publish_time.to_pydatetime() == publish
                assert row.error == error
        day += timedelta(days=1)
