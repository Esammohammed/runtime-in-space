from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew, Reading
from app.routers.deps import get_crew
from app.schemas.reading import BulkReadingsIn, IngestOut, ReadingIn, ReadingPoint
from app.services import ingest

router = APIRouter(tags=["readings"])


@router.post("/readings", response_model=IngestOut)
def post_reading(payload: ReadingIn, db: Session = Depends(get_db)):
    """One reading from the simulator or the daily check-in."""
    try:
        return ingest.store_reading(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/readings/bulk")
def post_bulk(payload: BulkReadingsIn, db: Session = Depends(get_db)):
    """History load. Stored without assessments."""
    return {"stored": ingest.store_bulk(db, payload.readings)}


@router.get("/crew/{crew_id}/readings", response_model=list[ReadingPoint])
def read_series(indicator: str, limit: int = Query(500, le=5000),
                crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    """The latest `limit` values of one indicator, oldest first, for a chart."""
    rows = (db.query(Reading).filter_by(crew_id=crew.id, indicator=indicator)
            .order_by(Reading.timestamp.desc()).limit(limit).all())
    return list(reversed(rows))
