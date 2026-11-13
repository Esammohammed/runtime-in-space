"""Streamlit chat UI for the Runtime-in-Space RAG system.

Run with:  streamlit run app.py
"""

import streamlit as st
import requests

import config
from generate import ask, call_ollama, build_user_message
from index import hybrid_search


# ---------------------------------------------------------------------------
# Warm-up (once per session)
# ---------------------------------------------------------------------------
@st.cache_resource(show_spinner="Loading retrieval models…")
def _warmup():
    hybrid_search("space", k=1)
    return True


# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(page_title="Runtime-in-Space RAG", page_icon="🚀")
st.title("🚀 Runtime-in-Space — Research Assistant")
st.caption(
    "Answers come only from NASA spaceflight & crew-health documents. "
    "Not a substitute for expert advice."
)

_warmup()

if "history" not in st.session_state:
    st.session_state.history = []

# ---------------------------------------------------------------------------
# Render history
# ---------------------------------------------------------------------------
for turn in st.session_state.history:
    with st.chat_message("user"):
        st.write(turn["question"])
    with st.chat_message("assistant"):
        st.write(turn["answer"])
        with st.expander("Sources"):
            for i, chunk in enumerate(turn["chunks"], start=1):
                fname = chunk.get("filename", "")
                page = chunk.get("page", "?")
                snippet = chunk.get("text", "")[:300]
                st.markdown(f"**[{i}] {fname} (p. {page})**")
                st.caption(snippet)

# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------
question = st.chat_input("Ask about spaceflight, crew health, hypoxia, sleep…")

if question:
    with st.chat_message("user"):
        st.write(question)

    with st.chat_message("assistant"):
        with st.spinner("Searching documents…"):
            chunks = hybrid_search(question, k=config.TOP_K)

        user_msg = build_user_message(chunks, question)
        messages = [
            {"role": "system", "content": config.SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ]
        try:
            with st.spinner("Thinking…"):
                answer = call_ollama(messages)
        except requests.exceptions.ConnectionError:
            answer = "⚠️ Could not reach Ollama. Start Ollama and try again."
        except Exception as exc:
            answer = f"⚠️ Error: {exc}. Start Ollama and try again."

        st.write(answer)

        with st.expander("Sources"):
            for i, chunk in enumerate(chunks, start=1):
                fname = chunk.get("filename", "")
                page = chunk.get("page", "?")
                snippet = chunk.get("text", "")[:300]
                st.markdown(f"**[{i}] {fname} (p. {page})**")
                st.caption(snippet)

    st.session_state.history.append({
        "question": question,
        "answer": answer,
        "chunks": chunks,
    })

