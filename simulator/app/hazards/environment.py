"""Environment hazard: cabin atmosphere, altered immune response, nutrition.

Covers the NASA HRP "Altered immune / microbes", "Hypoxia, high CO2" and
"Inadequate food and nutrition" risks.
"""

HAZARD = "environment"
CONTINUOUS = ("skin_temp", "spo2", "cabin_co2")
DAILY = ("blood_glucose",)

NOISE = {"skin_temp": 0.08, "spo2": 0.4, "cabin_co2": 0.1, "blood_glucose": 5.0}
DAY_SWING = {"skin_temp": 0.2}
LIMITS = {"spo2": (80, 100), "cabin_co2": (0, 15)}
DECIMALS = {"skin_temp": 1, "spo2": 0, "cabin_co2": 2, "blood_glucose": 0}

# indicator -> change at full effect. ILLUSTRATIVE, not a clinical model.
SCENARIOS: dict[str, dict[str, float]] = {
    "infection": {"skin_temp": 1.6, "heart_rate": 15, "hrv": -20, "spo2": -1.5},
    # TODO(owner): fill in real deltas for the co2_buildup scenario.
    "co2_buildup": {},
}
