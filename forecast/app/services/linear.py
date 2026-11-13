"""Baseline model: a straight line through the recent values.

It needs no downloads and is good enough to prove the pipeline end to end.
"""
from statistics import pstdev

from app.services.base import Prediction


class LinearForecaster:
    name = "linear"

    def predict(self, values: list[float], horizon: int) -> Prediction:
        n = len(values)
        mean_x, mean_y = (n - 1) / 2, sum(values) / n
        variance = sum((x - mean_x) ** 2 for x in range(n))
        slope = sum((x - mean_x) * (y - mean_y) for x, y in enumerate(values)) / variance
        intercept = mean_y - slope * mean_x

        residuals = [y - (intercept + slope * x) for x, y in enumerate(values)]
        band = 1.96 * pstdev(residuals)
        forecast = [intercept + slope * (n + step) for step in range(horizon)]
        return Prediction(forecast=forecast,
                          lower=[v - band for v in forecast],
                          upper=[v + band for v in forecast])
