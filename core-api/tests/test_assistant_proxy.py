from app.services import assistant_client


def test_photo_report_fills_in_crew_name_and_streams_the_pdf(client, monkeypatch):
    seen = {}

    def fake_post_bytes(path, payload):
        seen["path"], seen["payload"] = path, payload
        return b"%PDF-1.4 fake", "application/pdf"

    monkeypatch.setattr(assistant_client, "post_bytes", fake_post_bytes)
    analysis = {"description": "d", "next_step": "n", "urgency": "watch", "model": "mock", "skin_model": None}
    response = client.post("/assistant/analyze-image/report",
                           json={"crew_id": 1, "image_base64": "AAAA", "note": "", "analysis": analysis})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content == b"%PDF-1.4 fake"
    assert seen["path"] == "/analyze-image/report"
    assert "crew_id" not in seen["payload"]
    assert seen["payload"]["crew_name"]
    assert seen["payload"]["analysis"] == analysis


def test_photo_report_is_503_when_the_assistant_is_down(client, monkeypatch):
    def down(path, payload):
        raise assistant_client.AssistantUnavailable("down")

    monkeypatch.setattr(assistant_client, "post_bytes", down)
    response = client.post("/assistant/analyze-image/report",
                           json={"crew_id": 1, "image_base64": "AAAA", "analysis": {}})
    assert response.status_code == 503


def test_photo_report_for_unknown_crew_is_404(client):
    response = client.post("/assistant/analyze-image/report",
                           json={"crew_id": 9999, "image_base64": "AAAA", "analysis": {}})
    assert response.status_code == 404
