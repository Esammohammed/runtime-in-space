from fastapi.testclient import TestClient

from app.main import app
from app.services import rag

client = TestClient(app)


def test_ask_returns_answer_and_sources_list():
    body = client.post("/ask", json={"question": "Why is my heart rate high?", "context": {}}).json()
    assert body["model"] == "mock"
    assert isinstance(body["sources"], list)
    assert body["answer"]


def test_ask_forwards_conversation_history_to_the_model(monkeypatch):
    from app.routers import ask as ask_router

    seen = {}

    class RecordingLLM:
        name = "recording"

        def complete(self, system, user, image=None, history=None):
            seen["history"] = history
            return "ok"

    monkeypatch.setattr(ask_router, "get_llm", lambda: RecordingLLM())
    history = [{"role": "user", "content": "Earlier question"}, {"role": "assistant", "content": "Earlier answer"}]
    client.post("/ask", json={"question": "Follow-up question", "history": history, "context": {}})
    assert seen["history"] == history


def test_report_and_image_work_with_the_mock():
    assert client.post("/report", json={"context": {"crew": {"name": "Crew 1"}}}).json()["report"]
    image = client.post("/analyze-image", json={"image_base64": "AAAA"}).json()
    assert image["description"] and image["next_step"]
    assert image["urgency"] in {"watch", "show_officer", "alert_ground"}


def test_image_urgency_falls_back_when_the_model_reply_is_unparsable(monkeypatch):
    from app.routers import image as image_router

    class UnparsableLLM:
        name = "broken"

        def complete(self, system, user, image=None):
            return "not json at all"

    monkeypatch.setattr(image_router, "get_llm", lambda: UnparsableLLM())
    body = client.post("/analyze-image", json={"image_base64": "AAAA"}).json()
    assert body["urgency"] == "show_officer"


def test_sample_images_list_is_empty_by_default():
    assert client.get("/sample-images").json() == []


def test_analyze_image_response_carries_an_optional_skin_model_field():
    """skin_model is None when onnxruntime/the model aren't available, or a
    well-formed classification -- never missing, never half-filled."""
    body = client.post("/analyze-image", json={"image_base64": "AAAA"}).json()
    assert "skin_model" in body
    if body["skin_model"] is not None:
        assert body["skin_model"]["label"]
        assert 0.0 <= body["skin_model"]["confidence"] <= 1.0
        assert len(body["skin_model"]["top3"]) == 3
        assert body["skin_model"]["disclaimer"]


def test_skin_classifier_returns_none_for_undecodable_image_bytes():
    from app.services import skin_classifier

    assert skin_classifier.classify(b"not an image") is None


def test_skin_classifier_classifies_a_real_photo():
    """Skipped where onnxruntime isn't installed -- classify() still degrades
    to None in that case, covered by the test above."""
    import pytest

    pytest.importorskip("onnxruntime")
    from io import BytesIO

    from PIL import Image

    from app.services import skin_classifier

    buffer = BytesIO()
    Image.new("RGB", (300, 300), color=(180, 140, 120)).save(buffer, format="JPEG")
    result = skin_classifier.classify(buffer.getvalue())
    assert result is not None
    assert result.label in {"Acne Vulgaris", "Eczema", "Fungal Infection", "Psoriasis", "Normal Skin"}
    assert 0.0 <= result.confidence <= 1.0
    assert len(result.top3) == 3


def test_photo_report_is_a_pdf_and_does_not_rerun_the_models(monkeypatch):
    from app.routers import image as image_router

    monkeypatch.setattr(image_router, "get_llm", lambda: (_ for _ in ()).throw(AssertionError("LLM called")))
    monkeypatch.setattr(image_router.skin_classifier, "classify",
                        lambda _: (_ for _ in ()).throw(AssertionError("classifier called")))
    analysis = {"description": "A red patch on the forearm.", "next_step": "Show the officer.",
                "urgency": "show_officer", "model": "mock",
                "skin_model": {"label": "Eczema", "confidence": 0.7, "disclaimer": "Experimental.",
                               "top3": [{"label": "Eczema", "confidence": 0.7},
                                        {"label": "Normal Skin", "confidence": 0.2},
                                        {"label": "Acne Vulgaris", "confidence": 0.1}]}}
    response = client.post("/analyze-image/report", json={"image_base64": "AAAA", "note": "itchy",
                                                          "crew_name": "Crew 1", "analysis": analysis})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_load_chunks_skips_the_source_attribution_line():
    """Each nasa-docs file opens with a 'Source: NASA ...' citation line --
    words like 'NASA'/'Health'/'Countermeasures' in it coincidentally match
    a lot of questions, so it must not become a scoreable chunk that crowds
    out the file's actual content paragraphs."""
    chunks = rag.load_chunks()
    assert chunks, "content/nasa-docs/ should have real files to load in this repo"
    assert not any(c["snippet"].startswith("Source:") for c in chunks)
    assert not any(c["snippet"].startswith("#") for c in chunks)


def test_search_ranks_by_shared_words(monkeypatch):
    chunks = [{"title": "a.md", "snippet": "Bone loss in microgravity", "words": {"bone", "loss", "microgravity"}},
              {"title": "b.md", "snippet": "Radiation exposure limits", "words": {"radiation", "exposure", "limits"}}]
    monkeypatch.setattr(rag, "load_chunks", lambda: chunks)
    assert rag.search("bone loss")[0]["title"] == "a.md"
    assert rag.search("unrelated question about sleep") == []


def test_search_falls_back_to_keywords_when_the_real_engine_is_unavailable(monkeypatch):
    """The heavy rag/ engine isn't installed in this test environment, so
    search() must use the keyword fallback without raising."""
    monkeypatch.setattr(rag, "_hybrid_search_fn", lambda: None)
    chunks = [{"title": "a.md", "snippet": "Bone loss in microgravity", "words": {"bone", "loss", "microgravity"}}]
    monkeypatch.setattr(rag, "load_chunks", lambda: chunks)
    assert rag.search("bone loss") == [{"title": "a.md", "snippet": "Bone loss in microgravity"}]


def test_search_uses_the_real_engine_when_available(monkeypatch):
    """When rag/'s hybrid_search is importable, its chunks are converted to
    the same {title, snippet} shape the keyword fallback returns."""
    def fake_hybrid_search(question, k=None):
        return [{"filename": "human-adaptation.pdf", "page": 12,
                  "text": "human-adaptation.pdf | Page 12\n\nMicrogravity causes bone density loss.",
                  "score": 0.9}]

    monkeypatch.setattr(rag, "_hybrid_search_fn", lambda: fake_hybrid_search)
    result = rag.search("bone density", top_k=1)
    assert result == [{"title": "human-adaptation.pdf (p.12)", "snippet": "Microgravity causes bone density loss."}]
