from datetime import datetime

from app.schemas.common import UtcDateTime
from pydantic import BaseModel

from app.schemas.crew import CrewOut, EventOut, TaskOut


class IndicatorState(BaseModel):
    id: str
    name: str
    unit: str
    body_area: str
    source: str
    hazard: str
    nasa_risk: str
    value: float | None = None
    timestamp: UtcDateTime | None = None
    status: str | None = None
    reason: str = ""
    trend: list[float] = []


class DashboardOut(BaseModel):
    crew: CrewOut
    indicators: list[IndicatorState]
    body_areas: dict[str, str]
    warnings: list[EventOut]
    tasks: list[TaskOut]
    streak: int
