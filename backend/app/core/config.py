"""Application settings, read from environment variables or a .env file."""

from __future__ import annotations

from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    default_cutoff_hour: int = 9
    data_dir: Path = REPO_ROOT / "data"
    # Comma separated in the environment, for example "http://localhost:5173,https://x.app".
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # Decision dates are 1 to 31 January 2026 (ASSUMPTIONS.md A2).
    first_decision_date: date = date(2026, 1, 1)
    last_decision_date: date = date(2026, 1, 31)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("default_cutoff_hour")
    @classmethod
    def hour_in_range(cls, value: int) -> int:
        if not 0 <= value <= 23:
            raise ValueError("default_cutoff_hour must be between 0 and 23")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
