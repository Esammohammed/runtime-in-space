"""The buttons the demo operator presses."""
import httpx
from fastapi import APIRouter, HTTPException

from app.schemas.control import HistoryIn, ScenarioIn
from app.services import history
from app.services.profiles import load_profiles
from app.services.stream import stream

router = APIRouter(tags=["control"])


@router.get("/status")
def status():
    return stream.status()


@router.post("/history/load")
def load_history(payload: HistoryIn | None = None):
    """Generate past readings and bulk-send them to the Core API. Run once."""
    try:
        return history.load_history(payload.days if payload else None)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Core API not reachable: {exc}") from exc


@router.post("/live/start")
async def start_live():
    stream.start()
    return stream.status()


@router.post("/live/stop")
async def stop_live():
    await stream.stop()
    return stream.status()


@router.post("/scenario")
async def set_scenario(payload: ScenarioIn):
    """Start a scenario for one crew member, or clear it with "none"."""
    if payload.crew_id not in load_profiles():
        raise HTTPException(status_code=404, detail="Crew member not found")
    await stream.set_scenario(payload.crew_id, payload.scenario)
    return stream.status()
