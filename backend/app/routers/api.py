"""HTTP layer only: parse and validate parameters, call services, shape the response."""

from __future__ import annotations

from datetime import date, time, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.core.config import Settings, get_settings
from app.core.errors import InvalidRequestError, NotFoundError
from app.data.loader import WindData
from app.schemas.models import (
    AccuracyResponse,
    ForecastAtDecisionResponse,
    HealthResponse,
    HorizonBucketOut,
    HourBucketOut,
    MetaResponse,
    MetricsOut,
    SlotOut,
)
from app.services import metrics
from app.services.selection import build_decision

router = APIRouter(prefix="/api")

CutoffHour = Annotated[
    int | None,
    Query(ge=0, le=23, description="Cutoff hour (UTC) on the day before delivery"),
]


def get_data(request: Request) -> WindData:
    return request.app.state.data


Data = Annotated[WindData, Depends(get_data)]
Config = Annotated[Settings, Depends(get_settings)]


def _check_decision_date(day: date, settings: Settings) -> None:
    if not settings.first_decision_date <= day <= settings.last_decision_date:
        raise NotFoundError(
            f"Decision date {day} is outside the available range "
            f"{settings.first_decision_date} to {settings.last_decision_date}"
        )


def _metrics_out(value: metrics.ErrorMetrics) -> MetricsOut:
    return MetricsOut(**value.__dict__)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get("/meta", response_model=MetaResponse)
def meta(settings: Config) -> MetaResponse:
    return MetaResponse(
        first_decision_date=settings.first_decision_date,
        last_decision_date=settings.last_decision_date,
        default_cutoff_hour=settings.default_cutoff_hour,
    )


@router.get("/forecast-at-decision", response_model=ForecastAtDecisionResponse)
def forecast_at_decision(
    data: Data,
    settings: Config,
    decision_date: Annotated[date, Query(description="Day the buying decision is made (D-1)")],
    cutoff_hour: CutoffHour = None,
) -> ForecastAtDecisionResponse:
    _check_decision_date(decision_date, settings)
    hour = settings.default_cutoff_hour if cutoff_hour is None else cutoff_hour
    result = build_decision(
        data.forecasts, data.actuals, decision_date + timedelta(days=1), time(hour)
    )
    table = result.table.astype(object).where(result.table.notna(), None)
    return ForecastAtDecisionResponse(
        decision_date=decision_date,
        delivery_date=result.delivery_day,
        cutoff=result.cutoff,
        cutoff_hour=hour,
        dropped_slots=result.dropped_slots,
        metrics=_metrics_out(metrics.error_metrics(result.table["error"])),
        slots=[
            SlotOut(
                start_time=row["start_time"],
                forecast_mw=row["forecast"],
                publish_time=row["publish_time"],
                horizon_hours=row["horizon_hours"],
                actual_mw=row["actual"],
                error_mw=row["error"],
            )
            for row in table.to_dict("records")
        ],
    )


@router.get("/accuracy", response_model=AccuracyResponse)
def accuracy(
    data: Data,
    settings: Config,
    start: Annotated[date | None, Query(description="First decision date")] = None,
    end: Annotated[date | None, Query(description="Last decision date")] = None,
    cutoff_hour: CutoffHour = None,
) -> AccuracyResponse:
    start = start or settings.first_decision_date
    end = end or settings.last_decision_date
    if start > end:
        raise InvalidRequestError("start must not be after end")
    _check_decision_date(start, settings)
    _check_decision_date(end, settings)
    hour = settings.default_cutoff_hour if cutoff_hour is None else cutoff_hour

    result = metrics.accuracy(data.forecasts, data.actuals, start, end, time(hour))
    return AccuracyResponse(
        start=start,
        end=end,
        cutoff_hour=hour,
        days=result.days,
        dropped_slots=result.dropped_slots,
        overall=_metrics_out(result.overall),
        by_horizon=[
            HorizonBucketOut(
                from_hours=b.from_hours, to_hours=b.to_hours, metrics=_metrics_out(b.metrics)
            )
            for b in result.by_horizon
        ],
        by_hour=[
            HourBucketOut(hour=b.hour, metrics=_metrics_out(b.metrics)) for b in result.by_hour
        ],
    )
