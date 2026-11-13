import random
from datetime import datetime, timedelta, timezone

from app.services import generator
from app.services.history import build_history
from app.services.scenarios import ScenarioBoard

BASELINES = {"heart_rate": 62, "hrv": 68, "spo2": 98, "skin_temp": 36.5, "sleep_hours": 7.6,
             "bp_systolic": 114, "bp_diastolic": 73, "blood_glucose": 88, "mood": 4}
NOW = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)


def test_band_values_stay_near_baseline():
    values = generator.band_values(BASELINES, NOW, {}, random.Random(1))
    assert set(values) == set(generator.BAND_LIVE)
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
    # 4 crew x 2 days x (1 daily packet + 8 band packets)
    assert len(readings) == 4 * 2 * 9
    assert readings[0]["source"] == "simulator"
    assert readings[0]["timestamp"].endswith("Z")
