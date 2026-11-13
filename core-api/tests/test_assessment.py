from app.services.assessment import assess, worst
from app.services.content import load_indicators

HEART = {"green": [60, 100], "yellow": [50, 120], "unit": "bpm", "baseline_tolerance_pct": 15}
HAZARDS = {"radiation", "isolation", "gravity", "environment"}


def test_inside_green_is_green():
    assert assess(HEART, 70)[0] == "green"


def test_between_green_and_yellow_is_yellow():
    assert assess(HEART, 110)[0] == "yellow"


def test_outside_yellow_is_red():
    assert assess(HEART, 130)[0] == "red"
    assert assess(HEART, 40)[0] == "red"


def test_far_from_personal_baseline_is_yellow():
    status, reason = assess(HEART, 80, baseline=62)
    assert status == "yellow"
    assert "baseline" in reason


def test_worst_picks_the_most_serious():
    assert worst(["green", "red", "yellow"]) == "red"
    assert worst([]) is None


def test_every_indicator_has_a_valid_hazard_and_risk():
    for definition in load_indicators().values():
        assert definition["hazard"] in HAZARDS, definition["id"]
        assert definition["nasa_risk"], definition["id"]


def test_assess_handles_the_new_indicators():
    radiation_dose = load_indicators()["radiation_dose"]
    assert assess(radiation_dose, 0.5)[0] == "green"
    assert assess(radiation_dose, 1.5)[0] == "yellow"
    assert assess(radiation_dose, 3.0)[0] == "red"

    cabin_co2 = load_indicators()["cabin_co2"]
    assert assess(cabin_co2, 2.0)[0] == "green"
    assert assess(cabin_co2, 4.0)[0] == "yellow"
    assert assess(cabin_co2, 6.0)[0] == "red"
