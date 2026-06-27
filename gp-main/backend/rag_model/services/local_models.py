import os
import time
import logging
from functools import lru_cache
import google.genai as genai
from google.genai import types
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class RAGModelError(Exception):
    """Raised when a RAG model operation (embedding or generation) fails."""
    pass


# Constants
EMBEDDING_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Loads and caches the embedding model.
    Uses SentenceTransformer to keep it simple and efficient.
    """
    logger.info(f"Loading embedding model: {EMBEDDING_MODEL_ID}")
    try:
        model = SentenceTransformer(EMBEDDING_MODEL_ID)
        logger.info("Embedding model loaded successfully.")
        return model
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        raise


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embeds a list of texts using the cached embedding model."""
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """Embeds a single query string."""
    model = get_embedding_model()
    embedding = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
    return embedding[0].tolist()


@lru_cache(maxsize=1)
def _get_gemini_client() -> genai.Client:
    """
    Initializes and caches the Gemini API client (google.genai SDK).
    """
    from decouple import config
    api_key = config("GEMINI_API_KEY", default="")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set in .env. RAG generation will fail.")
    client = genai.Client(api_key=api_key)
    logger.info("Gemini API client initialized.")
    return client


def generate_text(prompt: str, max_new_tokens: int = 2048, temperature: float = 0.2, max_retries: int = 3) -> str:
    """
    Generates text using the Gemini API (google.genai SDK) with retry/backoff.
    """
    client = _get_gemini_client()

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model="models/gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_new_tokens,
                    temperature=temperature,
                ),
            )
            return response.text
        except Exception as e:
            logger.warning(f"Gemini API attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(2 ** attempt)
            else:
                logger.error("Max retries reached for Gemini API generation.")
                raise
