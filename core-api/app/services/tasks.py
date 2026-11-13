"""Daily tasks and the check-in streak."""
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.db.models import Reading, Task
from app.services.content import load_indicators


def ensure_today_tasks(db: Session, crew_id: int, day: date | None = None) -> None:
    """Create today's routine tasks once, from how often each indicator is measured."""
    day = day or utcnow().date()
    exists = db.query(Task).filter_by(crew_id=crew_id, day=day, origin="routine").count()
    if exists:
        return
    for definition in load_indicators().values():
        if definition.get("checks_per_day", 0) > 0:
            title = definition.get("task_title") or f"Measure {definition['name'].lower()}"
            db.add(Task(crew_id=crew_id, day=day, title=title, indicator=definition["id"]))
    # TODO (content track): non-measurement tasks such as exercise and lights-out.
    db.commit()


def close_for_indicator(db: Session, crew_id: int, indicator: str, day: date) -> None:
    """A reading arrived, so the routine task that asked for it is done.

    Warning tasks stay open until the crew member ticks them.
    """
    (db.query(Task).filter_by(crew_id=crew_id, day=day, indicator=indicator, origin="routine", done=False)
     .update({"done": True}))


def add_warning_task(db: Session, crew_id: int, indicator: str, name: str) -> None:
    day = utcnow().date()
    open_one = db.query(Task).filter_by(crew_id=crew_id, day=day, indicator=indicator,
                                        origin="warning", done=False).count()
    if not open_one:
        db.add(Task(crew_id=crew_id, day=day, indicator=indicator, origin="warning",
                    title=f"Repeat {name.lower()} at rest"))


def today_tasks(db: Session, crew_id: int) -> list[Task]:
    ensure_today_tasks(db, crew_id)
    return db.query(Task).filter_by(crew_id=crew_id, day=utcnow().date()).order_by(Task.done, Task.id).all()


def streak(db: Session, crew_id: int) -> int:
    """Consecutive days, ending today or yesterday, with at least one manual reading."""
    rows = (db.query(func.date(Reading.timestamp))
            .filter(Reading.crew_id == crew_id, Reading.source == "manual")
            .distinct().all())
    days = {date.fromisoformat(row[0]) for row in rows if row[0]}
    cursor = utcnow().date()
    if cursor not in days:
        cursor -= timedelta(days=1)
    count = 0
    while cursor in days:
        count += 1
        cursor -= timedelta(days=1)
    return count
