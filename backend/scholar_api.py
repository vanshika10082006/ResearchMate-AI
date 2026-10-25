import requests

def search_related_papers(title: str, limit: int = 5):
    """
    Uses the Semantic Scholar API to find related papers based on a title.
    Returns a list of dictionaries with title, authors, year, and url.
    """
    url = f"https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": title,
        "limit": limit,
        "fields": "title,authors,year,url"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        results = []
        for paper in data.get("data", []):
            authors = [a["name"] for a in paper.get("authors", [])]
            results.append({
                "title": paper.get("title"),
                "authors": authors[:3], # Only keep top 3 authors
                "year": paper.get("year"),
                "url": paper.get("url")
            })
        return results
    except Exception as e:
        print(f"Error calling Semantic Scholar API: {e}")
        return []
