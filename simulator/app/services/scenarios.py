"""Demo scenarios: how each one pushes the indicators away from baseline.

These numbers are ILLUSTRATIVE. They exist so the demo has something for the
status rules and the forecast to react to. They are not clinical models.
"""
from datetime import datetime

# indicator -> change at full effect
EFFECTS: dict[str, dict[str, float]] = {
    "none": {},
    "dehydration": {"heart_rate": 18, "hrv": -15, "skin_temp": 0.4},
    "infection": {"skin_temp": 1.6, "heart_rate": 15, "hrv": -20, "spo2": -1.5},
    "fatigue": {"hrv": -22, "heart_rate": 9, "sleep_hours": -2.0, "mood": -1},
}


class ScenarioBoard:
    """Which scenario is active for which crew member, and since when."""

    def __init__(self, ramp_seconds: float) -> None:
        self._ramp = ramp_seconds
        self._active: dict[int, tuple[str, datetime]] = {}

    def set(self, crew_id: int, name: str, now: datetime) -> None:
        if name == "none":
            self._active.pop(crew_id, None)
        else:
            self._active[crew_id] = (name, now)

    def effects(self, crew_id: int, now: datetime, full: bool = False) -> dict[str, float]:
        """Current offsets for one crew member. They grow from 0 to full over the ramp."""
        if crew_id not in self._active:
            return {}
        name, started = self._active[crew_id]
        progress = 1.0 if full else min(1.0, (now - started).total_seconds() / self._ramp)
        return {indicator: delta * progress for indicator, delta in EFFECTS[name].items()}

    def snapshot(self) -> dict[int, str]:
        return {crew_id: name for crew_id, (name, _) in self._active.items()}
