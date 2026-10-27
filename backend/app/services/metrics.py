"""Forecast error metrics. error = forecast - actual, in MW (ASSUMPTIONS.md A4)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

import pandas as pd

from app.services.selection import build_decision

HORIZON_BUCKET_HOURS = 6
SLOT = pd.Timedelta(minutes=30)


@dataclass(frozen=True)
class ErrorMetrics:
    """None for every metric when there are no evaluable slots (n == 0).

    p90_abs and p95_abs are percentiles of the absolute error with linear interpolation.
    """

    n: int
    mae: float | None
    rmse: float | None
    bias: float | None
    p90_abs: float | None
    p95_abs: float | None


def error_metrics(errors: pd.Series) -> ErrorMetrics:
    errors = errors.dropna()
    if errors.empty:
        return ErrorMetrics(0, None, None, None, None, None)
    absolute = errors.abs()
    return ErrorMetrics(
        n=len(errors),
        mae=float(absolute.mean()),
        rmse=float((errors**2).mean() ** 0.5),
        bias=float(errors.mean()),
        p90_abs=float(absolute.quantile(0.90)),
        p95_abs=float(absolute.quantile(0.95)),
    )


@dataclass(frozen=True)
class HorizonBucket:
    from_hours: int
    to_hours: int
    metrics: ErrorMetrics


@dataclass(frozen=True)
class HourBucket:
    hour: int
    metrics: ErrorMetrics


@dataclass(frozen=True)
class AccuracyResult:
    days: int
    dropped_slots: int
    overall: ErrorMetrics
    by_horizon: list[HorizonBucket]
    by_hour: list[HourBucket]


def decision_slots(
    forecasts: pd.DataFrame,
    actuals: pd.DataFrame,
    first_decision: date,
    last_decision: date,
    cutoff_time: time,
) -> tuple[pd.DataFrame, int]:
    """Decision-time slots for every delivery day in the range, plus the dropped slot count."""
    tables = []
    dropped = 0
    day = first_decision + timedelta(days=1)
    while day <= last_decision + timedelta(days=1):
        result = build_decision(forecasts, actuals, day, cutoff_time)
        tables.append(result.table)
        dropped += result.dropped_slots
        day += timedelta(days=1)
    return pd.concat(tables, ignore_index=True), dropped


def error_by_hour_of_day(slots: pd.DataFrame) -> list[HourBucket]:
    """Decision-time error grouped by the UTC hour of the delivery slot."""
    hours = slots["start_time"].dt.hour
    return [
        HourBucket(int(hour), error_metrics(group["error"])) for hour, group in slots.groupby(hours)
    ]


def error_by_horizon(
    forecasts: pd.DataFrame,
    actuals: pd.DataFrame,
    first_delivery: date,
    last_delivery: date,
) -> list[HorizonBucket]:
    """Error of every published forecast version, grouped by how far ahead it was made.

    Independent of the cutoff: it shows how forecasts improve as the target gets closer.
    Hourly forecasts apply to both half-hours (A5). Versions published after their target
    slot started (negative horizon) are excluded (A10).
    """
    halves = pd.concat([forecasts, forecasts.assign(start_time=forecasts["start_time"] + SLOT)])
    joined = halves.merge(
        actuals.rename(columns={"generation": "actual"}), on="start_time", how="inner"
    )
    first = pd.Timestamp(datetime.combine(first_delivery, time(0), tzinfo=UTC))
    end = pd.Timestamp(datetime.combine(last_delivery + timedelta(days=1), time(0), tzinfo=UTC))
    joined = joined[(joined["start_time"] >= first) & (joined["start_time"] < end)]
    joined = joined.assign(
        horizon_hours=(joined["start_time"] - joined["publish_time"]).dt.total_seconds() / 3600,
        error=joined["generation"] - joined["actual"],
    )
    joined = joined[joined["horizon_hours"] >= 0]
    bucket = (joined["horizon_hours"] // HORIZON_BUCKET_HOURS).astype(int) * HORIZON_BUCKET_HOURS
    return [
        HorizonBucket(int(start), int(start) + HORIZON_BUCKET_HOURS, error_metrics(group["error"]))
        for start, group in joined.groupby(bucket)
    ]


def accuracy(
    forecasts: pd.DataFrame,
    actuals: pd.DataFrame,
    first_decision: date,
    last_decision: date,
    cutoff_time: time,
) -> AccuracyResult:
    slots, dropped = decision_slots(forecasts, actuals, first_decision, last_decision, cutoff_time)
    first_delivery = first_decision + timedelta(days=1)
    last_delivery = last_decision + timedelta(days=1)
    return AccuracyResult(
        days=(last_decision - first_decision).days + 1,
        dropped_slots=dropped,
        overall=error_metrics(slots["error"]),
        by_horizon=error_by_horizon(forecasts, actuals, first_delivery, last_delivery),
        by_hour=error_by_hour_of_day(slots),
    )
