"""CLI entry point for the Runtime-in-Space RAG system.

Usage:
    python main.py ingest          # Parse PDFs → chunk → embed → index
    python main.py query "..."     # Ask a question
    python main.py query           # Interactive query loop
"""

import sys

import config


def cmd_ingest():
    """Full ingestion pipeline: parse → chunk → build index."""
    print("=" * 60)
    print("STEP 1 / 3 — Parsing PDFs")
    print("=" * 60)
    from parse import parse_all
    sections = parse_all()

    print()
    print("=" * 60)
    print("STEP 2 / 3 — Chunking")
    print("=" * 60)
    from chunk import chunk_all
    chunks = chunk_all(sections)

    print()
    print("=" * 60)
    print("STEP 3 / 3 — Embedding & Indexing")
    print("=" * 60)
    from index import build_index
    build_index(chunks)

    print()
    print("=" * 60)
    print(f"Done. {len(chunks)} chunks indexed in {config.CHROMA_DIR}")
    print("Run:  python main.py query \"your question\"")
    print("=" * 60)


def cmd_query(question: str | None = None):
    """Query the RAG system."""
    from generate import ask

    if question:
        _print_result(ask(question))
        return

    # Interactive loop
    print("Interactive mode — type 'exit' to quit.\n")
    while True:
        q = input("Question> ").strip()
        if not q or q.lower() in ("exit", "quit", "q"):
            break
        _print_result(ask(q))
        print()


def _print_result(result: dict):
    """Pretty-print an answer with its sources."""
    print(f"\nAnswer:\n{result['answer']}\n")
    print("Sources:")
    for i, c in enumerate(result["chunks"], 1):
        fname = c.get("filename", "")
        page = c.get("page", "?")
        score = c.get("score", "")
        score_str = f"  score={score:.3f}" if isinstance(score, float) else ""
        snippet = c.get("text", "").replace("\n", " ")[:120]
        print(f"  [{i}] {fname} p.{page}{score_str}")
        print(f"      {snippet}…")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "ingest":
        cmd_ingest()
    elif command == "query":
        question = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None
        cmd_query(question)
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()

