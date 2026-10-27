"""Metric math on hand-computed numbers, plus a cross-check against a plain loop."""

import math
from datetime import date, datetime, time, timedelta
from pathlib import Path

import pandas as pd
import pytest

from app.services.metrics import accuracy, error_by_horizon, error_metrics

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def test_metrics_on_hand_computed_errors():
    # abs errors sorted: 0, 10, 20, 30
    metrics = error_metrics(pd.Series([10.0, -30.0, 20.0, 0.0]))

    assert metrics.n == 4
    assert metrics.mae == 15.0
    assert metrics.bias == 0.0
    assert metrics.rmse == pytest.approx(math.sqrt(350))
    # linear interpolation: position 0.9 * 3 = 2.7 -> 20 + 0.7 * 10
    assert metrics.p90_abs == pytest.approx(27.0)
    assert metrics.p95_abs == pytest.approx(28.5)


def test_bias_is_positive_when_forecast_is_too_high():
    assert error_metrics(pd.Series([5.0, 15.0])).bias == 10.0
    assert error_metrics(pd.Series([-5.0, -15.0])).bias == -10.0


def test_missing_errors_are_ignored_and_empty_gives_none():
    assert error_metrics(pd.Series([10.0, float("nan")])).n == 1
    empty = error_metrics(pd.Series([float("nan")]))
    assert empty.n == 0
    assert empty.mae is None and empty.p95_abs is None


def test_horizon_buckets_use_every_version_and_skip_post_target_rows(make_forecasts, make_actuals):
    from tests.conftest import ts

    forecasts = make_forecasts(
        [
            (ts(10, 12), ts(10, 8), 110.0),  # 4h ahead   -> bucket 0-6, hour slot 12:00 and 12:30
            (ts(10, 12), ts(10, 0), 150.0),  # 12h ahead  -> bucket 12-18
            (ts(10, 12), ts(10, 13), 999.0),  # published after the target: excluded
        ]
    )
    actuals = make_actuals([(ts(10, 12), 100.0), (ts(10, 12, 30), 100.0)])

    buckets = error_by_horizon(forecasts, actuals, date(2026, 1, 10), date(2026, 1, 10))

    by_from = {b.from_hours: b for b in buckets}
    assert set(by_from) == {0, 12}
    assert by_from[0].metrics.n == 2 and by_from[0].metrics.bias == 10.0
    assert by_from[12].metrics.n == 2 and by_from[12].metrics.bias == 50.0


def _plain_loop_metrics(forecasts, actuals, first_decision, last_decision, cutoff_time):
    """Recompute overall decision-time errors without pandas selection or metrics code."""
    forecast_rows = [
        (r.start_time.to_pydatetime(), r.publish_time.to_pydatetime(), r.generation)
        for r in forecasts.itertuples()
    ]
    actual_by_start = {r.start_time.to_pydatetime(): r.generation for r in actuals.itertuples()}
    errors = []
    day = first_decision + timedelta(days=1)
    while day <= last_decision + timedelta(days=1):
        cutoff = datetime.combine(
            day - timedelta(days=1), cutoff_time, tzinfo=forecast_rows[0][0].tzinfo
        )
        midnight = datetime.combine(day, time(0), tzinfo=forecast_rows[0][0].tzinfo)
        for slot in range(48):
            start = midnight + timedelta(minutes=30 * slot)
            candidates = [
                (p, g) for s, p, g in forecast_rows if s == start.replace(minute=0) and p <= cutoff
            ]
            if candidates:
                errors.append(max(candidates)[1] - actual_by_start[start])
        day += timedelta(days=1)

    absolute = sorted(abs(e) for e in errors)

    def percentile(q):
        position = q * (len(absolute) - 1)
        low = math.floor(position)
        high = math.ceil(position)
        return absolute[low] + (absolute[high] - absolute[low]) * (position - low)

    n = len(errors)
    return {
        "n": n,
        "mae": sum(absolute) / n,
        "rmse": math.sqrt(sum(e * e for e in errors) / n),
        "bias": sum(errors) / n,
        "p90_abs": percentile(0.90),
        "p95_abs": percentile(0.95),
    }


@pytest.mark.parametrize("cutoff_time", [time(9, 0), time(0, 0)])
def test_accuracy_matches_plain_loop_for_the_whole_month(cutoff_time):
    forecasts = pd.read_parquet(DATA_DIR / "forecasts.parquet")
    actuals = pd.read_parquet(DATA_DIR / "actuals.parquet")
    first, last = date(2026, 1, 1), date(2026, 1, 31)

    expected = _plain_loop_metrics(forecasts, actuals, first, last, cutoff_time)
    overall = accuracy(forecasts, actuals, first, last, cutoff_time).overall

    assert overall.n == expected["n"]
    for name in ("mae", "rmse", "bias", "p90_abs", "p95_abs"):
        assert getattr(overall, name) == pytest.approx(expected[name])
