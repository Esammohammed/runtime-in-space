from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
ZONES = {"green": [60, 100], "yellow": [50, 120]}


def test_rising_series_reaches_yellow():
    values = [70 + 2 * i for i in range(12)]  # 70 .. 92, +2 per step
    body = client.post("/forecast", json={"indicator": "heart_rate", "values": values,
                                          "horizon": 24, **ZONES}).json()
    assert body["model"] == "linear"
    assert body["slope"] > 1.5
    assert body["steps_to_yellow"] == 5   # 94, 96, 98, 100, 102
    assert body["steps_to_red"] == 15     # first value above 120


def test_flat_series_gives_no_warning():
    body = client.post("/forecast", json={"indicator": "heart_rate", "values": [70, 71, 70, 69, 70, 71],
                                          "horizon": 24, **ZONES}).json()
    assert body["steps_to_yellow"] is None
    assert body["steps_to_red"] is None


def test_already_outside_is_zero():
    body = client.post("/forecast", json={"indicator": "heart_rate", "values": [100, 104, 108],
                                          "horizon": 5, **ZONES}).json()
    assert body["steps_to_yellow"] == 0
