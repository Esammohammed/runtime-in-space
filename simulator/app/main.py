"""Simulator service: stands in for the wearable band. History and demo scenarios."""
from fastapi import FastAPI

from app.routers import control

app = FastAPI(title="Runtime in Space - Simulator service")
app.include_router(control.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "simulator"}
