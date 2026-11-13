from pydantic import BaseModel


class AnomalyResult(BaseModel):
    indicator: str
    is_anomaly: bool
    score: float


class AnalyzeOut(BaseModel):
    model: str | None = None
    results: list[AnomalyResult] = []
