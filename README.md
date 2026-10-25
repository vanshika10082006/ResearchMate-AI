# ResearchMate AI

A Retrieval-Augmented Generation (RAG) system for intelligent research paper
analysis — upload a PDF and get summaries, keyword extraction, citation
analysis, research gap identification, future work suggestions, and
context-grounded question answering.

## Architecture

```
PDF Upload -> Text Extraction -> Preprocessing -> Chunking
           -> Embeddings (Sentence-BERT) -> FAISS Vector Store
Question   -> Embed Query -> Similarity Search -> Retrieved Chunks
           -> Claude API (context-grounded generation) -> Answer
```

- **Backend:** Flask (Python) — `backend/`
- **Frontend:** React + Vite — `frontend/`
- **Embeddings:** `sentence-transformers` (all-MiniLM-L6-v2, runs locally, no API cost)
- **Vector DB:** FAISS (in-memory, per-document)
- **LLM:** Claude (Anthropic API) — used for every generation step

## 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Git Bash/macOS/Linux
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Windows Command Prompt: .venv\Scripts\activate.bat
pip install -r requirements.txt

cp .env.example .env           # Git Bash/macOS/Linux
# Windows Command Prompt: copy .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
# Open .env and paste your Gemini API key
```

Run the server:

```bash
python app.py
```

The backend will start at `http://localhost:5000`. The first request will be
a bit slow — it downloads the embedding model (~90MB) the first time.

On Windows, after the first setup, you can run `backend\start_backend.bat`
from File Explorer or the terminal. It creates the environment if needed,
installs dependencies, checks for `.env`, and starts the backend.

## 2. Frontend Setup

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

## 3. Using the App

1. Upload a research paper (PDF).
2. Once processed, use the left-hand menu to:
   - **Ask a Question** — chat with the paper; answers are grounded in retrieved sections.
   - **Summary** — get a concise summary.
   - **Keywords** — extract key terms and concepts.
   - **Citation Analysis** — see how references/related work are used.
   - **Research Gaps** — identify open problems and limitations.
   - **Future Work** — get suggested next research directions.

## Notes for your synopsis / report

This implementation matches the methodology diagram:

- `document_processor.py` → Stage 1 (Document Processing Pipeline)
- `vector_store.py` → embeddings + vector database
- `llm_engine.py` + `/api/ask` in `app.py` → Stage 2 (RAG: retrieval + LLM generation)
- The five feature endpoints (`summarize`, `keywords`, `citations`,
  `research-gaps`, `future-work`) → Stage 3 (Research Assistance Features)

## Known limitations (good to mention in your report as "future work")

- Documents are stored in memory only — restarting the backend clears them.
- Single-PDF context per session (no multi-document comparison yet).
- No user accounts / persistence layer yet — could be added with a database.
