"""Gravity hazard: cardiovascular adaptation to altered gravity loads.

Covers the NASA HRP "Cardiovascular adaptations" and "Reduced fitness"
risks. The latter has no dedicated indicator yet -- it's rules-only in
the current design.
"""

HAZARD = "gravity"
CONTINUOUS = ("heart_rate",)
DAILY = ("bp_systolic", "bp_diastolic")

NOISE = {"heart_rate": 2.5, "bp_systolic": 4.0, "bp_diastolic": 3.0}
DAY_SWING = {"heart_rate": 4.0}  # highest mid-afternoon, lowest in the small hours
LIMITS: dict[str, tuple[float, float]] = {}
DECIMALS = {"heart_rate": 0, "bp_systolic": 0, "bp_diastolic": 0}

# indicator -> change at full effect. ILLUSTRATIVE, not a clinical model --
# exists so the status rules and forecast have something to react to.
SCENARIOS: dict[str, dict[str, float]] = {
    "dehydration": {"heart_rate": 18, "hrv": -15, "skin_temp": 0.4},
}
