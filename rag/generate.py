"""Generation module for the Runtime-in-Space RAG system.

Retrieves context via hybrid search and generates an answer using Ollama.
"""

from typing import Any, Dict, List

import requests

import config
from index import hybrid_search


def build_user_message(chunks: List[Dict[str, Any]], question: str) -> str:
    """Build the user message with numbered source chunks."""
    parts = []
    for idx, chunk in enumerate(chunks, start=1):
        filename = chunk.get("filename", "")
        page = chunk.get("page", "?")
        text = chunk.get("text", "")
        parts.append(f"[{idx}] {filename} (p.{page})\n{text}")
    parts.append(f"Question: {question}")
    parts.append(
        "Remember: answer from the sources if they contain relevant information. "
        "Refuse only if they contain nothing relevant."
    )
    return "\n\n".join(parts)


def call_ollama(messages: List[Dict[str, str]]) -> str:
    """Send a chat completion request to Ollama and return the answer."""
    payload = {
        "model": config.OLLAMA_MODEL,
        "messages": messages,
        "options": {
            "temperature": config.LLM_TEMPERATURE,
            "num_ctx": config.LLM_NUM_CTX,
        },
        "stream": False,
    }
    response = requests.post(
        config.OLLAMA_URL, json=payload, timeout=config.LLM_TIMEOUT
    )
    response.raise_for_status()
    data = response.json()
    return data.get("message", {}).get("content", "")


def ask(question: str, top_k: int | None = None) -> Dict[str, Any]:
    """End-to-end: retrieve chunks → generate answer → return result dict."""
    if top_k is None:
        top_k = config.TOP_K

    chunks = hybrid_search(question, k=top_k)
    user_msg = build_user_message(chunks, question)
    messages = [
        {"role": "system", "content": config.SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]

    try:
        answer = call_ollama(messages)
    except Exception as exc:
        answer = f"Error contacting Ollama: {exc}"

    return {
        "question": question,
        "answer": answer,
        "chunks": chunks,
    }

