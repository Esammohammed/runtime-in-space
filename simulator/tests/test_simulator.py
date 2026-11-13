import json
import random
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import hazards
from app.core.config import get_settings
from app.main import app
from app.services import generator
from app.services.history import build_history
from app.services.scenarios import ScenarioBoard


def load_indicators() -> dict[str, dict]:
    path = get_settings().content_dir / "indicators.json"
    return {item["id"]: item for item in json.loads(path.read_text(encoding="utf-8"))["indicators"]}

BASELINES = {"heart_rate": 62, "hrv": 68, "spo2": 98, "skin_temp": 36.5, "sleep_hours": 7.6,
             "bp_systolic": 114, "bp_diastolic": 73, "blood_glucose": 88, "mood": 4,
             "radiation_dose": 0.3, "cabin_co2": 1.5}
NOW = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_continuous_values_stay_near_baseline():
    values = generator.continuous_values(BASELINES, NOW, {}, random.Random(1))
    assert set(values) == set(hazards.CONTINUOUS)
    assert abs(values["heart_rate"] - 62) < 20
    assert values["spo2"] <= 100


def test_scenario_effect_grows_over_the_ramp():
    board = ScenarioBoard(ramp_seconds=100)
    board.set(1, "infection", NOW)
    assert board.effects(1, NOW)["skin_temp"] == 0
    assert board.effects(1, NOW + timedelta(seconds=50))["skin_temp"] == 0.8
    assert board.effects(1, NOW + timedelta(seconds=500))["skin_temp"] == 1.6
    board.set(1, "none", NOW)
    assert board.effects(1, NOW) == {}


def test_history_has_the_expected_number_of_packets():
    readings = build_history(days=2, now=NOW)
    # 4 crew x 2 days x (1 daily packet + 8 continuous packets)
    assert len(readings) == 4 * 2 * 9
    assert readings[0]["source"] == "simulator"
    assert readings[0]["timestamp"].endswith("Z")


def test_history_scenario_only_touches_the_tail():
    plain = build_history(days=5, now=NOW)
    sick = build_history(days=5, now=NOW, scenario="infection", crew_id=1, scenario_points=5)

    crew1_plain = [r for r in plain if r["crew_id"] == 1 and "skin_temp" in r["values"]]
    crew1_sick = [r for r in sick if r["crew_id"] == 1 and "skin_temp" in r["values"]]
    # Earlier continuous readings are untouched by the scenario.
    assert crew1_sick[0]["values"]["skin_temp"] == crew1_plain[0]["values"]["skin_temp"]
    # The last scenario_points readings carry the full infection offset.
    assert crew1_sick[-1]["values"]["skin_temp"] > crew1_plain[-1]["values"]["skin_temp"] + 1.0
    # Other crew members are untouched since crew_id=1 was given.
    crew2_plain = [r for r in plain if r["crew_id"] == 2 and "skin_temp" in r["values"]]
    crew2_sick = [r for r in sick if r["crew_id"] == 2 and "skin_temp" in r["values"]]
    assert crew2_sick[-1]["values"]["skin_temp"] == crew2_plain[-1]["values"]["skin_temp"]


def test_unknown_scenario_is_a_clean_422(client):
    response = client.post("/scenario", json={"crew_id": 1, "scenario": "made_up"})
    assert response.status_code == 422


def test_every_indicator_hazard_matches_the_registry():
    definitions = load_indicators()
    assert set(definitions) == set(hazards.HAZARD_OF)
    for indicator_id, definition in definitions.items():
        assert definition["hazard"] == hazards.HAZARD_OF[indicator_id], indicator_id
