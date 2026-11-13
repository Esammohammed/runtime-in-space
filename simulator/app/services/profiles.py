"""Crew baselines, read from the shared content file so they match the Core API."""
import json
from functools import lru_cache

from app.core.config import get_settings


@lru_cache
def load_profiles() -> dict[int, dict[str, float]]:
    path = get_settings().content_dir / "crew.json"
    crew = json.loads(path.read_text(encoding="utf-8"))["crew"]
    return {member["id"]: member["baselines"] for member in crew}
