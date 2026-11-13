"""Reads the shared content files (indicator definitions, crew)."""
import json
from functools import lru_cache

from app.core.config import get_settings


def _read(name: str) -> dict:
    path = get_settings().content_dir / name
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def load_indicators() -> dict[str, dict]:
    """Indicator definitions keyed by id, in file order."""
    return {item["id"]: item for item in _read("indicators.json")["indicators"]}


@lru_cache
def load_crew() -> list[dict]:
    return _read("crew.json")["crew"]
