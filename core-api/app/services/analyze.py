"""On-demand anomaly check: pull each indicator's recent readings, by count
rather than time (so history-loaded data counts too), and ask the Anomaly
service. Degrades to an empty result when that service is unavailable --
never raises, never 500s.
"""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Crew, Event, Reading
from app.schemas.analyze import AnalyzeOut, AnomalyResult
from app.services import anomaly_client, tasks
from app.services.content import load_indicators

MIN_POINTS = 5


def _recent_window(db: Session, crew_id: int, settings) -> dict[str, list[float]]:
    window: dict[str, list[float]] = {}
    for indicator in load_indicators():
        rows = (db.query(Reading).filter_by(crew_id=crew_id, indicator=indicator)
                .order_by(Reading.timestamp.desc()).limit(settings.analyze_window).all())
        if len(rows) >= MIN_POINTS:
            window[indicator] = [r.value for r in reversed(rows)]
    return window


def run_analysis(db: Session, crew: Crew) -> AnalyzeOut:
    settings = get_settings()
    window = _recent_window(db, crew.id, settings)
    if not window:
        return AnalyzeOut()

    response = anomaly_client.analyze(crew.id, window)
    if response is None:
        return AnalyzeOut()

    definitions = load_indicators()
    results = []
    for indicator, result in response.get("results", {}).items():
        is_anomaly, score = bool(result.get("is_anomaly")), float(result.get("score", 0.0))
        results.append(AnomalyResult(indicator=indicator, is_anomaly=is_anomaly, score=score))
        if is_anomaly:
            name = definitions.get(indicator, {}).get("name", indicator)
            db.add(Event(crew_id=crew.id, type="anomaly", indicator=indicator,
                         message=f"{name} looks unusual (score {score:.1f}).",
                         data={"score": score, "model": response.get("model")}))
            tasks.add_warning_task(db, crew.id, indicator, name)
    db.commit()

    return AnalyzeOut(model=response.get("model"), results=results)
