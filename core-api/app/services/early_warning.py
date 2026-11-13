"""Early warning: ask the Forecast service where an indicator is heading."""
from datetime import timedelta
from statistics import median

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.time import humanize_seconds, utcnow
from app.db.models import Crew, Event, Reading
from app.services import forecast_client, tasks
from app.services.content import load_indicators

MIN_POINTS = 12


def run(db: Session, crew: Crew, indicator: str) -> Event | None:
    """Forecast one indicator. Log an event and add a task if it is heading out of range."""
    settings = get_settings()
    definition = load_indicators()[indicator]
    oldest = utcnow() - timedelta(minutes=settings.forecast_max_age_minutes)
    rows = (db.query(Reading)
            .filter(Reading.crew_id == crew.id, Reading.indicator == indicator, Reading.timestamp >= oldest)
            .order_by(Reading.timestamp.desc()).limit(settings.forecast_window).all())
    rows.reverse()
    if len(rows) < MIN_POINTS:
        return None

    result = forecast_client.forecast(indicator, [r.value for r in rows], settings.forecast_horizon,
                                      definition["green"], definition["yellow"])
    if result is None:
        return None

    if result.get("deviation_score", 0) < settings.early_warning_min_deviation:
        return None

    to_yellow, to_red = result.get("steps_to_yellow"), result.get("steps_to_red")
    # Already outside a zone (0) is the status rules' job, not a forecast.
    if to_yellow:
        level, steps = "watch", to_yellow
    elif to_red:
        level, steps = "act", to_red
    else:
        return None

    cutoff = utcnow() - timedelta(minutes=settings.early_warning_cooldown_minutes)
    recent = (db.query(Event).filter(Event.crew_id == crew.id, Event.type == "early_warning",
                                     Event.indicator == indicator, Event.timestamp >= cutoff).count())
    if recent:
        return None

    gaps = [(b.timestamp - a.timestamp).total_seconds() for a, b in zip(rows, rows[1:])]
    eta = humanize_seconds(steps * median(gaps)) if gaps else f"{steps} readings"
    event = Event(crew_id=crew.id, type="early_warning", indicator=indicator,
                  message=f"{definition['name']} is drifting and is forecast to reach the {level} level in about {eta}.",
                  data={"forecast": result, "level": level})
    db.add(event)
    tasks.add_warning_task(db, crew.id, indicator, definition["name"])
    db.commit()
    return event
