"""Turns a baseline into a believable reading: daily rhythm, noise, scenario offset."""
import math
import random
from datetime import datetime

from app import hazards


def _value(indicator: str, baseline: float, when: datetime, offset: float, rng: random.Random) -> float:
    hour = when.hour + when.minute / 60
    swing = hazards.DAY_SWING.get(indicator, 0.0) * math.sin(2 * math.pi * (hour - 9) / 24)
    value = baseline + swing + offset + rng.gauss(0, hazards.NOISE[indicator])
    low, high = hazards.LIMITS.get(indicator, (-math.inf, math.inf))
    return round(min(high, max(low, value)), hazards.DECIMALS[indicator])


def continuous_values(baselines: dict, when: datetime, effects: dict, rng: random.Random) -> dict[str, float]:
    """What is measured continuously (the band, plus any other continuous sensor)."""
    return {i: _value(i, baselines[i], when, effects.get(i, 0.0), rng) for i in hazards.CONTINUOUS}


def daily_values(baselines: dict, when: datetime, effects: dict, rng: random.Random) -> dict[str, float]:
    """What is measured once a day."""
    return {i: _value(i, baselines[i], when, effects.get(i, 0.0), rng) for i in hazards.DAILY}
