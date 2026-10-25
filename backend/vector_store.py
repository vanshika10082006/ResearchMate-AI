"""
vector_store.py
----------------
Handles embedding generation (semantic vectors) and storage/retrieval
using Google Gemini API and NumPy for lightweight, memory-efficient search.
"""

import os
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load .env
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")
load_dotenv()

def _get_api_key():
    keys = ["GEMINI_API_KEY", "GEMINI_KEY", "API_KEY"]
    for k in keys:
        if os.environ.get(k):
            return os.environ.get(k).strip().strip('"').strip("'")
    return None

def get_embeddings(texts: list[str]) -> np.ndarray:
    """Generate embeddings using Gemini API and return as normalized numpy array."""
    api_key = _get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Cannot generate embeddings.")
    
    genai.configure(api_key=api_key)
    
    # Process in batches if there are many chunks (Gemini handles max 100 at a time, but to be safe we do smaller batches)
    batch_size = 50
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = genai.embed_content(
            model="models/gemini-embedding-001",
            content=batch,
            task_type="retrieval_document"
        )
        embeddings = response['embedding']
        all_embeddings.extend(embeddings)
        
    vectors = np.array(all_embeddings, dtype=np.float32)
    # Normalize vectors for cosine similarity via dot product
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors = vectors / np.maximum(norms, 1e-10)
    return vectors

def get_query_embedding(query: str) -> np.ndarray:
    """Generate a single embedding for a search query."""
    api_key = _get_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Cannot generate embeddings.")
    
    genai.configure(api_key=api_key)
    response = genai.embed_content(
        model="models/gemini-embedding-001",
        content=query,
        task_type="retrieval_query"
    )
    vector = np.array(response['embedding'], dtype=np.float32)
    norm = np.linalg.norm(vector)
    vector = vector / max(norm, 1e-10)
    return vector

class DocumentVectorStore:
    """
    One instance per uploaded document. Stores its chunks, their embeddings,
    and performs fast similarity search using NumPy.
    """

    def __init__(self, chunks: list[str], embeddings_array: np.ndarray = None):
        self.chunks = chunks
        if embeddings_array is not None:
            self.embeddings = embeddings_array
        else:
            if not chunks:
                self.embeddings = np.array([])
            else:
                self.embeddings = get_embeddings(chunks)

    def save(self, file_path: str):
        """Save embeddings to disk as a NumPy file. (Ignoring the .faiss extension)"""
        # Save directly to file_path so app.py's os.path.exists works
        with open(file_path, 'wb') as f:
            np.save(f, self.embeddings)

    @classmethod
    def load(cls, file_path: str, chunks: list[str]):
        """Load embeddings from disk, with caching for instant reload."""
        npy_cache_path = f"{file_path}.npy"
        if os.path.exists(npy_cache_path):
            try:
                with open(npy_cache_path, 'rb') as f:
                    embeddings_array = np.load(f, allow_pickle=True)
                return cls(chunks, embeddings_array=embeddings_array)
            except Exception:
                pass

        try:
            with open(file_path, 'rb') as f:
                header = f.read(4)
            if header == b'\x93NUM':
                with open(file_path, 'rb') as f:
                    embeddings_array = np.load(f, allow_pickle=True)
                return cls(chunks, embeddings_array=embeddings_array)
        except Exception:
            pass

        # Re-compute embeddings and cache to .npy
        instance = cls(chunks)
        try:
            if instance.embeddings.size > 0:
                with open(npy_cache_path, 'wb') as f:
                    np.save(f, instance.embeddings)
        except Exception:
            pass
        return instance

    def search(self, query: str, top_k: int = 4) -> list[str]:
        """Return the top_k most relevant chunks for a given query."""
        if len(self.chunks) == 0 or self.embeddings.size == 0:
            return []
            
        query_vec = get_query_embedding(query)
        # Cosine similarity is just dot product for normalized vectors
        scores = np.dot(self.embeddings, query_vec)
        
        # Get top_k indices
        top_k = min(top_k, len(self.chunks))
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            results.append(self.chunks[idx])
        return results

    def search_with_indices(self, query: str, top_k: int = 4) -> list[dict]:
        """Return the top_k most relevant chunks with their indices and scores."""
        if len(self.chunks) == 0 or self.embeddings.size == 0:
            return []
            
        query_vec = get_query_embedding(query)
        scores = np.dot(self.embeddings, query_vec)
        
        top_k = min(top_k, len(self.chunks))
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            results.append({
                "chunk_index": int(idx),
                "text": self.chunks[idx],
                "score": float(scores[idx]),
            })
        return results
