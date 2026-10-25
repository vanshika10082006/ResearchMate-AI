"""
app.py
------
ResearchMate AI - Flask backend entry point.

Endpoints:
  POST /api/upload            -> upload + process a PDF, returns document_id
  POST /api/ask                -> RAG question answering
  POST /api/summarize          -> document summary
  POST /api/keywords           -> keyword extraction
  POST /api/citations          -> citation analysis
  POST /api/research-gaps      -> research gap identification
  POST /api/future-work        -> future work suggestions
  POST /api/flashcards         -> flashcard generation
  POST /api/glossary           -> glossary generation
  POST /api/title              -> title extraction
  POST /api/similar-papers     -> find similar papers via Semantic Scholar
"""

import os
import re
from pathlib import Path
import uuid
import requests
from dotenv import load_dotenv

# Load .env explicitly from backend folder and parent
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from document_processor import process_pdf
from vector_store import DocumentVectorStore
import llm_engine
from skills import registry as skills_registry
from scholar_api import search_related_papers
from connectors import arxiv_connector, url_connector, semantic_connector

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

import json

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["https://researchmate-ai-two.vercel.app/"]
        }
    },
)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
STORAGE_FOLDER = os.path.join(os.path.dirname(__file__), "storage")
PDF_FOLDER = os.path.join(STORAGE_FOLDER, "pdfs")
META_FILE = os.path.join(STORAGE_FOLDER, "documents_meta.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STORAGE_FOLDER, exist_ok=True)
os.makedirs(PDF_FOLDER, exist_ok=True)

# In-memory store: document_id -> {"store": DocumentVectorStore, "sample": str, "filename": str, "chunks": list}
DOCUMENTS = {}


def _save_meta():
    try:
        data = {}
        for doc_id, info in DOCUMENTS.items():
            data[doc_id] = {
                "filename": info.get("filename"),
                "sample": info.get("sample"),
                "chunks": info.get("chunks", []),
            }
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[Storage] Error saving metadata: {e}")


def _load_stored_documents():
    if not os.path.exists(META_FILE):
        return
    try:
        with open(META_FILE, "r", encoding="utf-8") as f:
            meta = json.load(f)
        for doc_id, info in meta.items():
            index_path = os.path.join(STORAGE_FOLDER, f"{doc_id}.faiss")
            chunks = info.get("chunks", [])
            if os.path.exists(index_path) and chunks:
                try:
                    store = DocumentVectorStore.load(index_path, chunks)
                    DOCUMENTS[doc_id] = {
                        "store": store,
                        "sample": info.get("sample", ""),
                        "filename": info.get("filename", "document.pdf"),
                        "chunks": chunks,
                    }
                except Exception as err:
                    print(f"[Storage] Failed to load index for {doc_id}: {err}")
        print(f"[Storage] Successfully restored {len(DOCUMENTS)} document(s) from disk.")
    except Exception as e:
        print(f"[Storage] Error restoring documents: {e}")


# Load any previously saved documents upon startup
# _load_stored_documents()


@app.route("/api/documents", methods=["GET"])
def list_documents():
    docs = []
    for doc_id, info in DOCUMENTS.items():
        fname = info.get("filename", "document.pdf")
        clean_title = fname
        if " [" in fname and fname.endswith("]"):
            clean_title = fname.split(" [")[0]
        docs.append({
            "id": doc_id,
            "document_id": doc_id,
            "filename": fname,
            "title": clean_title,
            "numChunks": len(info.get("chunks", [])),
            "fileSize": "Indexed",
            "uploadedAt": "Saved",
        })
    return jsonify({"documents": docs})


@app.route("/api/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    if doc_id not in DOCUMENTS:
        return jsonify({"error": "Document not found"}), 404

    DOCUMENTS.pop(doc_id)
    index_path = os.path.join(STORAGE_FOLDER, f"{doc_id}.faiss")
    pdf_path = os.path.join(PDF_FOLDER, f"{doc_id}.pdf")
    try:
        if os.path.exists(index_path):
            os.remove(index_path)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        _save_meta()
        return jsonify({"message": "Document deleted", "document_id": doc_id})
    except OSError as e:
        return jsonify({"error": f"Document removed from memory but storage cleanup failed: {e}"}), 500


from flask import send_file

@app.route("/api/documents/<doc_id>/pdf", methods=["GET"])
def get_document_pdf(doc_id):
    if doc_id not in DOCUMENTS:
        return jsonify({"error": "Document not found"}), 404
        
    pdf_path = os.path.join(PDF_FOLDER, f"{doc_id}.pdf")
    if os.path.exists(pdf_path):
        return send_file(pdf_path, mimetype="application/pdf")
        
    # Check if it's an arXiv paper and auto-fetch
    doc_info = DOCUMENTS[doc_id]
    sample = doc_info.get("sample", "")
    filename = doc_info.get("filename", "")
    
    arxiv_id = None
    m = re.search(r"arXiv ID:\s*([0-9v.]+)", sample, re.IGNORECASE)
    if m:
        arxiv_id = m.group(1).replace(".pdf", "")
    else:
        m2 = re.search(r"([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)", filename)
        if m2:
            arxiv_id = m2.group(1).replace(".pdf", "")
            
    if arxiv_id:
        try:
            arxiv_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
            resp = requests.get(arxiv_url, headers=headers, timeout=25)
            if resp.status_code == 200 and resp.content[:4] == b"%PDF":
                with open(pdf_path, "wb") as f:
                    f.write(resp.content)
                return send_file(pdf_path, mimetype="application/pdf")
        except Exception as e:
            print(f"[PDF Fetch] Failed to download arXiv PDF: {e}")

    return jsonify({"error": "PDF file not found locally", "has_pdf": False}), 404


@app.route("/api/documents/<doc_id>/content", methods=["GET"])
def get_document_content(doc_id):
    if doc_id not in DOCUMENTS:
        return jsonify({"error": "Document not found"}), 404
    
    doc = DOCUMENTS[doc_id]
    return jsonify({
        "document_id": doc_id,
        "filename": doc.get("filename"),
        "chunks": doc.get("chunks", []),
        "sample": doc.get("sample", "")
    })

@app.route("/api/upload", methods=["POST"])
def upload_document():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    doc_id = str(uuid.uuid4())
    save_path = os.path.join(PDF_FOLDER, f"{doc_id}.pdf")
    file.save(save_path)

    try:
        chunks = process_pdf(save_path)
        if not chunks:
            if os.path.exists(save_path):
                os.remove(save_path)
            return jsonify({"error": "Could not extract any text from this PDF"}), 422

        store = DocumentVectorStore(chunks)
        index_file = os.path.join(STORAGE_FOLDER, f"{doc_id}.faiss")
        store.save(index_file)

        DOCUMENTS[doc_id] = {
            "store": store,
            "sample": " ".join(chunks[:6]),  # first ~5-6 chunks as a representative sample
            "filename": filename,
            "chunks": chunks,
        }
        _save_meta()

        return jsonify({
            "document_id": doc_id,
            "filename": filename,
            "num_chunks": len(chunks),
        })
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        print(f"Error during upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


def _get_document_or_404(doc_id):
    doc = DOCUMENTS.get(doc_id)
    if doc is None:
        return None
    return doc


@app.route("/api/compare", methods=["POST"])
def compare_papers():
    data = request.get_json(force=True)
    doc_a_id = data.get("document_a_id")
    doc_b_id = data.get("document_b_id")
    model = data.get("model", "auto")
    language = data.get("language", "English")

    doc_a = _get_document_or_404(doc_a_id)
    doc_b = _get_document_or_404(doc_b_id)
    if not doc_a or not doc_b:
        return jsonify({"error": "One or both documents not found."}), 404

    system_prompt = "You are an expert AI research assistant. Your task is to compare two research papers and generate a comprehensive side-by-side analysis."
    user_prompt = f"""Compare the following two research papers based on their text samples.

Paper A (Filename: {doc_a['filename']}):
{doc_a['sample']}

Paper B (Filename: {doc_b['filename']}):
{doc_b['sample']}

Generate a side-by-side analysis strictly covering:
- Problem focus
- Architecture and methodology
- Key findings
- Strengths and differences

Format the output cleanly in Markdown."""

    try:
        response = llm_engine._ask_litellm(system_prompt, user_prompt, model, language=language)
        return jsonify({"comparison": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ask", methods=["POST"])
def ask_question():
    data = request.get_json(force=True)
    # Support multiple document IDs for cross-document query
    doc_ids = data.get("document_ids", [])
    if not doc_ids and "document_id" in data and data["document_id"]:
        doc_ids = [data["document_id"]]
        
    question = data.get("question", "").strip()
    notes = data.get("notes", [])
    language = data.get("language", "English")

    if not doc_ids:
        return jsonify({"error": "No documents specified."}), 400
    if not question:
        return jsonify({"error": "Question is required"}), 400

    results = []
    # Search across all requested documents
    for d_id in doc_ids:
        doc = _get_document_or_404(d_id)
        if doc is None:
            continue
            
        doc_results = doc["store"].search_with_indices(question, top_k=3)
        # Append paper title to chunks for context
        for r in doc_results:
            r["document_id"] = d_id
            r["paper_title"] = (
                doc.get("title")
                or doc.get("filename")
                or d_id
            )
            # Prefix text with paper title so LLM knows where it came from
            r["text_for_llm"] = f"[From Paper: {r['paper_title']}]\n{r['text']}"
            results.append(r)

    if not results and not notes:
        return jsonify({"error": "No documents or notes found to search."}), 404

    # Sort results by score across all documents
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:6] # Top 6 across all docs

    relevant_chunks = [r["text_for_llm"] for r in results]
    model = data.get("model", "auto")
    answer = llm_engine.answer_question(question, relevant_chunks, model=model, notes=notes, language=language)

    source_chunks = []
    for r in results:
        source_chunks.append({
            "chunk_index": r["chunk_index"],
            "page_number": r["chunk_index"] + 1,
            "text_snippet": r["text"][:150].strip(),
            "paper_title": r["paper_title"],
            "document_id": r["document_id"]
        })

    return jsonify({
        "answer": answer,
        "sources_used": len(relevant_chunks),
        "source_chunks": source_chunks,
    })


@app.route("/api/summarize", methods=["POST"])
def summarize():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    language = data.get("language", "English")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"summary": llm_engine.summarize_document(doc["sample"], model=model, language=language)})


@app.route("/api/keywords", methods=["POST"])
def keywords():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    language = data.get("language", "English")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"keywords": llm_engine.extract_keywords(doc["sample"], model=model, language=language)})


@app.route("/api/citations", methods=["POST"])
def citations():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    language = data.get("language", "English")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"citations": llm_engine.analyze_citations(doc["sample"], model=model, language=language)})


@app.route("/api/research-gaps", methods=["POST"])
def research_gaps():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    language = data.get("language", "English")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"research_gaps": llm_engine.identify_research_gaps(doc["sample"], model=model, language=language)})


@app.route("/api/future-work", methods=["POST"])
def future_work():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    language = data.get("language", "English")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"future_work": llm_engine.suggest_future_work(doc["sample"], model=model, language=language)})


@app.route("/api/flashcards", methods=["POST"])
def flashcards():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"flashcards": llm_engine.generate_flashcards(doc["sample"], model=model)})


@app.route("/api/glossary", methods=["POST"])
def glossary():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"glossary": llm_engine.generate_glossary(doc["sample"], model=model)})


@app.route("/api/title", methods=["POST"])
def title():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"title": llm_engine.extract_title(doc["sample"], model=model)})


@app.route("/api/similar-papers", methods=["POST"])
def similar_papers():
    data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    # First extract the title, then search for similar papers
    paper_title = llm_engine.extract_title(doc["sample"], model=model)
    results = search_related_papers(paper_title, limit=5)
    return jsonify({"similar_papers": results, "query_title": paper_title})



# --- Skills & Plugins Endpoints ---

@app.route("/api/skills", methods=["GET"])
def get_skills():
    skills = skills_registry.list_skills()
    return jsonify({"skills": skills})

@app.route("/api/skills/upload", methods=["POST"])
def upload_skill():
    try:
        skill_data = request.get_json(force=True)
        if not skill_data.get("name") or not skill_data.get("system_prompt"):
            return jsonify({"error": "Missing required fields (name, system_prompt)"}), 400
        
        saved_skill = skills_registry.save_skill(skill_data)
        return jsonify({"message": "Skill uploaded successfully", "skill": saved_skill})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/skills/run", methods=["POST"])
def run_skill():
    data = request.get_json(force=True)
    doc_id = data.get("document_id")
    skill_id = data.get("skill_id")
    model = data.get("model", "auto")
    
    doc = _get_document_or_404(doc_id)
    if doc is None:
        return jsonify({"error": "Document not found"}), 404
        
    skill = skills_registry.get_skill(skill_id)
    if skill is None:
        return jsonify({"error": "Skill not found"}), 404
        
    try:
        sample_text = doc.get("sample", "")
        custom_query = data.get("custom_query", "").strip()
        # Format the user prompt using the template
        template = skill.get("user_prompt_template", "{sample}")
        user_prompt = template.replace("{sample}", sample_text)
        if custom_query:
            user_prompt += f"\n\nUser specific question / instruction: {custom_query}"
        
        # We can reuse _ask_litellm from llm_engine to run custom system/user prompts!
        result = llm_engine._ask_litellm(skill.get("system_prompt"), user_prompt, model)
        return jsonify({"result": result, "skill_name": skill.get("name")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- End Skills & Plugins Endpoints ---

# ─── Connector Endpoints ──────────────────────────────────────────────────────

def _ingest_chunks(title: str, chunks: list, source_label: str) -> dict:
    """
    Shared helper: takes text chunks, builds a VectorStore, persists to disk,
    registers the document in DOCUMENTS{} and saves metadata.
    Returns the document record suitable for JSON response.
    """
    doc_id = str(uuid.uuid4())
    store = DocumentVectorStore(chunks)
    index_file = os.path.join(STORAGE_FOLDER, f"{doc_id}.faiss")
    store.save(index_file)

    DOCUMENTS[doc_id] = {
        "store": store,
        "sample": " ".join(chunks[:6]),
        "filename": f"{title[:80]} [{source_label}]",
        "chunks": chunks,
    }
    _save_meta()

    return {
        "document_id": doc_id,
        "filename": DOCUMENTS[doc_id]["filename"],
        "num_chunks": len(chunks),
        "title": title,
        "source": source_label,
    }


@app.route("/api/connectors/arxiv/search", methods=["POST"])
def arxiv_search():
    """Search arXiv by keyword. Returns a list of papers (no import yet)."""
    data = request.get_json(force=True)
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"error": "query is required"}), 400
    try:
        results = arxiv_connector.search(query, limit=6)
        return jsonify({"results": results})
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500


@app.route("/api/connectors/arxiv/import", methods=["POST"])
def arxiv_import():
    """
    Import a paper from arXiv by ID or keyword.
    Body: { "arxiv_id": "1706.03762" }
    """
    data = request.get_json(force=True)
    arxiv_id = data.get("arxiv_id", "").strip()
    if not arxiv_id:
        return jsonify({"error": "arxiv_id is required"}), 400

    try:
        paper = arxiv_connector.fetch_by_id(arxiv_id)
        title, chunks = arxiv_connector.build_chunks_from_abstract(paper)
        if not chunks:
            return jsonify({"error": "Could not extract any text from arXiv abstract"}), 422
        record = _ingest_chunks(title, chunks, "arXiv")
        record["authors"] = paper.get("authors", [])
        record["year"] = paper.get("year")
        record["abstract_preview"] = paper.get("abstract", "")[:300]
        return jsonify(record)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"arXiv import failed: {e}"}), 500


@app.route("/api/connectors/url/import", methods=["POST"])
def url_import():
    """
    Import a webpage by URL.
    Body: { "url": "https://..." }
    Returns a warning field if content is sparse.
    """
    data = request.get_json(force=True)
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "url is required"}), 400
    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "url must start with http:// or https://"}), 400

    try:
        scraped = url_connector.scrape_url(url)
        title, chunks = url_connector.build_chunks_from_url(scraped)
        if not chunks:
            return jsonify({
                "error": "No usable text could be extracted from this URL.",
                "warning": scraped.get("warning"),
            }), 422

        record = _ingest_chunks(title, chunks, "Web")
        record["warning"] = scraped.get("warning")
        return jsonify(record)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"URL import failed: {e}"}), 500


@app.route("/api/connectors/semantic/search", methods=["POST"])
def semantic_search():
    """Search Semantic Scholar. Returns paper list (no import yet)."""
    data = request.get_json(force=True)
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"error": "query is required"}), 400
    try:
        results = semantic_connector.search(query, limit=6)
        return jsonify({"results": results})
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Semantic Scholar search failed: {e}"}), 500


@app.route("/api/connectors/semantic/import", methods=["POST"])
def semantic_import():
    """
    Import a paper from Semantic Scholar by its data payload.
    Body: { "paper": { title, authors, year, abstract, ... } }
    """
    data = request.get_json(force=True)
    paper = data.get("paper")
    if not paper or not paper.get("title"):
        return jsonify({"error": "paper object with title is required"}), 400

    try:
        title, chunks = semantic_connector.build_chunks_from_paper(paper)
        if not chunks:
            return jsonify({"error": "No usable text in this paper's abstract"}), 422
        record = _ingest_chunks(title, chunks, "Semantic Scholar")
        record["authors"] = paper.get("authors", [])
        record["year"] = paper.get("year")
        record["abstract_preview"] = paper.get("abstract", "")[:300]
        return jsonify(record)
    except Exception as e:
        return jsonify({"error": f"Semantic Scholar import failed: {e}"}), 500

# ─── End Connector Endpoints ──────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)

