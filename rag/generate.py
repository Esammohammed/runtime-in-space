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
    """Send a chat completion request to a local Ollama server and return the answer."""
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


def call_openai(messages: List[Dict[str, str]]) -> str:
    """Send a chat completion request to the ChatGPT API (or any OpenAI-compatible
    endpoint) and return the answer."""
    headers = {"Authorization": f"Bearer {config.OPENAI_API_KEY}"} if config.OPENAI_API_KEY else {}
    payload = {
        "model": config.OPENAI_MODEL,
        "messages": messages,
        "temperature": config.LLM_TEMPERATURE,
    }
    response = requests.post(
        f"{config.OPENAI_BASE_URL}/chat/completions", json=payload,
        headers=headers, timeout=config.LLM_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def call_llm(messages: List[Dict[str, str]]) -> str:
    """Dispatch to the configured provider. Switching provider is a config change,
    not a code change -- see RAG_LLM_PROVIDER in config.py."""
    if config.LLM_PROVIDER == "openai":
        return call_openai(messages)
    return call_ollama(messages)


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
        answer = call_llm(messages)
    except Exception as exc:
        answer = f"Error contacting the {config.LLM_PROVIDER} model: {exc}"

    return {
        "question": question,
        "answer": answer,
        "chunks": chunks,
    }

