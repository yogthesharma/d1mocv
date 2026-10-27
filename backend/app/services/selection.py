"""Pick the forecast that was available at the D-1 decision cutoff."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

import pandas as pd

SLOT = pd.Timedelta(minutes=30)
SLOTS_PER_DAY = 48


@dataclass(frozen=True)
class DecisionResult:
    """One delivery day, one row per half-hour slot.

    Columns: start_time, forecast, publish_time, horizon_hours, actual, error.
    Slots with no forecast published at or before the cutoff have NaN forecast
    fields and are counted in `dropped_slots`.
    """

    delivery_day: date
    cutoff: datetime
    table: pd.DataFrame
    dropped_slots: int


def decision_cutoff(delivery_day: date, cutoff_time: time) -> datetime:
    """The moment the buying decision closes: `cutoff_time` UTC on the day before delivery."""
    decision_day = delivery_day - timedelta(days=1)
    return datetime.combine(decision_day, cutoff_time, tzinfo=UTC)


def select_latest_forecasts(forecasts: pd.DataFrame, cutoff: datetime) -> pd.DataFrame:
    """Per target hour, the forecast with the latest publish_time <= cutoff.

    A forecast published exactly at the cutoff is included. Anything published
    later is future information and is never used.
    """
    available = forecasts[forecasts["publish_time"] <= pd.Timestamp(cutoff)]
    ordered = available.sort_values(["start_time", "publish_time"])
    return ordered.groupby("start_time", as_index=False).tail(1).reset_index(drop=True)


def build_decision(
    forecasts: pd.DataFrame,
    actuals: pd.DataFrame,
    delivery_day: date,
    cutoff_time: time,
) -> DecisionResult:
    """Forecast available at the cutoff versus actual, for the 48 half-hours of one day.

    WINDFOR is hourly and FUELHH is half-hourly, so an hourly forecast applies to both
    half-hours of that hour (ASSUMPTIONS.md A5).
    error = forecast - actual, positive means the forecast was too high (A4).
    """
    cutoff = decision_cutoff(delivery_day, cutoff_time)
    first = pd.Timestamp(datetime.combine(delivery_day, time(0), tzinfo=UTC))
    slots = pd.DataFrame({"start_time": pd.date_range(first, periods=SLOTS_PER_DAY, freq=SLOT)})
    slots["hour"] = slots["start_time"].dt.floor("h")

    selected = select_latest_forecasts(forecasts, cutoff)
    selected = selected.rename(columns={"start_time": "hour", "generation": "forecast"})
    table = slots.merge(selected, on="hour", how="left")
    table = table.merge(
        actuals.rename(columns={"generation": "actual"}), on="start_time", how="left"
    )
    table["horizon_hours"] = (table["start_time"] - table["publish_time"]).dt.total_seconds() / 3600
    table["error"] = table["forecast"] - table["actual"]
    table = table[["start_time", "forecast", "publish_time", "horizon_hours", "actual", "error"]]
    return DecisionResult(
        delivery_day=delivery_day,
        cutoff=cutoff,
        table=table,
        dropped_slots=int(table["forecast"].isna().sum()),
    )
