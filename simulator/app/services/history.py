"""Batch mode: a mission's worth of past readings."""
import random
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.services import generator, sender
from app.services.profiles import load_profiles


def build_history(days: int, now: datetime | None = None) -> list[dict]:
    settings = get_settings()
    rng = random.Random(settings.random_seed)
    now = (now or datetime.now(timezone.utc)).replace(minute=0, second=0, microsecond=0)
    readings = []
    for crew_id, baselines in load_profiles().items():
        for day in range(days, 0, -1):
            midnight = (now - timedelta(days=day)).replace(hour=0)
            readings.append(sender.reading(crew_id, midnight.replace(hour=7),
                                           generator.daily_values(baselines, midnight, {}, rng)))
            for hour in range(0, 24, settings.history_step_hours):
                when = midnight.replace(hour=hour)
                readings.append(sender.reading(crew_id, when,
                                               generator.band_values(baselines, when, {}, rng)))
    return readings


def load_history(days: int | None = None) -> dict:
    days = days or get_settings().history_days
    readings = build_history(days)
    return {"days": days, "packets": len(readings), "stored": sender.send_bulk(readings)}
