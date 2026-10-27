from datetime import UTC, datetime

import pandas as pd
import pytest


def ts(day: int, hour: int, minute: int = 0) -> pd.Timestamp:
    """January 2026 UTC timestamp."""
    return pd.Timestamp(datetime(2026, 1, day, hour, minute, tzinfo=UTC))


@pytest.fixture
def make_forecasts():
    def build(rows: list[tuple[pd.Timestamp, pd.Timestamp, float]]) -> pd.DataFrame:
        return pd.DataFrame(rows, columns=["start_time", "publish_time", "generation"])

    return build


@pytest.fixture
def make_actuals():
    def build(rows: list[tuple[pd.Timestamp, float]]) -> pd.DataFrame:
        return pd.DataFrame(rows, columns=["start_time", "generation"])

    return build
