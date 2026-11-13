"""HTTP client for the Forecast service. Never raises: a missing forecast is None."""
import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger(__name__)


def forecast(indicator: str, values: list[float], horizon: int,
             green: list[float], yellow: list[float]) -> dict | None:
    settings = get_settings()
    payload = {"indicator": indicator, "values": values, "horizon": horizon,
               "green": green, "yellow": yellow}
    try:
        response = httpx.post(f"{settings.forecast_url}/forecast", json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        log.warning("Forecast service unavailable: %s", exc)
        return None
