from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

from app import hazards


def _known_scenario(name: str) -> str:
    if name != "none" and name not in hazards.ALL_SCENARIOS:
        raise ValueError(f"Unknown scenario {name!r}")
    return name


ScenarioName = Annotated[str, AfterValidator(_known_scenario)]


class ScenarioIn(BaseModel):
    crew_id: int
    scenario: ScenarioName


class HistoryIn(BaseModel):
    days: int | None = Field(default=None, ge=1, le=400)
    scenario: ScenarioName | None = None
    crew_id: int | None = None
    scenario_points: int = Field(default=30, ge=1, le=1000)
