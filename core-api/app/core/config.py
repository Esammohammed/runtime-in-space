"""Settings, read from environment variables (or a local .env file)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Runtime in Space - Core API"
    database_url: str = "sqlite:///./core.db"
    content_dir: Path = REPO_ROOT / "content"

    forecast_url: str = "http://localhost:8002"
    assistant_url: str = "http://localhost:8003"
    http_timeout_seconds: float = 90.0

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Early warning: every N readings of a band indicator, forecast from the
    # latest `forecast_window` values and look `forecast_horizon` readings ahead.
    early_warning_every: int = 10
    forecast_window: int = 40
    forecast_horizon: int = 90
    forecast_max_age_minutes: int = 30   # keeps sparse history out of a live forecast
    early_warning_cooldown_minutes: int = 10
    early_warning_min_deviation: float = 2.0   # ignore drifts that are within normal noise


@lru_cache
def get_settings() -> Settings:
    return Settings()
