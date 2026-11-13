"""Radiation hazard: cumulative dose from solar particle events and galactic
cosmic rays. Covers the NASA HRP "Radiation-induced cancer" risk.
"""

HAZARD = "radiation"
CONTINUOUS = ("radiation_dose",)
DAILY: tuple[str, ...] = ()

NOISE = {"radiation_dose": 0.05}
DAY_SWING: dict[str, float] = {}
LIMITS = {"radiation_dose": (0, 20)}
DECIMALS = {"radiation_dose": 2}

# indicator -> change at full effect. ILLUSTRATIVE, not a clinical model.
SCENARIOS: dict[str, dict[str, float]] = {
    # TODO(owner): fill in real deltas for the solar_event scenario.
    "solar_event": {},
}
