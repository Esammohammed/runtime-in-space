"""Isolation and confinement hazard: behavioral change and disrupted sleep.

Covers the NASA HRP "Behavioral changes" and "Inadequate sleep and
schedules" risks.
"""

HAZARD = "isolation"
CONTINUOUS = ("hrv",)
DAILY = ("sleep_hours", "mood")

NOISE = {"hrv": 4.0, "sleep_hours": 0.5, "mood": 0.5}
DAY_SWING = {"hrv": -5.0}
LIMITS = {"mood": (1, 5), "sleep_hours": (0, 14), "hrv": (5, 250)}
DECIMALS = {"hrv": 0, "sleep_hours": 1, "mood": 0}

# indicator -> change at full effect. ILLUSTRATIVE, not a clinical model.
SCENARIOS: dict[str, dict[str, float]] = {
    "fatigue": {"hrv": -22, "heart_rate": 9, "sleep_hours": -2.0, "mood": -1},
    # TODO(owner): fill in real deltas for the isolation scenario.
    "isolation": {},
}
