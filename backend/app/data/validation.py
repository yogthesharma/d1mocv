"""Sanity checks for the fetched Elexon wind data."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pandas as pd

SLOTS_PER_DAY = 48


def _midnight(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=UTC)


def validate(
    actuals: pd.DataFrame,
    forecasts: pd.DataFrame,
    first_delivery: date,
    last_delivery: date,
) -> list[str]:
    """Return a list of human readable problems, empty when the data looks right."""
    problems: list[str] = []
    days = (last_delivery - first_delivery).days + 1

    if actuals["generation"].isna().any() or actuals["start_time"].isna().any():
        problems.append("actuals contain nulls")
    if actuals["start_time"].duplicated().any():
        problems.append("actuals contain duplicate start_time")
    if (actuals["generation"] < 0).any():
        problems.append("actuals contain negative generation")
    expected = pd.date_range(
        _midnight(first_delivery),
        _midnight(last_delivery + timedelta(days=1)),
        freq="30min",
        inclusive="left",
    )
    if len(expected) != days * SLOTS_PER_DAY:
        problems.append("internal: expected slot count is wrong")
    missing = expected.difference(pd.DatetimeIndex(actuals["start_time"]))
    if len(missing):
        problems.append(f"actuals missing {len(missing)} half-hours, first {missing[0]}")
    extra = pd.DatetimeIndex(actuals["start_time"]).difference(expected)
    if len(extra):
        problems.append(f"actuals have {len(extra)} half-hours outside the range")

    if forecasts[["start_time", "publish_time", "generation"]].isna().any().any():
        problems.append("forecasts contain nulls")
    if forecasts.duplicated(["start_time", "publish_time"]).any():
        problems.append("forecasts contain duplicate (start_time, publish_time)")
    if (forecasts["generation"] < 0).any():
        problems.append("forecasts contain negative generation")
    if (forecasts["start_time"].dt.minute != 0).any():
        problems.append("forecasts have a start_time that is not on the hour")
    hours = expected[expected.minute == 0]
    missing_hours = hours.difference(pd.DatetimeIndex(forecasts["start_time"].unique()))
    if len(missing_hours):
        problems.append(f"forecasts missing {len(missing_hours)} hours, first {missing_hours[0]}")
    return problems


def count_after_target(forecasts: pd.DataFrame) -> int:
    """Rows published after their own target hour. Expected, never used by a D-1 cutoff."""
    return int((forecasts["publish_time"] > forecasts["start_time"]).sum())
