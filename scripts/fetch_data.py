"""Fetch wind actuals (FUELHH) and all wind forecast versions (WINDFOR) from Elexon.

Writes two parquet files into data/. Run from the repo root:

    uv run --project backend python scripts/fetch_data.py

The deployed app only reads these files, it never calls Elexon.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx
import pandas as pd

# Make the backend package importable when run as a plain script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.data.validation import validate  # noqa: E402

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Decision dates 1 to 31 Jan 2026 mean delivery days 2 Jan to 1 Feb 2026 (ASSUMPTIONS.md A2).
DEFAULT_FIRST_DELIVERY = date(2026, 1, 2)
DEFAULT_LAST_DELIVERY = date(2026, 2, 1)

# WINDFOR covers about 72 hours ahead, so forecasts for the first delivery day
# can be published up to this many days earlier.
FORECAST_LOOKBACK_DAYS = 4
CHUNK_DAYS = 5
MAX_ATTEMPTS = 5

log = logging.getLogger("fetch_data")


def get_json(client: httpx.Client, path: str, params: dict[str, str]) -> list[dict]:
    """GET with retries and exponential backoff."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = client.get(f"{BASE_URL}{path}", params=params)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            if attempt == MAX_ATTEMPTS:
                raise
            wait = 2**attempt
            log.warning("attempt %d failed (%s), retrying in %ds", attempt, error, wait)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def chunks(first: date, last: date, size: int):
    """Yield inclusive (from, to) date windows of at most `size` days."""
    start = first
    while start <= last:
        end = min(start + timedelta(days=size - 1), last)
        yield start, end
        start = end + timedelta(days=1)


def utc_midnight(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=timezone.utc)


def iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_actuals(client: httpx.Client, first: date, last: date) -> pd.DataFrame:
    rows: list[dict] = []
    for start, end in chunks(first, last, CHUNK_DAYS):
        log.info("FUELHH WIND settlement dates %s to %s", start, end)
        rows += get_json(
            client,
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": start.isoformat(),
                "settlementDateTo": end.isoformat(),
                "fuelType": "WIND",
            },
        )
    frame = pd.DataFrame(rows)
    frame = frame[frame["fuelType"] == "WIND"]
    frame = frame.rename(columns={"startTime": "start_time"})
    frame["start_time"] = pd.to_datetime(frame["start_time"], utc=True)
    frame["generation"] = frame["generation"].astype("float64")
    frame = frame[["start_time", "generation"]]
    return frame.drop_duplicates("start_time").sort_values("start_time").reset_index(drop=True)


def fetch_forecasts(client: httpx.Client, first: date, last: date) -> pd.DataFrame:
    """All published versions whose target hour falls inside the delivery range."""
    publish_first = first - timedelta(days=FORECAST_LOOKBACK_DAYS)
    rows: list[dict] = []
    for start, end in chunks(publish_first, last, CHUNK_DAYS):
        log.info("WINDFOR publish dates %s to %s", start, end)
        rows += get_json(
            client,
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": iso(utc_midnight(start)),
                "publishDateTimeTo": iso(utc_midnight(end + timedelta(days=1))),
            },
        )
    frame = pd.DataFrame(rows)
    frame = frame.rename(columns={"startTime": "start_time", "publishTime": "publish_time"})
    frame["start_time"] = pd.to_datetime(frame["start_time"], utc=True)
    frame["publish_time"] = pd.to_datetime(frame["publish_time"], utc=True)
    frame["generation"] = frame["generation"].astype("float64")
    frame = frame[["start_time", "publish_time", "generation"]]
    in_range = (frame["start_time"] >= utc_midnight(first)) & (
        frame["start_time"] < utc_midnight(last + timedelta(days=1))
    )
    frame = frame[in_range]
    frame = frame.drop_duplicates(["start_time", "publish_time"])
    return frame.sort_values(["start_time", "publish_time"]).reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first", type=date.fromisoformat, default=DEFAULT_FIRST_DELIVERY)
    parser.add_argument("--last", type=date.fromisoformat, default=DEFAULT_LAST_DELIVERY)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    DATA_DIR.mkdir(exist_ok=True)

    with httpx.Client(timeout=60) as client:
        actuals = fetch_actuals(client, args.first, args.last)
        forecasts = fetch_forecasts(client, args.first, args.last)

    problems = validate(actuals, forecasts, args.first, args.last)
    for problem in problems:
        log.warning("validation: %s", problem)

    actuals.to_parquet(DATA_DIR / "actuals.parquet", index=False)
    forecasts.to_parquet(DATA_DIR / "forecasts.parquet", index=False)
    log.info("wrote %d actual rows and %d forecast rows", len(actuals), len(forecasts))
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
