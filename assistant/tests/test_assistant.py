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


def test_search_ranks_by_shared_words(monkeypatch):
    chunks = [{"title": "a.md", "snippet": "Bone loss in microgravity", "words": {"bone", "loss", "microgravity"}},
              {"title": "b.md", "snippet": "Radiation exposure limits", "words": {"radiation", "exposure", "limits"}}]
    monkeypatch.setattr(rag, "load_chunks", lambda: chunks)
    assert rag.search("bone loss")[0]["title"] == "a.md"
    assert rag.search("unrelated question about sleep") == []
