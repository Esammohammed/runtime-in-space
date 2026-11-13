from fastapi.testclient import TestClient

from app.main import app
from app.services import rag

client = TestClient(app)


def test_ask_returns_answer_and_sources_list():
    body = client.post("/ask", json={"question": "Why is my heart rate high?", "context": {}}).json()
    assert body["model"] == "mock"
    assert isinstance(body["sources"], list)
    assert body["answer"]


def test_report_and_image_work_with_the_mock():
    assert client.post("/report", json={"context": {"crew": {"name": "Crew 1"}}}).json()["report"]
    image = client.post("/analyze-image", json={"image_base64": "AAAA"}).json()
    assert image["description"] and image["next_step"]


def test_search_ranks_by_shared_words(monkeypatch):
    chunks = [{"title": "a.md", "snippet": "Bone loss in microgravity", "words": {"bone", "loss", "microgravity"}},
              {"title": "b.md", "snippet": "Radiation exposure limits", "words": {"radiation", "exposure", "limits"}}]
    monkeypatch.setattr(rag, "load_chunks", lambda: chunks)
    assert rag.search("bone loss")[0]["title"] == "a.md"
    assert rag.search("unrelated question about sleep") == []
