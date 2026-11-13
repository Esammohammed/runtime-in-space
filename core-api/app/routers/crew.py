from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew
from app.routers.deps import get_crew
from app.schemas.analyze import AnalyzeOut
from app.schemas.crew import CrewIn, CrewOut
from app.schemas.dashboard import DashboardOut
from app.services import analyze
from app.services.dashboard import build_dashboard

router = APIRouter(prefix="/crew", tags=["crew"])


@router.get("", response_model=list[CrewOut])
def list_crew(db: Session = Depends(get_db)):
    return db.query(Crew).order_by(Crew.id).all()


@router.get("/{crew_id}", response_model=CrewOut)
def read_crew(crew: Crew = Depends(get_crew)):
    return crew


@router.post("", response_model=CrewOut)
def add_crew(payload: CrewIn, db: Session = Depends(get_db)):
    """Add a crew member by name only. No baselines yet -- the status rules
    skip the personal-baseline check until this person has one."""
    crew = Crew(name=payload.name, role=payload.role, baselines={})
    db.add(crew)
    db.commit()
    db.refresh(crew)
    return crew


@router.get("/{crew_id}/dashboard", response_model=DashboardOut)
def dashboard(crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    """Everything the home screen shows. The frontend polls this."""
    return build_dashboard(db, crew)


@router.post("/{crew_id}/analyze", response_model=AnalyzeOut)
def run_analyze(crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    """Run anomaly detection over each indicator's recent readings."""
    return analyze.run_analysis(db, crew)
