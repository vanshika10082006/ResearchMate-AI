"""
connectors/url_connector.py
-----------------------------
Scrapes a given URL and converts the page to plain text for indexing.
Uses html2text for clean markdown-like conversion.
Shows a warning if the scrape produces too little usable text (paywalled / JS-heavy).
"""

import re
import urllib.request
import urllib.error

try:
    import html2text
    HTML2TEXT_AVAILABLE = True
except ImportError:
    HTML2TEXT_AVAILABLE = False

from html.parser import HTMLParser


MIN_USABLE_CHARS = 400  # Pages below this threshold get a scrape warning


class _FallbackHTMLParser(HTMLParser):
    """Very minimal HTML stripper used if html2text is not installed."""
    def __init__(self):
        super().__init__()
        self._parts = []
        self._skip_tags = {"script", "style", "noscript", "head"}
        self._in_skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._skip_tags:
            self._in_skip += 1

    def handle_endtag(self, tag):
        if tag in self._skip_tags and self._in_skip > 0:
            self._in_skip -= 1

    def handle_data(self, data):
        if self._in_skip == 0:
            stripped = data.strip()
            if stripped:
                self._parts.append(stripped)

    def get_text(self):
        return "\n".join(self._parts)


def _extract_title_from_html(html: str) -> str:
    """Extract <title> tag contents from raw HTML."""
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip()
    return "Imported Web Page"


def scrape_url(url: str) -> dict:
    """
    Fetches and converts a URL to plain text.

    Returns:
        {
            "title": str,
            "text": str,
            "url": str,
            "warning": str | None,    # Set if content is sparse or likely paywalled
            "source": "url"
        }

    Raises ValueError on network errors.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; ResearchMateBot/1.0; "
            "+https://researchmate.ai)"
        ),
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                raise ValueError(
                    f"URL returned unsupported content type: {content_type}. "
                    "Only HTML and plain text pages are supported."
                )
            raw_bytes = resp.read()
    except urllib.error.HTTPError as e:
        raise ValueError(
            f"HTTP {e.code} error fetching URL. "
            "The page may require login or block automated access."
        )
    except urllib.error.URLError as e:
        raise ValueError(f"Could not reach URL: {e.reason}")
    except Exception as e:
        raise ValueError(f"Failed to fetch URL: {e}")

    # Decode
    try:
        raw_html = raw_bytes.decode("utf-8", errors="replace")
    except Exception:
        raw_html = raw_bytes.decode("latin-1", errors="replace")

    title = _extract_title_from_html(raw_html)

    # Convert HTML → readable text
    if HTML2TEXT_AVAILABLE:
        h = html2text.HTML2Text()
        h.ignore_links = True
        h.ignore_images = True
        h.ignore_emphasis = False
        h.body_width = 0
        text = h.handle(raw_html)
    else:
        parser = _FallbackHTMLParser()
        parser.feed(raw_html)
        text = parser.get_text()

    # Clean up excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    warning = None
    if len(text) < MIN_USABLE_CHARS:
        warning = (
            f"⚠️ Only {len(text)} characters were extracted from this URL. "
            "The page may be paywalled, JavaScript-rendered (SPA), or require authentication. "
            "Try a direct abstract URL or an open-access mirror instead."
        )

    return {
        "title": title,
        "text": text,
        "url": url,
        "warning": warning,
        "source": "url",
    }


def build_chunks_from_url(scraped: dict) -> tuple[str, list[str]]:
    """
    Build document-ready chunks from scraped URL content.
    Returns (display_title, chunks)
    """
    from document_processor import clean_text, chunk_text
    full_text = f"Source URL: {scraped['url']}\n\nTitle: {scraped['title']}\n\n{scraped['text']}"
    cleaned = clean_text(full_text)
    chunks = chunk_text(cleaned, chunk_size=900, overlap=150)
    return scraped["title"], chunks
