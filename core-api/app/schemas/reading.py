from datetime import datetime
from typing import Literal

from app.schemas.common import UtcDateTime
from pydantic import BaseModel, Field

Status = Literal["green", "yellow", "red"]


class ReadingIn(BaseModel):
    """The shared reading shape. See contracts/README.md."""

    crew_id: int
    timestamp: datetime | None = None
    source: str = "simulator"
    values: dict[str, float] = Field(default_factory=dict)


class BulkReadingsIn(BaseModel):
    readings: list[ReadingIn]


class AssessmentOut(BaseModel):
    indicator: str
    value: float
    status: Status
    reason: str


class IngestOut(BaseModel):
    stored: int
    assessments: list[AssessmentOut] = []


class ReadingPoint(BaseModel):
    timestamp: UtcDateTime
    value: float
    source: str
