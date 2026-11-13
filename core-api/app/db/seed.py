"""Create tables and insert the crew from content/crew.json on first start."""
from sqlalchemy.orm import Session

from app.db.database import Base, engine
from app.db.models import Crew
from app.services.content import load_crew


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        if db.query(Crew).count() == 0:
            for member in load_crew():
                db.add(Crew(id=member["id"], name=member["name"], role=member.get("role", ""),
                            age=member.get("age"), baselines=member.get("baselines", {})))
            db.commit()
