"""
connectors/semantic_connector.py
----------------------------------
Searches the Semantic Scholar Graph API and returns paper metadata + abstract.
Includes automatic fallback to OpenAlex (100% free, 250M+ open papers) if
Semantic Scholar returns a 429 rate limit.
"""

import os
import requests

SS_API = "https://api.semanticscholar.org/graph/v1/paper/search"
SS_FIELDS = "title,authors,year,abstract,externalIds,url,publicationTypes"
OPENALEX_API = "https://api.openalex.org/works"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}


def _get_api_key():
    return os.environ.get("SEMANTIC_SCHOLAR_API_KEY") or os.environ.get("S2_API_KEY")


def search(query: str, limit: int = 6) -> list[dict]:
    """
    Search Semantic Scholar for papers matching `query`.
    Falls back to OpenAlex if rate-limited (HTTP 429).
    """
    params = {
        "query": query,
        "limit": limit,
        "fields": SS_FIELDS,
    }
    headers = dict(HEADERS)
    api_key = _get_api_key()
    if api_key:
        headers["x-api-key"] = api_key

    try:
        resp = requests.get(SS_API, params=params, headers=headers, timeout=12)
        if resp.status_code == 429:
            # Fallback to OpenAlex
            print("[Semantic Scholar] Rate limited (429), falling back to OpenAlex...")
            return _search_openalex(query, limit)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"[Semantic Scholar API Error] {e}. Falling back to OpenAlex...")
        return _search_openalex(query, limit)

    results = []
    for paper in data.get("data", []):
        authors = [a.get("name", "") for a in paper.get("authors", [])]
        external_ids = paper.get("externalIds") or {}
        arxiv_id = external_ids.get("ArXiv")
        abstract = (paper.get("abstract") or "").strip()

        results.append({
            "title": (paper.get("title") or "Untitled").strip(),
            "authors": authors[:4],
            "year": paper.get("year"),
            "abstract": abstract,
            "arxiv_id": arxiv_id,
            "url": paper.get("url") or "",
            "source": "semantic_scholar",
        })

    if not results:
        # Try OpenAlex if SS returned 0 results
        return _search_openalex(query, limit)

    return results


def _search_openalex(query: str, limit: int = 6) -> list[dict]:
    """OpenAlex open academic API fallback."""
    params = {
        "search": query,
        "per-page": limit,
    }
    try:
        resp = requests.get(OPENALEX_API, params=params, headers=HEADERS, timeout=12)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        raise ValueError(f"Failed to search papers: {e}")

    results = []
    for work in data.get("results", []):
        title = work.get("title") or "Untitled"
        year = work.get("publication_year")
        authors = [
            auth.get("author", {}).get("display_name", "")
            for auth in work.get("authorships", [])
            if auth.get("author", {}).get("display_name")
        ]
        
        # OpenAlex inverted index abstract reconstruction
        abstract = ""
        inv_index = work.get("abstract_inverted_index")
        if inv_index:
            try:
                words = {}
                for word, positions in inv_index.items():
                    for pos in positions:
                        words[pos] = word
                abstract = " ".join(words[pos] for pos in sorted(words.keys()))
            except Exception:
                abstract = ""

        doi_url = work.get("doi") or work.get("id") or ""

        results.append({
            "title": title,
            "authors": authors[:4],
            "year": year,
            "abstract": abstract,
            "arxiv_id": None,
            "url": doi_url,
            "source": "openalex",
        })

    if not results:
        raise ValueError("No papers found for this query.")

    return results


def build_chunks_from_paper(paper: dict) -> tuple[str, list[str]]:
    """
    Build document-ready chunks from a paper's abstract.
    Returns (display_title, chunks)
    """
    from document_processor import clean_text, chunk_text

    authors_str = ", ".join(paper.get("authors", []))
    full_text = (
        f"Title: {paper['title']}\n\n"
        f"Authors: {authors_str}\n\n"
        f"Year: {paper.get('year', 'Unknown')}\n\n"
        f"Source: {paper.get('source', 'Academic Index')}\n\n"
        f"Abstract:\n{paper.get('abstract', 'No abstract available.')}"
    )
    cleaned = clean_text(full_text)
    chunks = chunk_text(cleaned, chunk_size=600, overlap=100)
    return paper["title"], chunks
