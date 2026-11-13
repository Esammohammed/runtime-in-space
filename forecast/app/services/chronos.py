"""Chronos: a pre-trained time-series model, used zero-shot.

Not wired in by default. To enable:
    pip install torch chronos-forecasting
    set FORECAST_MODEL=chronos

Check the calls below against the chronos-forecasting README for the version
you install. The pipeline class and its predict signature differ between the
original T5 models and the newer Bolt models.
"""
from app.core.config import get_settings
from app.services.base import Prediction


class ChronosForecaster:
    name = "chronos"

    def __init__(self) -> None:
        import torch
        from chronos import ChronosPipeline

        self._torch = torch
        self._pipeline = ChronosPipeline.from_pretrained(get_settings().chronos_model_name,
                                                         device_map="cpu")

    def predict(self, values: list[float], horizon: int) -> Prediction:
        context = self._torch.tensor(values, dtype=self._torch.float32)
        samples = self._pipeline.predict(context, prediction_length=horizon)[0]  # [samples, horizon]
        quantiles = self._torch.quantile(samples, self._torch.tensor([0.1, 0.5, 0.9]), dim=0)
        lower, median, upper = (row.tolist() for row in quantiles)
        return Prediction(forecast=median, lower=lower, upper=upper)
