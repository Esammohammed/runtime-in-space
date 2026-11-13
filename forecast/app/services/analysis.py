"""Turns a prediction into the numbers the Core API acts on."""
from functools import lru_cache
from statistics import mean, pstdev

from app.core.config import get_settings
from app.schemas.forecast import ForecastIn, ForecastOut
from app.services.base import Forecaster
from app.services.linear import LinearForecaster


@lru_cache
def get_forecaster() -> Forecaster:
    if get_settings().forecast_model == "chronos":
        from app.services.chronos import ChronosForecaster
        return ChronosForecaster()
    return LinearForecaster()


def _outside(value: float, zone: tuple[float, float]) -> bool:
    return value < zone[0] or value > zone[1]


def steps_until_outside(last: float, forecast: list[float], zone: tuple[float, float]) -> int | None:
    """0 if already outside, the 1-based step where the forecast first leaves, else None."""
    if _outside(last, zone):
        return 0
    for step, value in enumerate(forecast, start=1):
        if _outside(value, zone):
            return step
    return None


def deviation_score(values: list[float]) -> float:
    """How far the latest value sits from the earlier part of the series, in standard deviations."""
    split = max(2, int(len(values) * 0.7))
    reference = values[:split]
    spread = pstdev(reference)
    if spread == 0:
        return 0.0
    return abs(values[-1] - mean(reference)) / spread


def analyse(request: ForecastIn) -> ForecastOut:
    forecaster = get_forecaster()
    prediction = forecaster.predict(request.values, request.horizon)
    slope = (prediction.forecast[-1] - prediction.forecast[0]) / max(1, request.horizon - 1)
    return ForecastOut(
        model=forecaster.name,
        forecast=[round(v, 2) for v in prediction.forecast],
        lower=[round(v, 2) for v in prediction.lower],
        upper=[round(v, 2) for v in prediction.upper],
        slope=round(slope, 4),
        deviation_score=round(deviation_score(request.values), 2),
        steps_to_yellow=steps_until_outside(request.values[-1], prediction.forecast, request.green),
        steps_to_red=steps_until_outside(request.values[-1], prediction.forecast, request.yellow),
    )
