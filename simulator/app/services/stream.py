"""Live mode: one reading per crew member every few seconds, until stopped."""
import asyncio
import logging
import random
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.services import generator, sender
from app.services.profiles import load_profiles
from app.services.scenarios import ScenarioBoard

log = logging.getLogger(__name__)


class LiveStream:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._rng = random.Random()
        self._task: asyncio.Task | None = None
        self.scenarios = ScenarioBoard(self._settings.scenario_ramp_seconds)
        self.sent = 0
        self.last_error: str | None = None

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> None:
        if not self.running:
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self.running:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
        self._task = None

    async def set_scenario(self, crew_id: int, name: str) -> None:
        """Switch a scenario, and send the once-a-day values it changes straight away."""
        now = datetime.now(timezone.utc)
        self.scenarios.set(crew_id, name, now)
        effects = self.scenarios.effects(crew_id, now, full=True)
        daily = {i: v for i, v in generator.daily_values(load_profiles()[crew_id], now, effects, self._rng).items()
                 if i in effects}
        if daily:
            await self._post([sender.reading(crew_id, now, daily)])

    async def _loop(self) -> None:
        while True:
            now = datetime.now(timezone.utc)
            packets = [sender.reading(crew_id, now, generator.band_values(
                           baselines, now, self.scenarios.effects(crew_id, now), self._rng))
                       for crew_id, baselines in load_profiles().items()]
            await self._post(packets)
            await asyncio.sleep(self._settings.live_interval_seconds)

    async def _post(self, packets: list[dict]) -> None:
        try:
            async with httpx.AsyncClient(base_url=self._settings.core_api_url, timeout=15.0) as client:
                for packet in packets:
                    (await client.post("/readings", json=packet)).raise_for_status()
            self.sent += len(packets)
            self.last_error = None
        except httpx.HTTPError as exc:
            self.last_error = str(exc) or exc.__class__.__name__
            log.warning("Core API not reachable: %s", self.last_error)

    def status(self) -> dict:
        return {"running": self.running, "sent": self.sent, "last_error": self.last_error,
                "scenarios": self.scenarios.snapshot(),
                "interval_seconds": self._settings.live_interval_seconds}


stream = LiveStream()
