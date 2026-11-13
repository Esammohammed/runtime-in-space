"""Retrieval over the project's NASA source material.

Two tiers, tried in order:
1. The real hybrid search (BM25 + BGE embeddings over the indexed PDFs,
   ChromaDB-backed) built in the top-level `rag/` package. Needs its heavier
   dependencies installed and an index already built
   (`python rag/main.py ingest`).
2. A simple keyword retriever over content/nasa-docs/*.md -- always
   available, no extra dependencies, enough to keep the pipeline working
   when the heavier engine isn't installed or hasn't been indexed yet.

Either tier returns the same shape: [{"title", "snippet"}, ...]. Whichever
LLM assistant/app/services/llm.py is configured for (mock, a local Ollama
model, or the ChatGPT API) is what turns these into an answer -- that
choice is independent of which retrieval tier is active here.
"""
import logging
import re
import sys
from functools import lru_cache

from app.core.config import get_settings

log = logging.getLogger(__name__)

STOPWORDS = {"the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "my", "i", "it", "for",
             "on", "with", "when", "what", "how", "why", "do", "does", "me", "at", "be", "this", "that"}


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOPWORDS and len(w) > 2}


@lru_cache
def load_chunks() -> list[dict]:
    """Every paragraph of every .md/.txt file, except the folder's README."""
    folder = get_settings().content_dir / "nasa-docs"
    chunks = []
    if not folder.exists():
        return chunks
    for path in sorted(folder.glob("*")):
        if path.suffix not in {".md", ".txt"} or path.name.lower() == "readme.md":
            continue
        for paragraph in re.split(r"\n\s*\n", path.read_text(encoding="utf-8")):
            paragraph = paragraph.strip()
            if len(paragraph) > 40:
                chunks.append({"title": path.name, "snippet": paragraph, "words": _words(paragraph)})
    return chunks


def _keyword_search(question: str, top_k: int) -> list[dict]:
    query = _words(question)
    scored = [(len(query & chunk["words"]), chunk) for chunk in load_chunks()]
    best = sorted((item for item in scored if item[0] > 0), key=lambda item: item[0], reverse=True)[:top_k]
    return [{"title": chunk["title"], "snippet": chunk["snippet"]} for _, chunk in best]


@lru_cache
def _hybrid_search_fn():
    """Import the real rag/ engine once. None if it isn't usable here --
    its dependencies aren't installed, or `rag/` doesn't exist in this checkout.
    rag/'s own modules use plain top-level imports (not a package), so this
    adds its directory to sys.path rather than rewriting its import style."""
    rag_dir = str(get_settings().rag_dir)
    if rag_dir not in sys.path:
        sys.path.insert(0, rag_dir)
    try:
        from index import hybrid_search  # type: ignore
    except ImportError as exc:
        log.warning("Real RAG engine not available (%s); using the keyword fallback.", exc)
        return None
    return hybrid_search


def _hybrid_search(question: str, top_k: int) -> list[dict] | None:
    hybrid_search = _hybrid_search_fn()
    if hybrid_search is None:
        return None
    try:
        chunks = hybrid_search(question, k=top_k)
    except Exception as exc:  # no index built yet, Chroma/model not ready, etc.
        log.warning("Real RAG search failed (%s); using the keyword fallback.", exc)
        return None
    results = []
    for chunk in chunks:
        title = f"{chunk.get('filename') or 'source'} (p.{chunk.get('page', '?')})"
        snippet = chunk.get("text", "").split("\n\n", 1)[-1].strip()[:400]
        results.append({"title": title, "snippet": snippet})
    return results


def search(question: str, top_k: int | None = None) -> list[dict]:
    top_k = top_k or get_settings().rag_top_k
    results = _hybrid_search(question, top_k)
    if results is not None:
        return results
    return _keyword_search(question, top_k)
