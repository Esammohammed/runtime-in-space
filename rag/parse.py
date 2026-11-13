"""Generic PDF parser for the Runtime-in-Space RAG system.

Extracts text from every PDF in the data directory, page by page,
using pdfplumber.  Outputs a flat list of section dicts compatible
with the chunking step.
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import pdfplumber

import config


def extract_pdf_sections(pdf_path: Path) -> List[Dict[str, Any]]:
    """Extract text from a single PDF, one section per page.

    Returns a list of dicts:
        {source, filename, page, text}
    """
    filename = pdf_path.name
    source = pdf_path.stem  # e.g. "Hypoxia"
    sections: List[Dict[str, Any]] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                sections.append({
                    "source": source,
                    "filename": filename,
                    "page": page_num,
                    "text": text.strip(),
                })

    return sections


def parse_all() -> List[Dict[str, Any]]:
    """Parse every PDF in the data directory and return all sections."""
    data_dir = config.DATA_DIR
    pdf_files = sorted(data_dir.glob(config.PDF_GLOB))

    if not pdf_files:
        raise FileNotFoundError(
            f"No PDF files found in {data_dir}. "
            f"Check RAG_DATA_DIR in your .env or config.py."
        )

    all_sections: List[Dict[str, Any]] = []
    for pdf_path in pdf_files:
        print(f"  Parsing: {pdf_path.name} ...", end=" ")
        sections = extract_pdf_sections(pdf_path)
        print(f"{len(sections)} pages extracted.")
        all_sections.extend(sections)

    # Save sections.json for inspection / debugging
    output_path = config.SECTIONS_FILE
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(all_sections)} total sections to {output_path}")

    return all_sections


if __name__ == "__main__":
    sections = parse_all()
    print(f"\nDone. Total sections: {len(sections)}")

