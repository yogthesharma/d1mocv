"""Response models. All times are UTC, all generation values are MW."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class MetaResponse(BaseModel):
    first_decision_date: date
    last_decision_date: date
    default_cutoff_hour: int
    timezone: str = "UTC"
    unit: str = "MW"
    error_definition: str = (
        "error = forecast - actual. Positive: forecast too high, the buyer is short. "
        "Negative: forecast too low, the buyer overbought."
    )


class MetricsOut(BaseModel):
    n: int = Field(description="Half-hour slots included")
    mae: float | None = Field(description="Mean absolute error, MW")
    rmse: float | None = Field(description="Root mean squared error, MW")
    bias: float | None = Field(description="Mean of forecast - actual, MW")
    p90_abs: float | None = Field(description="90th percentile of absolute error, MW")
    p95_abs: float | None = Field(description="95th percentile of absolute error, MW")


class SlotOut(BaseModel):
    start_time: datetime
    forecast_mw: float | None
    publish_time: datetime | None
    horizon_hours: float | None
    actual_mw: float | None
    error_mw: float | None


class ForecastAtDecisionResponse(BaseModel):
    decision_date: date
    delivery_date: date
    cutoff: datetime
    cutoff_hour: int
    dropped_slots: int = Field(description="Slots with no forecast published by the cutoff")
    metrics: MetricsOut
    slots: list[SlotOut]


class HorizonBucketOut(BaseModel):
    from_hours: int
    to_hours: int
    metrics: MetricsOut


class HourBucketOut(BaseModel):
    hour: int = Field(description="UTC hour of the delivery slot")
    metrics: MetricsOut


class AccuracyResponse(BaseModel):
    start: date
    end: date
    cutoff_hour: int
    days: int
    dropped_slots: int
    overall: MetricsOut
    by_horizon: list[HorizonBucketOut]
    by_hour: list[HourBucketOut]
