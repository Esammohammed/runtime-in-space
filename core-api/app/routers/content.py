from fastapi import APIRouter

from app.services.content import load_indicators

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/indicators")
def indicators():
    """Indicator definitions and guide texts, straight from content/indicators.json."""
    return list(load_indicators().values())
