"""Chunking module for the Runtime-in-Space RAG system.

Reads parsed sections (from parse.py) and splits them into retrieval-sized
chunks using RecursiveCharacterTextSplitter.  Each chunk gets a context
header with the source filename and page number.
"""

import json
from pathlib import Path
from typing import Any, Dict, List

from langchain_text_splitters import RecursiveCharacterTextSplitter

import config


def build_chunks(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Split sections into chunks with context headers.

    Each chunk dict:
        {id, source, filename, page, n_words, text}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=config.SEPARATORS,
    )

    chunks: List[Dict[str, Any]] = []
    chunk_counter = 0

    for section in sections:
        body = section["text"].strip()
        if len(body.split()) < config.MIN_CHUNK_WORDS:
            continue

        source = section["source"]
        filename = section["filename"]
        page = section["page"]
        header = f"{filename} | Page {page}"

        pieces = splitter.split_text(body)

        for part_num, piece in enumerate(pieces, start=1):
            chunk_counter += 1
            piece = piece.strip()
            chunk_text = f"{header}\n\n{piece}"
            chunks.append({
                "id": f"{source}-p{page:03d}-{part_num}",
                "source": source,
                "filename": filename,
                "page": page,
                "part": part_num,
                "n_words": len(chunk_text.split()),
                "text": chunk_text,
            })

    return chunks


def save_chunks(chunks: List[Dict[str, Any]], path: Path | None = None) -> Path:
    """Save chunks to JSONL."""
    output_path = path or config.CHUNKS_FILE
    with open(output_path, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    return output_path


def load_chunks(path: Path | None = None) -> List[Dict[str, Any]]:
    """Load chunks from JSONL."""
    input_path = path or config.CHUNKS_FILE
    chunks = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))
    return chunks


def chunk_all(sections: List[Dict[str, Any]] | None = None) -> List[Dict[str, Any]]:
    """Full chunking pipeline: load sections if needed, chunk, save, report."""
    if sections is None:
        with open(config.SECTIONS_FILE, "r", encoding="utf-8") as f:
            sections = json.load(f)

    chunks = build_chunks(sections)
    out = save_chunks(chunks)

    # Brief report
    sources = {}
    for c in chunks:
        src = c["source"]
        sources[src] = sources.get(src, 0) + 1

    print(f"  Chunked into {len(chunks)} chunks -> {out}")
    for src, count in sorted(sources.items()):
        print(f"    {src}: {count} chunks")

    return chunks


if __name__ == "__main__":
    chunk_all()

