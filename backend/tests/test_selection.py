"""Cutoff logic on small hand-made fixtures. Delivery day is 10 Jan, cutoff 09:00 on 9 Jan."""

from datetime import time

from app.services.selection import build_decision, decision_cutoff, select_latest_forecasts
from tests.conftest import ts

CUTOFF = ts(9, 9, 0)
TARGET = ts(10, 0)  # 10 Jan 00:00, the first hour of the delivery day


def test_cutoff_is_nine_utc_on_the_day_before_delivery():
    assert decision_cutoff(ts(10, 0).date(), time(9, 0)) == CUTOFF.to_pydatetime()


def test_forecast_published_exactly_at_cutoff_is_included(make_forecasts):
    forecasts = make_forecasts([(TARGET, ts(9, 9, 0), 100.0)])
    chosen = select_latest_forecasts(forecasts, CUTOFF.to_pydatetime())
    assert chosen["generation"].tolist() == [100.0]


def test_forecast_published_just_after_cutoff_is_excluded(make_forecasts):
    forecasts = make_forecasts([(TARGET, ts(9, 9, 1), 100.0)])
    chosen = select_latest_forecasts(forecasts, CUTOFF.to_pydatetime())
    assert chosen.empty


def test_latest_version_before_cutoff_wins(make_forecasts):
    forecasts = make_forecasts(
        [
            (TARGET, ts(9, 2, 30), 100.0),
            (TARGET, ts(9, 7, 30), 120.0),  # latest before the cutoff
            (TARGET, ts(9, 9, 30), 999.0),  # after the cutoff, must never be used
        ]
    )
    chosen = select_latest_forecasts(forecasts, CUTOFF.to_pydatetime())
    assert chosen["generation"].tolist() == [120.0]
    assert chosen["publish_time"].tolist() == [ts(9, 7, 30)]


def test_slot_without_forecast_is_dropped_and_counted(make_forecasts, make_actuals):
    # Only 00:00 has a forecast. Every other hour of the day has none before the cutoff.
    forecasts = make_forecasts([(TARGET, ts(9, 7, 30), 100.0)])
    actuals = make_actuals([(ts(10, 0), 90.0), (ts(10, 0, 30), 95.0), (ts(10, 1), 80.0)])

    result = build_decision(forecasts, actuals, TARGET.date(), time(9, 0))

    assert len(result.table) == 48
    assert result.dropped_slots == 46  # 48 slots minus the two half-hours of hour 00
    assert result.table["forecast"].notna().sum() == 2


def test_hourly_forecast_applies_to_both_half_hours(make_forecasts, make_actuals):
    forecasts = make_forecasts([(TARGET, ts(9, 7, 30), 100.0)])
    actuals = make_actuals([(ts(10, 0), 90.0), (ts(10, 0, 30), 130.0)])

    table = build_decision(forecasts, actuals, TARGET.date(), time(9, 0)).table

    first_hour = table.iloc[:2]
    assert first_hour["forecast"].tolist() == [100.0, 100.0]
    # error = forecast - actual: too high is positive, too low is negative
    assert first_hour["error"].tolist() == [10.0, -30.0]


def test_horizon_is_hours_from_publish_to_target_half_hour(make_forecasts, make_actuals):
    forecasts = make_forecasts([(TARGET, ts(9, 7, 30), 100.0)])
    actuals = make_actuals([(ts(10, 0), 90.0), (ts(10, 0, 30), 95.0)])

    table = build_decision(forecasts, actuals, TARGET.date(), time(9, 0)).table

    # 07:30 on 9 Jan to 00:00 on 10 Jan is 16.5 hours, and 17 hours to 00:30.
    assert table["horizon_hours"].iloc[:2].tolist() == [16.5, 17.0]


def test_moving_the_cutoff_changes_the_forecast_used(make_forecasts, make_actuals):
    forecasts = make_forecasts([(TARGET, ts(9, 7, 30), 100.0), (TARGET, ts(9, 9, 30), 150.0)])
    actuals = make_actuals([(ts(10, 0), 90.0)])

    early = build_decision(forecasts, actuals, TARGET.date(), time(9, 0)).table
    late = build_decision(forecasts, actuals, TARGET.date(), time(10, 0)).table

    assert early["forecast"].iloc[0] == 100.0
    assert late["forecast"].iloc[0] == 150.0
