"""Load the committed parquet snapshot once, at startup."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

ACTUALS_FILE = "actuals.parquet"
FORECASTS_FILE = "forecasts.parquet"


class DataFilesMissingError(RuntimeError):
    pass


@dataclass(frozen=True)
class WindData:
    actuals: pd.DataFrame  # start_time, generation (MW), half-hourly
    forecasts: pd.DataFrame  # start_time, publish_time, generation (MW), hourly targets


def load_data(data_dir: Path) -> WindData:
    paths = [data_dir / ACTUALS_FILE, data_dir / FORECASTS_FILE]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise DataFilesMissingError(
            f"Missing data file(s): {', '.join(missing)}. "
            "Run `uv run --project backend python scripts/fetch_data.py` from the repo root."
        )
    return WindData(actuals=pd.read_parquet(paths[0]), forecasts=pd.read_parquet(paths[1]))
