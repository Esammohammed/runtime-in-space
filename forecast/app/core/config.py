from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    forecast_model: str = "linear"  # linear | chronos
    chronos_model_name: str = "amazon/chronos-t5-small"


@lru_cache
def get_settings() -> Settings:
    return Settings()
