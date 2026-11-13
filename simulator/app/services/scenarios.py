"""Tracks which scenario is active for which crew member, and since when.

Effect deltas themselves live in `app/hazards/*.py`, one registry per
hazard, merged into `hazards.ALL_SCENARIOS` -- this module only tracks
state and the ramp-up over time.
"""
from datetime import datetime

from app import hazards


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
        return {indicator: delta * progress for indicator, delta in hazards.ALL_SCENARIOS.get(name, {}).items()}

    def snapshot(self) -> dict[int, str]:
        return {crew_id: name for crew_id, (name, _) in self._active.items()}
