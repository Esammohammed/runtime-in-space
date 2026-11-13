"""Demo scenarios: start one for a crew member and push its immediate effect.

This module used to also run a periodic live-send loop. That loop is
removed -- the demo now runs on batch history (see history.py, which can
apply a scenario to its own tail) plus this one-shot trigger.
"""
import logging
import random
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.services import generator, sender
from app.services.profiles import load_profiles
from app.services.scenarios import ScenarioBoard

log = logging.getLogger(__name__)


class ScenarioRunner:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._rng = random.Random()
        self.scenarios = ScenarioBoard(self._settings.scenario_ramp_seconds)
        self.last_error: str | None = None

    async def set_scenario(self, crew_id: int, name: str) -> None:
        """Switch a scenario, and send the once-a-day values it changes straight away."""
        now = datetime.now(timezone.utc)
        self.scenarios.set(crew_id, name, now)
        effects = self.scenarios.effects(crew_id, now, full=True)
        daily = {i: v for i, v in generator.daily_values(load_profiles()[crew_id], now, effects, self._rng).items()
                 if i in effects}
        if daily:
            await self._post([sender.reading(crew_id, now, daily)])

    async def _post(self, packets: list[dict]) -> None:
        try:
            async with httpx.AsyncClient(base_url=self._settings.core_api_url, timeout=15.0) as client:
                for packet in packets:
                    (await client.post("/readings", json=packet)).raise_for_status()
            self.last_error = None
        except httpx.HTTPError as exc:
            self.last_error = str(exc) or exc.__class__.__name__
            log.warning("Core API not reachable: %s", self.last_error)

    def status(self) -> dict:
        return {"scenarios": self.scenarios.snapshot(), "last_error": self.last_error}


runner = ScenarioRunner()
