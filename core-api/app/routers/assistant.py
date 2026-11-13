from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew
from app.schemas.assistant import AnalyzeImageIn, AskIn
from app.services import assistant_client
from app.services.dashboard import build_context

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _crew_or_404(db: Session, crew_id: int) -> Crew:
    crew = db.get(Crew, crew_id)
    if crew is None:
        raise HTTPException(status_code=404, detail="Crew member not found")
    return crew


def _call(path: str, payload: dict) -> dict:
    try:
        return assistant_client.post(path, payload)
    except assistant_client.AssistantUnavailable as exc:
        raise HTTPException(status_code=503, detail="Assistant service is not reachable") from exc


@router.post("/ask")
def ask(payload: AskIn, db: Session = Depends(get_db)):
    """Adds the crew member's current readings to the question, then forwards it."""
    crew = _crew_or_404(db, payload.crew_id)
    return _call("/ask", {"question": payload.question, "context": build_context(db, crew)})


@router.post("/analyze-image")
def analyze_image(payload: AnalyzeImageIn, db: Session = Depends(get_db)):
    _crew_or_404(db, payload.crew_id)
    return _call("/analyze-image", payload.model_dump(exclude={"crew_id"}))
