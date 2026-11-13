from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew, Report
from app.routers.deps import get_crew
from app.schemas.crew import ReportOut
from app.services import assistant_client
from app.services.dashboard import build_context

router = APIRouter(prefix="/crew/{crew_id}/reports", tags=["reports"])


@router.get("", response_model=list[ReportOut])
def list_reports(crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    return db.query(Report).filter_by(crew_id=crew.id).order_by(Report.created_at.desc()).all()


@router.post("", response_model=ReportOut)
def create_report(days: int = 7, crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    """Collects readings, warnings and events, asks the assistant for a summary, stores it."""
    context = build_context(db, crew, days=days, with_events=True)
    try:
        result = assistant_client.post("/report", {"context": context, "days": days})
    except assistant_client.AssistantUnavailable as exc:
        raise HTTPException(status_code=503, detail="Assistant service is not reachable") from exc
    report = Report(crew_id=crew.id, text=result["report"])
    db.add(report)
    db.commit()
    return report
