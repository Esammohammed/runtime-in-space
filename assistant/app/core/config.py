from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    content_dir: Path = REPO_ROOT / "content"

    # "mock" needs nothing. "openai_compatible" talks to any OpenAI-style
    # endpoint: a hosted API, or a local model served by Ollama.
    llm_provider: str = "mock"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 80.0

    rag_top_k: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()
