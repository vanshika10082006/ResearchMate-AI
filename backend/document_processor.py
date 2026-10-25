"""
document_processor.py
----------------------
Handles Stage 1 of the pipeline: PDF -> raw text -> cleaned text -> chunks.
"""

import re
import pdfplumber


def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF file, page by page."""
    full_text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            full_text.append(page_text)
    return "\n".join(full_text)


def clean_text(raw_text: str) -> str:
    """Basic cleaning: collapse whitespace, drop stray page-number lines, etc."""
    text = re.sub(r"\s+", " ", raw_text)
    text = re.sub(r"(?i)page\s*\d+\s*of\s*\d+", "", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> list[str]:
    """
    Split cleaned text into overlapping chunks (character-based, sentence-aware).
    Overlap keeps context continuous across chunk boundaries for better retrieval.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            # start new chunk, carrying the overlap tail from the previous chunk
            overlap_text = current[-overlap:] if len(current) > overlap else current
            current = f"{overlap_text} {sentence}".strip()

    if current:
        chunks.append(current)

    return chunks


def process_pdf(file_path: str) -> list[str]:
    """Full Stage-1 pipeline: extract -> clean -> chunk."""
    raw = extract_text_from_pdf(file_path)
    cleaned = clean_text(raw)
    chunks = chunk_text(cleaned)
    return chunks
