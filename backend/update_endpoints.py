import re
import os

filepath = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\backend\app.py'

with open(filepath, 'r') as f:
    code = f.read()

code = code.replace(
    'answer = llm_engine.answer_question(question, relevant_chunks)',
    'model = data.get("model", "auto")\n    answer = llm_engine.answer_question(question, relevant_chunks, model=model)'
)

def repl(m):
    return f'''data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    if doc is None:
        return jsonify({{"error": "Document not found. Upload a PDF first."}}), 404
    return jsonify({{"{m.group(1)}": llm_engine.{m.group(2)}(doc["sample"], model=model)}})'''

code = re.sub(
    r'doc = _get_document_or_404\(request\.get_json\(force=True\)\.get\(\"document_id\"\)\)\n\s+if doc is None:\n\s+return jsonify\(\{\"error\": \"Document not found\. Upload a PDF first\.\"\}\), 404\n\s+return jsonify\(\{\"(.*?)\": llm_engine\.(.*?)\(doc\[\"sample\"\]\)\}\)',
    repl,
    code
)

def repl_similar(m):
    return f'''data = request.get_json(force=True)
    doc = _get_document_or_404(data.get("document_id"))
    model = data.get("model", "auto")
    if doc is None:
        return jsonify({{"error": "Document not found. Upload a PDF first."}}), 404
    # First extract the title, then search for similar papers
    paper_title = llm_engine.extract_title(doc["sample"], model=model)
    results = search_related_papers(paper_title, limit=5)
    return jsonify({{"similar_papers": results, "query_title": paper_title}})'''

code = re.sub(
    r'doc = _get_document_or_404\(request\.get_json\(force=True\)\.get\(\"document_id\"\)\)\n\s+if doc is None:\n\s+return jsonify\(\{\"error\": \"Document not found\. Upload a PDF first\.\"\}\), 404\n\s+# First extract the title, then search for similar papers\n\s+paper_title = llm_engine\.extract_title\(doc\[\"sample\"\]\)\n\s+results = search_related_papers\(paper_title, limit=5\)\n\s+return jsonify\(\{\"similar_papers\": results, \"query_title\": paper_title\}\)',
    repl_similar,
    code
)

with open(filepath, 'w') as f:
    f.write(code)
