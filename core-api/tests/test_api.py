def test_crew_is_seeded(client):
    crew = client.get("/crew").json()
    assert len(crew) == 4


def test_reading_is_stored_and_assessed(client):
    response = client.post("/readings", json={"crew_id": 1, "source": "simulator",
                                              "values": {"heart_rate": 130, "spo2": 98}})
    body = response.json()
    assert response.status_code == 200
    assert body["stored"] == 2
    statuses = {a["indicator"]: a["status"] for a in body["assessments"]}
    assert statuses == {"heart_rate": "red", "spo2": "green"}


def test_dashboard_reflects_latest_reading(client):
    dashboard = client.get("/crew/1/dashboard").json()
    heart = next(i for i in dashboard["indicators"] if i["id"] == "heart_rate")
    assert heart["value"] == 130
    assert dashboard["body_areas"]["heart"] == "red"


def test_manual_reading_closes_its_task_and_starts_a_streak(client):
    before = client.get("/crew/2/tasks").json()
    assert any(t["indicator"] == "blood_glucose" and not t["done"] for t in before)
    client.post("/readings", json={"crew_id": 2, "source": "manual", "values": {"blood_glucose": 90}})
    after = client.get("/crew/2/dashboard").json()
    assert any(t["indicator"] == "blood_glucose" and t["done"] for t in after["tasks"])
    assert after["streak"] == 1


def test_unknown_crew_is_404(client):
    assert client.post("/readings", json={"crew_id": 99, "values": {"heart_rate": 70}}).status_code == 404


def test_bulk_history_and_series(client):
    readings = [{"crew_id": 3, "timestamp": f"2026-11-01T0{h}:00:00Z", "values": {"heart_rate": 60 + h}}
                for h in range(5)]
    assert client.post("/readings/bulk", json={"readings": readings}).json() == {"stored": 5}
    series = client.get("/crew/3/readings", params={"indicator": "heart_rate"}).json()
    assert [p["value"] for p in series] == [60, 61, 62, 63, 64]
    assert series[0]["timestamp"].endswith("Z")
