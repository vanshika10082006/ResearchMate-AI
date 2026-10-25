"""
mcp_server.py
-------------
Model Context Protocol (MCP) server for ResearchMate AI.
Allows Claude (Claude Desktop, Claude Code), Cursor, and other MCP-compatible
LLM clients to query, search, and analyze research papers indexed in ResearchMate AI.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load environment variables
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")
load_dotenv()

from mcp.server.mcpserver import MCPServer
from vector_store import DocumentVectorStore
import llm_engine

STORAGE_FOLDER = BACKEND_DIR / "storage"
META_FILE = STORAGE_FOLDER / "documents_meta.json"

# In-memory cache of loaded vector stores
_STORES_CACHE = {}

def _load_meta() -> dict:
    """Load metadata of all indexed documents from disk."""
    if not META_FILE.exists():
        return {}
    try:
        with open(META_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[MCP Server] Error loading meta.json: {e}", file=sys.stderr)
        return {}

def _get_store(doc_id: str, chunks: list[str]) -> DocumentVectorStore:
    """Retrieve or load cached DocumentVectorStore for a given document."""
    if doc_id in _STORES_CACHE:
        return _STORES_CACHE[doc_id]
    
    index_path = str(STORAGE_FOLDER / f"{doc_id}.faiss")
    store = DocumentVectorStore.load(index_path, chunks)
    _STORES_CACHE[doc_id] = store
    return store

# Initialize the MCP Server instance
mcp = MCPServer(
    name="ResearchMate AI",
    instructions=(
        "ResearchMate AI provides deep search, retrieval-augmented generation (RAG), "
        "and analytical synthesis across academic research papers. Use the provided tools "
        "to list papers, perform semantic search, answer questions grounded in literature, "
        "extract keywords, and identify research gaps."
    )
)

@mcp.tool()
def list_papers() -> list[dict]:
    """
    List all academic research papers currently indexed in the ResearchMate AI library.
    Returns metadata for each paper including document_id, filename, clean title, and chunk count.
    """
    meta = _load_meta()
    papers = []
    for doc_id, info in meta.items():
        fname = info.get("filename", "document.pdf")
        clean_title = fname
        if " [" in fname and fname.endswith("]"):
            clean_title = fname.split(" [")[0]
        chunks = info.get("chunks", [])
        papers.append({
            "document_id": doc_id,
            "filename": fname,
            "title": clean_title,
            "total_chunks": len(chunks),
            "sample_snippet": info.get("sample", "")[:280] + ("..." if len(info.get("sample", "")) > 280 else "")
        })
    return papers

@mcp.tool()
def search_papers(query: str, paper_id: str = "", top_k: int = 5) -> list[dict]:
    """
    Perform dense semantic vector search across indexed research papers.
    
    Args:
        query: The topic, phrase, or question to search for in the papers.
        paper_id: Optional ID of a specific paper to search within. If omitted or empty, searches across all indexed papers.
        top_k: Number of most relevant passages to return (default: 5).
    """
    meta = _load_meta()
    if not meta:
        return []

    target_docs = [paper_id] if paper_id and paper_id in meta else list(meta.keys())
    results = []

    for did in target_docs:
        doc_info = meta.get(did)
        if not doc_info or not doc_info.get("chunks"):
            continue

        store = _get_store(did, doc_info["chunks"])
        matches = store.search_with_indices(query, top_k=top_k)
        
        fname = doc_info.get("filename", "document.pdf")
        clean_title = fname.split(" [")[0] if " [" in fname and fname.endswith("]") else fname

        for m in matches:
            results.append({
                "document_id": did,
                "paper_title": clean_title,
                "filename": fname,
                "chunk_index": m["chunk_index"],
                "page_number": m["chunk_index"] + 1,
                "score": round(m["score"], 4),
                "text": m["text"].strip()
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]

@mcp.tool()
def ask_paper(question: str, paper_id: str = "", model: str = "auto") -> dict:
    """
    Ask a research question and get an evidence-grounded answer citing the papers.
    Uses ResearchMate's vector retrieval (RAG) and LLM synthesis.
    
    Args:
        question: The question to answer based on the papers.
        paper_id: Optional ID of a specific paper. If omitted, searches across all papers in the library.
        model: Model preset to use ('auto', 'fast', 'groq', 'reasoning'). Defaults to 'auto'.
    """
    meta = _load_meta()
    if not meta:
        return {"error": "No indexed documents found in ResearchMate library."}

    target_docs = [paper_id] if paper_id and paper_id in meta else list(meta.keys())
    results = []

    for did in target_docs:
        doc_info = meta.get(did)
        if not doc_info or not doc_info.get("chunks"):
            continue

        store = _get_store(did, doc_info["chunks"])
        matches = store.search_with_indices(question, top_k=4)
        fname = doc_info.get("filename", "document.pdf")
        clean_title = fname.split(" [")[0] if " [" in fname and fname.endswith("]") else fname

        for m in matches:
            results.append({
                "score": m["score"],
                "paper_title": clean_title,
                "document_id": did,
                "chunk_index": m["chunk_index"],
                "text": m["text"],
                "text_for_llm": f"[From Paper: {clean_title} (Page/Section ~{m['chunk_index']+1})]\n{m['text']}"
            })

    if not results:
        return {"error": "No relevant context found to answer the question."}

    results.sort(key=lambda x: x["score"], reverse=True)
    top_matches = results[:6]
    relevant_chunks = [r["text_for_llm"] for r in top_matches]

    answer = llm_engine.answer_question(question, relevant_chunks, model=model)

    sources = [
        {
            "paper_title": r["paper_title"],
            "document_id": r["document_id"],
            "chunk_index": r["chunk_index"],
            "page_number": r["chunk_index"] + 1,
            "snippet": r["text"][:160].strip() + "..."
        }
        for r in top_matches
    ]

    return {
        "answer": answer,
        "sources_count": len(sources),
        "sources": sources
    }

@mcp.tool()
def summarize_paper(paper_id: str, model: str = "auto") -> dict:
    """
    Generate a comprehensive 150-200 word academic summary of an indexed research paper.
    
    Args:
        paper_id: The document_id of the paper to summarize (use list_papers to find IDs).
        model: Model preset to use ('auto', 'fast', 'groq', 'reasoning').
    """
    meta = _load_meta()
    doc_info = meta.get(paper_id)
    if not doc_info:
        return {"error": f"Paper with ID '{paper_id}' not found."}

    sample_text = doc_info.get("sample", "")
    if not sample_text and doc_info.get("chunks"):
        sample_text = " ".join(doc_info["chunks"][:6])

    summary = llm_engine.summarize_document(sample_text, model=model)
    return {
        "document_id": paper_id,
        "filename": doc_info.get("filename", ""),
        "summary": summary
    }

@mcp.tool()
def get_paper_insights(paper_id: str, insight_type: str = "all") -> dict:
    """
    Extract structured research insights from a paper including research gaps, future work recommendations, citation analysis, and technical keywords.
    
    Args:
        paper_id: The document_id of the paper.
        insight_type: One of 'all', 'gaps', 'future_work', 'citations', 'keywords'.
    """
    meta = _load_meta()
    doc_info = meta.get(paper_id)
    if not doc_info:
        return {"error": f"Paper with ID '{paper_id}' not found."}

    sample_text = doc_info.get("sample", "")
    if not sample_text and doc_info.get("chunks"):
        sample_text = " ".join(doc_info["chunks"][:6])

    insights = {
        "document_id": paper_id,
        "filename": doc_info.get("filename", "")
    }

    itype = insight_type.lower().strip()
    if itype in ("all", "keywords"):
        insights["keywords"] = llm_engine.extract_keywords(sample_text)
    if itype in ("all", "gaps"):
        insights["research_gaps"] = llm_engine.identify_research_gaps(sample_text)
    if itype in ("all", "future_work"):
        insights["future_work"] = llm_engine.suggest_future_work(sample_text)
    if itype in ("all", "citations"):
        insights["citations"] = llm_engine.analyze_citations(sample_text)

    return insights

@mcp.tool()
def compare_papers(paper_id_a: str, paper_id_b: str, model: str = "auto") -> dict:
    """
    Perform a comparative analysis between two research papers covering problem focus,
    methodology, key findings, and trade-offs.
    
    Args:
        paper_id_a: The document_id of the first paper.
        paper_id_b: The document_id of the second paper.
        model: Model preset to use ('auto', 'fast', 'groq', 'reasoning').
    """
    meta = _load_meta()
    doc_a = meta.get(paper_id_a)
    doc_b = meta.get(paper_id_b)

    if not doc_a:
        return {"error": f"Paper A ({paper_id_a}) not found."}
    if not doc_b:
        return {"error": f"Paper B ({paper_id_b}) not found."}

    sample_a = doc_a.get("sample", "") or " ".join(doc_a.get("chunks", [])[:6])
    sample_b = doc_b.get("sample", "") or " ".join(doc_b.get("chunks", [])[:6])

    comparison_prompt = f"""You are an expert academic peer reviewer. Compare these two scientific papers:

Paper A: {doc_a.get('filename')}
Content excerpt:
{sample_a[:2500]}

---

Paper B: {doc_b.get('filename')}
Content excerpt:
{sample_b[:2500]}

Please provide a structured side-by-side comparative analysis covering:
1. Core Problem & Objective Focus
2. Technical Methodology & Architecture Comparison
3. Key Findings & Performance Highlights
4. Relative Strengths, Limitations, and Trade-offs
"""
    system_prompt = "You are an expert scientific researcher and academic reviewer."
    analysis = llm_engine._ask_litellm(system_prompt, comparison_prompt, model_preset=model)

    return {
        "paper_a": doc_a.get("filename"),
        "paper_b": doc_b.get("filename"),
        "comparison": analysis
    }

@mcp.resource("paper://catalog")
def get_library_catalog() -> str:
    """Read full catalog of all indexed research papers."""
    meta = _load_meta()
    catalog = []
    for did, info in meta.items():
        catalog.append(f"- **{info.get('filename')}** (ID: `{did}`, Chunks: {len(info.get('chunks', []))})")
    return "\n".join(catalog) if catalog else "No papers currently in library."

@mcp.prompt()
def review_paper(paper_id: str) -> str:
    """Prompt Claude to conduct a rigorous academic peer review of a paper."""
    meta = _load_meta()
    doc = meta.get(paper_id, {})
    title = doc.get("filename", paper_id)
    return (
        f"Please perform a thorough peer review of the paper '{title}' (ID: {paper_id}). "
        f"Use `summarize_paper` and `get_paper_insights` to examine its methodology, soundness, "
        f"and research gaps, then provide an evaluation of its scientific contribution."
    )

if __name__ == "__main__":
    # Run the MCP server over standard input/output (stdio transport for Claude Desktop / Cursor)
    mcp.run(transport="stdio")
