"""Assistant service: chat with sources, photo analysis, reports for Earth. Stateless."""
from fastapi import FastAPI

from app.core.config import get_settings
from app.routers import ask, image, report
from app.services.rag import load_chunks

app = FastAPI(title="Runtime in Space - Assistant service")
for module in (ask, image, report):
    app.include_router(module.router)


@app.get("/health", tags=["health"])
def health():
    settings = get_settings()
    return {"status": "ok", "service": "assistant", "provider": settings.llm_provider,
            "document_chunks": len(load_chunks())}
