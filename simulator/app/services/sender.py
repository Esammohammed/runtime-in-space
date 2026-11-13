"""Delivery to the Core API."""
import httpx

from app.core.config import get_settings


def iso(when) -> str:
    return when.strftime("%Y-%m-%dT%H:%M:%SZ")


def reading(crew_id: int, when, values: dict) -> dict:
    """The shared reading shape. See contracts/README.md."""
    return {"crew_id": crew_id, "timestamp": iso(when), "source": "simulator", "values": values}


def send_bulk(readings: list[dict]) -> int:
    settings = get_settings()
    stored = 0
    with httpx.Client(base_url=settings.core_api_url, timeout=60.0) as client:
        for start in range(0, len(readings), settings.bulk_chunk_size):
            chunk = readings[start:start + settings.bulk_chunk_size]
            response = client.post("/readings/bulk", json={"readings": chunk})
            response.raise_for_status()
            stored += response.json()["stored"]
    return stored
