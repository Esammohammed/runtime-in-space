"""Retrieval over the documents in content/nasa-docs.

This is a keyword retriever: it scores each paragraph by how many question words
it contains. It is enough to wire the pipeline. Replace `search` with an
embedding search when the documents are in place; the return shape stays the same.
"""
import re
from functools import lru_cache

from app.core.config import get_settings

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


def search(question: str, top_k: int | None = None) -> list[dict]:
    top_k = top_k or get_settings().rag_top_k
    query = _words(question)
    scored = [(len(query & chunk["words"]), chunk) for chunk in load_chunks()]
    best = sorted((item for item in scored if item[0] > 0), key=lambda item: item[0], reverse=True)[:top_k]
    return [{"title": chunk["title"], "snippet": chunk["snippet"]} for _, chunk in best]
