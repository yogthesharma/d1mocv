"""Checks on the committed parquet snapshot in data/."""

from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from app.data.validation import count_after_target, validate

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
FIRST_DELIVERY = date(2026, 1, 2)
LAST_DELIVERY = date(2026, 2, 1)


@pytest.fixture(scope="module")
def actuals() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "actuals.parquet")


@pytest.fixture(scope="module")
def forecasts() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "forecasts.parquet")


def test_committed_data_passes_validation(actuals, forecasts):
    assert validate(actuals, forecasts, FIRST_DELIVERY, LAST_DELIVERY) == []


def test_times_are_utc(actuals, forecasts):
    assert str(actuals["start_time"].dt.tz) == "UTC"
    assert str(forecasts["start_time"].dt.tz) == "UTC"
    assert str(forecasts["publish_time"].dt.tz) == "UTC"


def test_validation_catches_a_missing_half_hour(actuals, forecasts):
    broken = actuals.drop(index=10)
    problems = validate(broken, forecasts, FIRST_DELIVERY, LAST_DELIVERY)
    assert any("missing 1 half-hours" in problem for problem in problems)


def test_validation_catches_duplicate_forecast_versions(actuals, forecasts):
    broken = pd.concat([forecasts, forecasts.iloc[[0]]], ignore_index=True)
    problems = validate(actuals, broken, FIRST_DELIVERY, LAST_DELIVERY)
    assert any("duplicate" in problem for problem in problems)


def test_rows_published_after_their_target_hour_are_allowed(actuals, forecasts):
    # A10: the snapshot contains such rows and validation must not reject them.
    assert count_after_target(forecasts) > 0
    assert validate(actuals, forecasts, FIRST_DELIVERY, LAST_DELIVERY) == []
