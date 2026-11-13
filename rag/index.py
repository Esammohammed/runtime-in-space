"""Indexing and retrieval for the Runtime-in-Space RAG system.

Builds a ChromaDB vector index with BGE embeddings and exposes
vector_search() and hybrid_search() (BM25 + vector fusion) for
downstream retrieval.
"""

import gc
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Allow offline loading when models are already cached
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

import chromadb
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import torch

import config

# ---------------------------------------------------------------------------
# In-memory caches
# ---------------------------------------------------------------------------
_MODEL: Optional[SentenceTransformer] = None
_BM25_CACHE: Optional[Tuple[BM25Okapi, List[Dict[str, Any]]]] = None
_CHROMA_CLIENT: Optional[chromadb.PersistentClient] = None


# ---------------------------------------------------------------------------
# Model helpers
# ---------------------------------------------------------------------------
def _get_device_and_dtype() -> Tuple[str, torch.dtype]:
    if torch.cuda.is_available():
        return "cuda", torch.bfloat16
    return "cpu", torch.float32


def load_model() -> SentenceTransformer:
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    device, dtype = _get_device_and_dtype()
    kwargs: Dict[str, Any] = {"device": device, "trust_remote_code": True}
    if device == "cuda":
        kwargs["model_kwargs"] = {"torch_dtype": dtype}

    try:
        model = SentenceTransformer(
            config.EMBEDDER_MODEL, local_files_only=True, **kwargs
        )
    except Exception:
        model = SentenceTransformer(config.EMBEDDER_MODEL, **kwargs)

    model.max_seq_length = config.EMBEDDER_MAX_SEQ
    _MODEL = model
    return model


def free_model() -> None:
    global _MODEL
    _MODEL = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ---------------------------------------------------------------------------
# ChromaDB helpers
# ---------------------------------------------------------------------------
def get_chroma_client() -> chromadb.PersistentClient:
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is None:
        config.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        _CHROMA_CLIENT = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    return _CHROMA_CLIENT


def _sanitize_meta(meta: Dict[str, Any]) -> Dict[str, Any]:
    clean = {}
    for k, v in meta.items():
        if v is None:
            clean[k] = ""
        elif isinstance(v, (str, int, float, bool)):
            clean[k] = v
        else:
            clean[k] = str(v)
    return clean


# ---------------------------------------------------------------------------
# Index building
# ---------------------------------------------------------------------------
def build_index(chunks: List[Dict[str, Any]] | None = None) -> None:
    """Encode chunks and populate a ChromaDB collection."""
    if chunks is None:
        from chunk import load_chunks
        chunks = load_chunks()

    model = load_model()
    texts = [c["text"] for c in chunks]

    print(f"  Encoding {len(texts)} chunks with {config.EMBEDDER_MODEL} ...")
    start = time.time()
    vectors = model.encode(
        texts,
        batch_size=config.EMBED_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).tolist()
    elapsed = time.time() - start
    print(f"  Encoded in {elapsed:.1f}s")

    client = get_chroma_client()
    col_name = config.COLLECTION_NAME

    # Drop existing collection if present
    try:
        client.delete_collection(col_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=col_name,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,
    )

    ids = [c["id"] for c in chunks]
    docs = texts
    metas = [
        _sanitize_meta({
            "source": c.get("source", ""),
            "filename": c.get("filename", ""),
            "page": c.get("page", 0),
            "part": c.get("part", 0),
            "n_words": c.get("n_words", 0),
        })
        for c in chunks
    ]

    max_batch = getattr(client, "max_batch_size", 5000)
    for i in range(0, len(chunks), max_batch):
        end = i + max_batch
        collection.add(
            ids=ids[i:end],
            embeddings=vectors[i:end],
            documents=docs[i:end],
            metadatas=metas[i:end],
        )

    print(f"  ChromaDB collection '{col_name}' populated with {len(chunks)} vectors.")
    free_model()


# ---------------------------------------------------------------------------
# Vector search
# ---------------------------------------------------------------------------
def vector_search(query: str, k: int | None = None) -> List[Dict[str, Any]]:
    """Pure vector search against the ChromaDB collection."""
    if k is None:
        k = config.TOP_K

    client = get_chroma_client()
    collection = client.get_collection(config.COLLECTION_NAME)

    model = load_model()
    query_text = f"{config.BGE_QUERY_PREFIX}{query}"
    query_vec = model.encode(
        [query_text], normalize_embeddings=True, show_progress_bar=False
    )[0].tolist()

    results = collection.query(query_embeddings=[query_vec], n_results=k)

    out: List[Dict[str, Any]] = []
    if results["ids"] and results["ids"][0]:
        ids = results["ids"][0]
        distances = results["distances"][0] if results["distances"] else [0.0] * len(ids)
        documents = results["documents"][0] if results["documents"] else [""] * len(ids)
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(ids)

        for cid, dist, doc, m in zip(ids, distances, documents, metas):
            out.append({
                "chunk_id": cid,
                "source": m.get("source", ""),
                "filename": m.get("filename", ""),
                "page": m.get("page", 0),
                "text": doc,
                "distance": float(dist),
            })
    return out


# ---------------------------------------------------------------------------
# BM25 index
# ---------------------------------------------------------------------------
def _get_bm25() -> Tuple[BM25Okapi, List[Dict[str, Any]]]:
    global _BM25_CACHE
    if _BM25_CACHE is not None:
        return _BM25_CACHE

    from chunk import load_chunks
    chunks = load_chunks()
    tokenized = [c["text"].lower().split() for c in chunks]
    bm25 = BM25Okapi(tokenized)
    _BM25_CACHE = (bm25, chunks)
    return bm25, chunks


# ---------------------------------------------------------------------------
# Hybrid search
# ---------------------------------------------------------------------------
def hybrid_search(
    query: str,
    k: int | None = None,
    semantic_weight: float | None = None,
    pool: int | None = None,
) -> List[Dict[str, Any]]:
    """BM25 + vector fusion search with min-max score normalization."""
    if k is None:
        k = config.TOP_K
    if semantic_weight is None:
        semantic_weight = config.SEMANTIC_WEIGHT
    if pool is None:
        pool = config.HYBRID_POOL

    bm25, chunks = _get_bm25()
    chunk_by_id = {c["id"]: c for c in chunks}

    # BM25 candidates
    query_tokens = query.lower().split()
    bm25_scores = bm25.get_scores(query_tokens)
    top_bm25_idx = sorted(
        range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True
    )[:pool]
    bm25_map: Dict[str, float] = {
        chunks[i]["id"]: float(bm25_scores[i]) for i in top_bm25_idx
    }

    # Vector candidates
    vec_results = vector_search(query, k=pool)
    vec_map: Dict[str, float] = {
        r["chunk_id"]: 1.0 - r["distance"] for r in vec_results
    }

    # Normalize
    def _norm(m: Dict[str, float]) -> Dict[str, float]:
        if not m:
            return {}
        vals = list(m.values())
        lo, hi = min(vals), max(vals)
        if hi > lo:
            return {k: (v - lo) / (hi - lo) for k, v in m.items()}
        return {k: 1.0 for k in m}

    n_bm25 = _norm(bm25_map)
    n_vec = _norm(vec_map)

    all_ids = set(n_bm25) | set(n_vec)
    scored = []
    for cid in all_ids:
        s = (1 - semantic_weight) * n_bm25.get(cid, 0.0) + semantic_weight * n_vec.get(cid, 0.0)
        scored.append((s, cid))
    scored.sort(key=lambda x: x[0], reverse=True)

    final: List[Dict[str, Any]] = []
    for score, cid in scored[:k]:
        c = chunk_by_id[cid]
        final.append({
            "chunk_id": cid,
            "source": c.get("source", ""),
            "filename": c.get("filename", ""),
            "page": c.get("page", 0),
            "text": c.get("text", ""),
            "score": score,
        })
    return final


if __name__ == "__main__":
    build_index()

