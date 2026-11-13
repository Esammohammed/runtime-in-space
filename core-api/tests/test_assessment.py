from app.services.assessment import assess, worst

HEART = {"green": [60, 100], "yellow": [50, 120], "unit": "bpm", "baseline_tolerance_pct": 15}


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
