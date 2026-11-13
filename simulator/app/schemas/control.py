from typing import Literal

from pydantic import BaseModel, Field

ScenarioName = Literal["none", "dehydration", "infection", "fatigue"]


class ScenarioIn(BaseModel):
    crew_id: int
    scenario: ScenarioName


class HistoryIn(BaseModel):
    days: int | None = Field(default=None, ge=1, le=400)
