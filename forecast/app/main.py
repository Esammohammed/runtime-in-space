"""Forecast service: early warning for one indicator series. Stateless."""
from fastapi import FastAPI

from app.core.config import get_settings
from app.routers import forecast

app = FastAPI(title="Runtime in Space - Forecast service")
app.include_router(forecast.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "forecast", "model": get_settings().forecast_model}
