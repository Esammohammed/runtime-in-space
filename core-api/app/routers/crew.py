from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew
from app.routers.deps import get_crew
from app.schemas.crew import CrewOut
from app.schemas.dashboard import DashboardOut
from app.services.dashboard import build_dashboard

router = APIRouter(prefix="/crew", tags=["crew"])


@router.get("", response_model=list[CrewOut])
def list_crew(db: Session = Depends(get_db)):
    return db.query(Crew).order_by(Crew.id).all()


@router.get("/{crew_id}", response_model=CrewOut)
def read_crew(crew: Crew = Depends(get_crew)):
    return crew


@router.get("/{crew_id}/dashboard", response_model=DashboardOut)
def dashboard(crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    """Everything the home screen shows. The frontend polls this."""
    return build_dashboard(db, crew)
