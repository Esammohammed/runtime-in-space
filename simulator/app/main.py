"""Simulator service: stands in for the wearable band. History, live stream, scenarios."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import control
from app.services.stream import stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await stream.stop()


app = FastAPI(title="Runtime in Space - Simulator service", lifespan=lifespan)
app.include_router(control.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "simulator"}
