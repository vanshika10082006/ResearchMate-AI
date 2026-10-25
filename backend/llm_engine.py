"""
llm_engine.py
-------------
Wraps calls to a mix of LLMs (Gemini, Groq, DeepSeek, etc.) using litellm
for RAG-based question answering, summarization, etc.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory, project root, and current working directory
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")
load_dotenv()

# We import litellm, but wrap it in try/except so if it's not installed yet, it won't instantly crash
try:
    from litellm import completion
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False
    import google.generativeai as genai

# Model presets
MODEL_PRESETS = {
    "auto": os.getenv("FAST_MODEL", "gemini/gemini-3.8-flash"),
    "fast": "gemini/gemini-3.8-flash",
    "groq": "groq/qwen/qwen3.8-27b",
    "reasoning": "deepseek/deepseek-chat" # or claude-3-5-sonnet, openai/gpt-4o
}

def _get_api_key(provider="GEMINI"):
    keys = [f"{provider}_API_KEY", f"{provider}_KEY", "API_KEY"]
    for k in keys:
        if os.environ.get(k):
            return os.environ.get(k).strip().strip('"').strip("'")
    return None

def _ask_litellm(system_prompt: str, user_prompt: str, model_preset: str = "auto", language: str = "English") -> str:
    if language and language.strip().lower() != "english":
        system_prompt += f" Please provide your entire response strictly in {language}."

    if not LITELLM_AVAILABLE:
        # Fallback to pure google genai if litellm not installed
        api_key = _get_api_key("GEMINI")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-3.8-flash")
        try:
            resp = model.generate_content(f"{system_prompt}\n\n{user_prompt}")
            return resp.text if hasattr(resp, "text") else "No response generated."
        except Exception as e:
            return f"API Error: {str(e)}"

    selected_model = MODEL_PRESETS.get(model_preset, model_preset if model_preset else MODEL_PRESETS["auto"])
    
    # Normalize model string if provider was omitted
    if "qwen3.6" in selected_model:
        selected_model = selected_model.replace("qwen3.6", "qwen3.8")
    if selected_model.startswith("qwen/"):
        selected_model = f"groq/{selected_model}"
    
    # If the provider is gemini but GEMINI_API_KEY is not strictly set in os.environ, we should set it for litellm
    if selected_model.startswith("gemini/") and not os.environ.get("GEMINI_API_KEY"):
        os.environ["GEMINI_API_KEY"] = _get_api_key("GEMINI") or ""

    if selected_model.startswith("groq/") and not os.environ.get("GROQ_API_KEY"):
        os.environ["GROQ_API_KEY"] = _get_api_key("GROQ") or ""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        response = completion(
            model=selected_model,
            messages=messages,
            temperature=0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[LLM Engine Error] Failed with {selected_model}: {e}")
        # Very simple fallback to Gemini
        try:
            fallback = completion(
                model="gemini/gemini-3.8-flash", 
                messages=messages, 
                temperature=0.2
            )
            return fallback.choices[0].message.content
        except Exception as fallback_err:
            return f"Error querying model: {str(e)} | Fallback failed: {str(fallback_err)}"

def answer_question(question: str, retrieved_chunks: list[str], model: str = "auto", notes: list[str] = None, language: str = "English") -> str:
    context = "\n\n---\n\n".join(retrieved_chunks)
    
    notes_context = ""
    if notes and len(notes) > 0:
        notes_context = "\n\nUser's Personal Notes & Highlights:\n" + "\n".join(f"- {note}" for note in notes)

    system_prompt = (
        "You are a research assistant. Answer the user's question using ONLY the "
        "provided context from the research paper(s) and the user's personal notes. "
        "If the answer is not in the context, say so clearly instead of guessing."
    )
    user_prompt = f"Context from the paper(s):\n{context}{notes_context}\n\nQuestion: {question}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def summarize_document(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You are a research assistant that writes concise, accurate summaries "
        "of academic papers for students and researchers."
    )
    user_prompt = f"Summarize the following research paper content in 150-200 words:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def extract_keywords(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You extract the most important technical keywords and key concepts "
        "from academic text. Return them as a comma-separated list only."
    )
    user_prompt = f"Extract 10-15 key terms from this text:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def analyze_citations(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You identify and summarize how a paper's citations/references are used, "
        "and what related work is mentioned, based on the visible text."
    )
    user_prompt = f"Analyze the citations and related work mentioned in this text:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def identify_research_gaps(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You are an expert reviewer who identifies unresolved problems, "
        "limitations, and open research gaps implied by a paper's content."
    )
    user_prompt = f"Identify potential research gaps in this paper:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def suggest_future_work(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You suggest concrete, actionable future research directions that "
        "naturally follow from a paper's content and limitations."
    )
    user_prompt = f"Suggest 4-6 future work directions based on this paper:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def generate_flashcards(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You are an expert tutor. Extract 5-10 key concepts from the text and create flashcards. "
        "Return ONLY a valid JSON array of objects, with no markdown formatting. "
        'Each object must have "question" and "answer" string properties.'
    )
    user_prompt = f"Create flashcards for this text:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def generate_glossary(full_text_sample: str, model: str = "auto", language: str = "English") -> str:
    system_prompt = (
        "You are a technical editor. Extract 10-15 complex terms or acronyms from the text and define them. "
        "Return ONLY a valid JSON array of objects, with no markdown formatting. "
        'Each object must have "term" and "definition" string properties.'
    )
    user_prompt = f"Create a glossary for this text:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model, language=language)

def extract_title(full_text_sample: str, model: str = "auto") -> str:
    system_prompt = (
        "Extract the main title of this research paper based on the text. "
        "Return ONLY the title string, nothing else. Do not wrap in quotes."
    )
    user_prompt = f"Text:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model)

def generate_concept_tree(full_text_sample: str, model: str = "auto") -> str:
    system_prompt = (
        "You are a data structurer. Create a hierarchical concept tree representing the core structure of this paper. "
        "Return ONLY a valid JSON object, with no markdown formatting. "
        'The JSON MUST have a root "name" (e.g., the paper topic), and a "children" array of objects. '
        'Each child can have a "name" and its own "children" array, up to 3 levels deep.'
    )
    user_prompt = f"Create a concept tree for this text:\n\n{full_text_sample}"
    return _ask_litellm(system_prompt, user_prompt, model)
