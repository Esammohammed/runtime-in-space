"""The buttons the demo operator presses."""
import httpx
from fastapi import APIRouter, HTTPException

from app.schemas.control import HistoryIn, ScenarioIn
from app.services import history
from app.services.profiles import load_profiles
from app.services.scenario_runner import runner

router = APIRouter(tags=["control"])


@router.get("/status")
def status():
    return runner.status()


@router.post("/history/load")
def load_history(payload: HistoryIn | None = None):
    """Generate past readings and bulk-send them to the Core API. Run once."""
    try:
        if payload is None:
            return history.load_history()
        return history.load_history(payload.days, payload.scenario, payload.crew_id, payload.scenario_points)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Core API not reachable: {exc}") from exc


@router.post("/scenario")
async def set_scenario(payload: ScenarioIn):
    """Start a scenario for one crew member, or clear it with "none"."""
    if payload.crew_id not in load_profiles():
        raise HTTPException(status_code=404, detail="Crew member not found")
    await runner.set_scenario(payload.crew_id, payload.scenario)
    return runner.status()
