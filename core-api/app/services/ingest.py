"""What happens when a reading arrives: store, assess, close tasks, maybe forecast."""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.time import to_naive_utc, utcnow
from app.db.models import Assessment, Crew, Reading
from app.schemas.reading import AssessmentOut, IngestOut, ReadingIn
from app.services import early_warning, tasks
from app.services.assessment import assess
from app.services.content import load_indicators


def store_reading(db: Session, payload: ReadingIn) -> IngestOut:
    crew = db.get(Crew, payload.crew_id)
    if crew is None:
        raise LookupError(f"Unknown crew member {payload.crew_id}")

    definitions = load_indicators()
    timestamp = to_naive_utc(payload.timestamp) if payload.timestamp else utcnow()
    results: list[AssessmentOut] = []

    for indicator, value in payload.values.items():
        definition = definitions.get(indicator)
        if definition is None:
            continue  # unknown indicator ids are ignored, not an error
        reading = Reading(crew_id=crew.id, indicator=indicator, value=value,
                          source=payload.source, timestamp=timestamp)
        db.add(reading)
        db.flush()
        status, reason = assess(definition, value, crew.baselines.get(indicator))
        db.add(Assessment(reading_id=reading.id, crew_id=crew.id, indicator=indicator,
                          status=status, reason=reason))
        tasks.close_for_indicator(db, crew.id, indicator, timestamp.date())
        results.append(AssessmentOut(indicator=indicator, value=value, status=status, reason=reason))
    db.commit()

    every = get_settings().early_warning_every
    for item in results:
        if every and definitions[item.indicator]["source"] == "band":
            count = db.query(Reading).filter_by(crew_id=crew.id, indicator=item.indicator).count()
            if count % every == 0:
                early_warning.run(db, crew, item.indicator)

    return IngestOut(stored=len(results), assessments=results)


def store_bulk(db: Session, readings: list[ReadingIn]) -> int:
    """History load: store only, no assessments, no tasks, no forecasts."""
    definitions = load_indicators()
    rows = []
    for payload in readings:
        timestamp = to_naive_utc(payload.timestamp) if payload.timestamp else utcnow()
        for indicator, value in payload.values.items():
            if indicator in definitions:
                rows.append({"crew_id": payload.crew_id, "indicator": indicator, "value": value,
                             "source": payload.source, "timestamp": timestamp})
    if rows:
        db.bulk_insert_mappings(Reading, rows)
        db.commit()
    return len(rows)
