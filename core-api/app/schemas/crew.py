from datetime import datetime

from app.schemas.common import UtcDateTime
from pydantic import BaseModel, ConfigDict


class CrewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    age: int | None = None
    baselines: dict = {}


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    indicator: str | None = None
    origin: str
    done: bool


class EventIn(BaseModel):
    crew_id: int
    type: str = "emergency"
    indicator: str | None = None
    message: str
    data: dict = {}


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crew_id: int
    type: str
    indicator: str | None = None
    message: str
    data: dict = {}
    timestamp: UtcDateTime


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crew_id: int
    text: str
    state: str
    created_at: UtcDateTime
