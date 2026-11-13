from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew


def get_crew(crew_id: int, db: Session = Depends(get_db)) -> Crew:
    crew = db.get(Crew, crew_id)
    if crew is None:
        raise HTTPException(status_code=404, detail="Crew member not found")
    return crew
