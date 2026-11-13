"""Turns a baseline into a believable reading: daily rhythm, noise, scenario offset."""
import math
import random
from datetime import datetime

BAND_LIVE = ("heart_rate", "hrv", "spo2", "skin_temp")
DAILY = ("sleep_hours", "bp_systolic", "bp_diastolic", "blood_glucose", "mood")

NOISE = {"heart_rate": 2.5, "hrv": 4.0, "spo2": 0.4, "skin_temp": 0.08,
         "sleep_hours": 0.5, "bp_systolic": 4.0, "bp_diastolic": 3.0, "blood_glucose": 5.0, "mood": 0.5}
# Swing across the day: highest mid-afternoon, lowest in the small hours.
DAY_SWING = {"heart_rate": 4.0, "skin_temp": 0.2, "hrv": -5.0}
LIMITS = {"spo2": (80, 100), "mood": (1, 5), "sleep_hours": (0, 14), "hrv": (5, 250)}
DECIMALS = {"skin_temp": 1, "sleep_hours": 1, "spo2": 0, "heart_rate": 0, "hrv": 0,
            "bp_systolic": 0, "bp_diastolic": 0, "blood_glucose": 0, "mood": 0}


def _value(indicator: str, baseline: float, when: datetime, offset: float, rng: random.Random) -> float:
    hour = when.hour + when.minute / 60
    swing = DAY_SWING.get(indicator, 0.0) * math.sin(2 * math.pi * (hour - 9) / 24)
    value = baseline + swing + offset + rng.gauss(0, NOISE[indicator])
    low, high = LIMITS.get(indicator, (-math.inf, math.inf))
    return round(min(high, max(low, value)), DECIMALS[indicator])


def band_values(baselines: dict, when: datetime, effects: dict, rng: random.Random) -> dict[str, float]:
    """What the band measures continuously."""
    return {i: _value(i, baselines[i], when, effects.get(i, 0.0), rng) for i in BAND_LIVE}


def daily_values(baselines: dict, when: datetime, effects: dict, rng: random.Random) -> dict[str, float]:
    """What is measured once a day."""
    return {i: _value(i, baselines[i], when, effects.get(i, 0.0), rng) for i in DAILY}
