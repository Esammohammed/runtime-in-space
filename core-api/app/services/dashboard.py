"""Builds the one response the home screen polls, and the context sent to the assistant."""
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.db.models import Assessment, Crew, Event, Reading
from app.schemas.crew import CrewOut, EventOut, TaskOut
from app.schemas.dashboard import DashboardOut, IndicatorState
from app.services import tasks
from app.services.assessment import assess, worst
from app.services.content import load_indicators

TREND_POINTS = 20


def indicator_states(db: Session, crew: Crew) -> list[IndicatorState]:
    states = []
    for definition in load_indicators().values():
        rows = (db.query(Reading).filter_by(crew_id=crew.id, indicator=definition["id"])
                .order_by(Reading.timestamp.desc()).limit(TREND_POINTS).all())
        state = IndicatorState(id=definition["id"], name=definition["name"], unit=definition["unit"],
                               body_area=definition["body_area"], source=definition["source"])
        if rows:
            latest = rows[0]
            stored = db.query(Assessment).filter_by(reading_id=latest.id).first()
            if stored:
                status, reason = stored.status, stored.reason
            else:  # history rows have no stored assessment
                status, reason = assess(definition, latest.value, crew.baselines.get(definition["id"]))
            state.value, state.timestamp = latest.value, latest.timestamp
            state.status, state.reason = status, reason
            state.trend = [r.value for r in reversed(rows)]
        states.append(state)
    return states


def recent_warnings(db: Session, crew_id: int, hours: int = 24) -> list[Event]:
    cutoff = utcnow() - timedelta(hours=hours)
    return (db.query(Event).filter(Event.crew_id == crew_id, Event.type == "early_warning",
                                   Event.timestamp >= cutoff)
            .order_by(Event.timestamp.desc()).limit(5).all())


def build_dashboard(db: Session, crew: Crew) -> DashboardOut:
    states = indicator_states(db, crew)
    areas: dict[str, list[str]] = {}
    for state in states:
        if state.status:
            areas.setdefault(state.body_area, []).append(state.status)
    return DashboardOut(
        crew=CrewOut.model_validate(crew),
        indicators=states,
        body_areas={area: worst(statuses) for area, statuses in areas.items()},
        warnings=[EventOut.model_validate(e) for e in recent_warnings(db, crew.id)],
        tasks=[TaskOut.model_validate(t) for t in tasks.today_tasks(db, crew.id)],
        streak=tasks.streak(db, crew.id),
    )


def build_context(db: Session, crew: Crew, days: int = 7, with_events: bool = False) -> dict:
    """What the assistant is told about one crew member."""
    context = {
        "crew": {"id": crew.id, "name": crew.name, "role": crew.role, "baselines": crew.baselines},
        "latest": [{"indicator": s.name, "value": s.value, "unit": s.unit, "status": s.status, "reason": s.reason}
                   for s in indicator_states(db, crew) if s.value is not None],
        "warnings": [e.message for e in recent_warnings(db, crew.id, hours=days * 24)],
    }
    if with_events:
        cutoff = utcnow() - timedelta(days=days)
        events = (db.query(Event).filter(Event.crew_id == crew.id, Event.timestamp >= cutoff)
                  .order_by(Event.timestamp).all())
        context["events"] = [{"time": e.timestamp.isoformat() + "Z", "type": e.type, "message": e.message}
                             for e in events]
    return context
