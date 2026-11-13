from app.services import anomaly_client


def _seed_history(client, crew_id, indicator, count):
    readings = [{"crew_id": crew_id, "timestamp": f"2026-11-01T00:{i:02d}:00Z", "values": {indicator: 60 + i}}
                for i in range(count)]
    client.post("/readings/bulk", json={"readings": readings})


def test_analyze_degrades_gracefully_when_anomaly_service_is_unreachable(client):
    _seed_history(client, 4, "heart_rate", 10)
    response = client.post("/crew/4/analyze")
    assert response.status_code == 200
    assert response.json() == {"model": None, "results": []}


def test_analyze_creates_an_event_and_task_for_an_anomaly(client, monkeypatch):
    _seed_history(client, 4, "hrv", 10)

    def fake_analyze(crew_id, window):
        assert "hrv" in window
        return {"model": "zscore", "results": {"hrv": {"is_anomaly": True, "score": 3.1}}}

    monkeypatch.setattr(anomaly_client, "analyze", fake_analyze)
    body = client.post("/crew/4/analyze").json()
    assert body == {"model": "zscore", "results": [{"indicator": "hrv", "is_anomaly": True, "score": 3.1}]}

    events = client.get("/crew/4/events").json()
    assert any(e["type"] == "anomaly" and e["indicator"] == "hrv" for e in events)
    tasks = client.get("/crew/4/tasks").json()
    assert any(t["indicator"] == "hrv" and t["origin"] == "warning" for t in tasks)


def test_analyze_unknown_crew_is_404(client):
    assert client.post("/crew/99/analyze").status_code == 404
