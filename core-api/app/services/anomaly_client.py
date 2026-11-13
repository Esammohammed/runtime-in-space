"""HTTP client for the Anomaly service. Never raises: a missing result is None.

The Anomaly service itself is a teammate's deliverable and isn't part of
this repo -- see contracts/README.md's "Core API to Anomaly" section.
"""
import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger(__name__)


def analyze(crew_id: int, window: dict[str, list[float]]) -> dict | None:
    settings = get_settings()
    payload = {"crew_id": crew_id, "window": window}
    try:
        response = httpx.post(f"{settings.anomaly_url}/analyze", json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        log.warning("Anomaly service unavailable: %s", exc)
        return None
