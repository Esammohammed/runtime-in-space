from pydantic import BaseModel, Field


class ForecastIn(BaseModel):
    indicator: str
    values: list[float] = Field(min_length=3)
    horizon: int = Field(default=24, ge=1, le=500)
    green: tuple[float, float]
    yellow: tuple[float, float]


class ForecastOut(BaseModel):
    model: str
    forecast: list[float]
    lower: list[float]
    upper: list[float]
    slope: float
    deviation_score: float
    steps_to_yellow: int | None
    steps_to_red: int | None
