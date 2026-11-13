from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    content_dir: Path = REPO_ROOT / "content"
    core_api_url: str = "http://localhost:8000"

    live_interval_seconds: float = 2.0
    scenario_ramp_seconds: float = 120.0   # how long a scenario takes to reach full effect
    history_days: int = 180
    history_step_hours: int = 3
    bulk_chunk_size: int = 500
    random_seed: int = 42


@lru_cache
def get_settings() -> Settings:
    return Settings()
