"""
connectors/arxiv_connector.py
-------------------------------
Fetches paper metadata and abstract from arXiv API.
No PDF download — abstract-only to keep it lightweight and zero disk footprint.
"""

import re
import requests
import xml.etree.ElementTree as ET


ARXIV_API = "https://export.arxiv.org/api/query"
ARXIV_NS = "http://www.w3.org/2005/Atom"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/atom+xml, application/xml, text/xml, */*",
}


def _parse_arxiv_id(raw: str) -> str:
    """Normalize arXiv ID: handles 'arxiv:1706.03762', URLs, or bare IDs."""
    raw = raw.strip()
    m = re.search(r"arxiv\.org/(?:abs|pdf)/([0-9v.]+)", raw, re.IGNORECASE)
    if m:
        return m.group(1).replace(".pdf", "")
    m = re.match(r"(?:arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)", raw, re.IGNORECASE)
    if m:
        return m.group(1)
    return raw


def fetch_by_id(arxiv_id: str) -> dict:
    """
    Fetch a single paper by arXiv ID.
    Returns: { title, authors, abstract, year, arxiv_id, source }
    """
    clean_id = _parse_arxiv_id(arxiv_id)
    params = {
        "id_list": clean_id,
        "max_results": 1,
    }

    try:
        resp = requests.get(ARXIV_API, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        xml_data = resp.content
    except Exception as e:
        raise ValueError(f"Failed to reach arXiv API: {e}")

    return _parse_arxiv_xml(xml_data, single=True)


def search(query: str, limit: int = 6) -> list[dict]:
    """
    Search arXiv by keyword query.
    Returns list of: { title, authors, abstract, year, arxiv_id, source }
    """
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": limit,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }

    try:
        resp = requests.get(ARXIV_API, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        xml_data = resp.content
    except Exception as e:
        raise ValueError(f"Failed to reach arXiv API: {e}")

    return _parse_arxiv_xml(xml_data, single=False)


def _parse_arxiv_xml(xml_data: bytes, single: bool) -> dict | list:
    root = ET.fromstring(xml_data)
    ns = {"atom": ARXIV_NS}

    entries = root.findall("atom:entry", ns)
    if not entries:
        raise ValueError("No papers found for this query or ID.")

    results = []
    for entry in entries:
        title_el = entry.find("atom:title", ns)
        summary_el = entry.find("atom:summary", ns)
        published_el = entry.find("atom:published", ns)
        id_el = entry.find("atom:id", ns)

        title = (title_el.text or "").strip().replace("\n", " ")
        abstract = (summary_el.text or "").strip().replace("\n", " ")
        year = (published_el.text or "")[:4] if published_el is not None else "Unknown"

        raw_id = (id_el.text or "").strip()
        arxiv_id_match = re.search(r"arxiv\.org/abs/(.+)", raw_id)
        arxiv_id = arxiv_id_match.group(1) if arxiv_id_match else raw_id

        authors = [
            (a.find("atom:name", ns).text or "")
            for a in entry.findall("atom:author", ns)
            if a.find("atom:name", ns) is not None
        ]

        results.append({
            "title": title,
            "authors": authors[:4],
            "abstract": abstract,
            "year": year,
            "arxiv_id": arxiv_id,
            "source": "arxiv",
        })

    return results[0] if single else results


def build_chunks_from_abstract(paper: dict) -> tuple[str, list[str]]:
    """
    Build a document-ready text and chunk list from abstract-only paper data.
    Returns (display_title, chunks)
    """
    authors_str = ", ".join(paper.get("authors", []))
    full_text = (
        f"Title: {paper['title']}\n\n"
        f"Authors: {authors_str}\n\n"
        f"Year: {paper.get('year', 'Unknown')}\n\n"
        f"arXiv ID: {paper.get('arxiv_id', '')}\n\n"
        f"Abstract:\n{paper['abstract']}"
    )
    from document_processor import clean_text, chunk_text
    cleaned = clean_text(full_text)
    chunks = chunk_text(cleaned, chunk_size=600, overlap=100)
    return paper["title"], chunks
