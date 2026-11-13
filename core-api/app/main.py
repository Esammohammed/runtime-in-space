"""Core API: stores readings, judges status, builds tasks, logs events, keeps reports."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.seed import init_db
from app.routers import assistant, content, crew, events, readings, reports, tasks

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_methods=["*"], allow_headers=["*"])

for module in (crew, readings, tasks, events, assistant, reports, content):
    app.include_router(module.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "core-api"}
