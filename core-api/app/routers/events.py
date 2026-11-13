from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew, Event
from app.routers.deps import get_crew
from app.schemas.crew import EventIn, EventOut

router = APIRouter(tags=["events"])


@router.get("/crew/{crew_id}/events", response_model=list[EventOut])
def list_events(limit: int = Query(100, le=1000), crew: Crew = Depends(get_crew),
                db: Session = Depends(get_db)):
    return (db.query(Event).filter_by(crew_id=crew.id)
            .order_by(Event.timestamp.desc()).limit(limit).all())


@router.post("/events", response_model=EventOut)
def log_event(payload: EventIn, db: Session = Depends(get_db)):
    """The frontend logs emergency steps here so they reach the report."""
    if db.get(Crew, payload.crew_id) is None:
        raise HTTPException(status_code=404, detail="Crew member not found")
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    return event
