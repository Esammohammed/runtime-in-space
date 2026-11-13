"""HTTP client for the Assistant service."""
import httpx

from app.core.config import get_settings


class AssistantUnavailable(Exception):
    pass


def post(path: str, payload: dict) -> dict:
    settings = get_settings()
    try:
        response = httpx.post(f"{settings.assistant_url}{path}", json=payload,
                              timeout=settings.http_timeout_seconds)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        raise AssistantUnavailable(str(exc)) from exc
