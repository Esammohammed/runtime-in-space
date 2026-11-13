"""Batch mode: a mission's worth of past readings."""
import random
from datetime import datetime, timedelta, timezone

from app import hazards
from app.core.config import get_settings
from app.services import generator, sender
from app.services.profiles import load_profiles


def build_history(days: int, now: datetime | None = None, scenario: str | None = None,
                   crew_id: int | None = None, scenario_points: int = 30) -> list[dict]:
    """Generate `days` worth of history. When `scenario` is given, its full
    effect is applied to only the last `scenario_points` continuous readings
    (and the most recent daily reading) of the targeted crew member, or of
    every crew member when `crew_id` is omitted -- so loaded history can
    already look "sick" with no live stream running.
    """
    settings = get_settings()
    rng = random.Random(settings.random_seed)
    now = (now or datetime.now(timezone.utc)).replace(minute=0, second=0, microsecond=0)
    full_effect = hazards.ALL_SCENARIOS.get(scenario, {}) if scenario else {}
    steps_per_day = max(1, 24 // settings.history_step_hours)
    total_continuous = days * steps_per_day

    readings = []
    for member_id, baselines in load_profiles().items():
        apply_scenario = scenario is not None and (crew_id is None or crew_id == member_id)
        continuous_index = 0
        for day in range(days, 0, -1):
            midnight = (now - timedelta(days=day)).replace(hour=0)
            daily_effects = full_effect if apply_scenario and day == 1 else {}
            readings.append(sender.reading(member_id, midnight.replace(hour=7),
                                           generator.daily_values(baselines, midnight, daily_effects, rng)))
            for hour in range(0, 24, settings.history_step_hours):
                when = midnight.replace(hour=hour)
                continuous_index += 1
                remaining = total_continuous - continuous_index
                effects = full_effect if apply_scenario and remaining < scenario_points else {}
                readings.append(sender.reading(member_id, when,
                                               generator.continuous_values(baselines, when, effects, rng)))
    return readings


def load_history(days: int | None = None, scenario: str | None = None,
                  crew_id: int | None = None, scenario_points: int = 30) -> dict:
    days = days or get_settings().history_days
    readings = build_history(days, scenario=scenario, crew_id=crew_id, scenario_points=scenario_points)
    return {"days": days, "packets": len(readings), "stored": sender.send_bulk(readings)}
