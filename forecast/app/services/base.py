"""The one interface every forecasting model implements."""
from dataclasses import dataclass
from typing import Protocol


@dataclass
class Prediction:
    forecast: list[float]
    lower: list[float]
    upper: list[float]


class Forecaster(Protocol):
    name: str

    def predict(self, values: list[float], horizon: int) -> Prediction: ...
