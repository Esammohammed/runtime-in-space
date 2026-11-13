"""Centralized configuration for the Runtime-in-Space RAG system.

All paths, model names, chunking parameters, and retrieval settings live here.
Override any value via environment variables or a .env file.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the rag/ directory (or project root)
_RAG_DIR = Path(__file__).resolve().parent
load_dotenv(_RAG_DIR / ".env")
load_dotenv(_RAG_DIR.parent / ".env")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = Path(os.getenv("RAG_DATA_DIR", str(_RAG_DIR.parent / "data")))
CHROMA_DIR = Path(os.getenv("RAG_CHROMA_DIR", str(_RAG_DIR / "chroma_db")))
CHUNKS_FILE = Path(os.getenv("RAG_CHUNKS_FILE", str(_RAG_DIR / "chunks.jsonl")))
SECTIONS_FILE = Path(os.getenv("RAG_SECTIONS_FILE", str(_RAG_DIR / "sections.json")))

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
PDF_GLOB = "*.pdf"

# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1400"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
MIN_CHUNK_WORDS = int(os.getenv("RAG_MIN_CHUNK_WORDS", "10"))
SEPARATORS = ["\n\n", "\n", ". ", " "]

# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------
EMBEDDER_MODEL = os.getenv("RAG_EMBEDDER_MODEL", "BAAI/bge-base-en-v1.5")
EMBEDDER_DIMS = int(os.getenv("RAG_EMBEDDER_DIMS", "768"))
EMBEDDER_MAX_SEQ = int(os.getenv("RAG_EMBEDDER_MAX_SEQ", "512"))
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
EMBED_BATCH_SIZE = int(os.getenv("RAG_EMBED_BATCH_SIZE", "16"))

# ---------------------------------------------------------------------------
# ChromaDB
# ---------------------------------------------------------------------------
COLLECTION_NAME = os.getenv("RAG_COLLECTION_NAME", "runtime_in_space")

# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------
TOP_K = int(os.getenv("RAG_TOP_K", "5"))
SEMANTIC_WEIGHT = float(os.getenv("RAG_SEMANTIC_WEIGHT", "0.65"))
HYBRID_POOL = int(os.getenv("RAG_HYBRID_POOL", "20"))

# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------
# "ollama" talks to a local Ollama server -- set OLLAMA_MODEL to whichever
# model you've pulled (qwen2.5:7b, llama3.1:8b, mistral:7b, ...). "openai"
# talks to the real ChatGPT API (or any OpenAI-compatible endpoint) -- set
# OPENAI_API_KEY to your token. Switching provider needs no code change.
LLM_PROVIDER = os.getenv("RAG_LLM_PROVIDER", "ollama")  # "ollama" | "openai"

OLLAMA_MODEL = os.getenv("RAG_OLLAMA_MODEL", "qwen2.5:7b")
OLLAMA_URL = os.getenv("RAG_OLLAMA_URL", "http://localhost:11434/api/chat")

OPENAI_MODEL = os.getenv("RAG_OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("RAG_OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_API_KEY = os.getenv("RAG_OPENAI_API_KEY", "")

LLM_TEMPERATURE = float(os.getenv("RAG_LLM_TEMPERATURE", "0"))
LLM_NUM_CTX = int(os.getenv("RAG_LLM_NUM_CTX", "4096"))
LLM_TIMEOUT = int(os.getenv("RAG_LLM_TIMEOUT", "300"))

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are a research assistant for NASA human spaceflight, space biology, "
    "and crew health topics.\n"
    "Answer ONLY from the numbered sources provided below.\n"
    "Step 1: Check whether the sources contain information relevant to the question.\n"
    "Step 2: If the sources do not contain relevant information, reply with exactly: "
    "\"I don't have enough information in the provided sources.\"\n"
    "Step 3: Otherwise, answer in 3-6 clear sentences using only the sources. "
    "After each key point, add a citation like [1], [2], or [3].\n"
    "Never use outside knowledge. Never speculate beyond what the sources state."
)

