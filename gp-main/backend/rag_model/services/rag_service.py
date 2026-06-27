import json
import logging
import re
from typing import List, Dict, Any
from .local_models import generate_text
from .vector_store import VectorStoreSingleton

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Medify Pharmacy Assistant.
- Answer only from the brochure and openFDA context provided to you.
- If the information is not explicitly present in context, clearly state that the information is unavailable.
- Do not speculate medically or provide unverified information.
- Explain what the medicine is for, key warnings, pregnancy or breastfeeding notes, common side effects, and when to consult a pharmacist or doctor.
- Keep the response concise, practical, and friendly.
- Always end with: This is not medical advice."""

def _calculate_keyword_overlap(query: str, text: str) -> int:
    """Lightweight reranking metric using simple keyword overlap."""
    query_words = set(re.findall(r'\w+', query.lower()))
    text_words = set(re.findall(r'\w+', text.lower()))
    # Remove common stopwords for slightly better overlap matching
    stopwords = {"what", "is", "the", "are", "of", "and", "in", "to", "a", "for", "on", "does", "do"}
    query_words -= stopwords
    if not query_words:
        return 0
    return len(query_words.intersection(text_words))

def ask_rag(query: str) -> Dict[str, Any]:
    """
    RAG pipeline: Embed -> Search -> Rerank -> Build Context -> Generate
    """
    logger.info(f"Processing RAG query: {query}")
    
    # 1 & 2 & 3. Embed and Search FAISS vector store
    store = VectorStoreSingleton()
    # Fetch top 8 first, to allow for reranking down to top 4
    retrieved = store.search(query, top_k=8)
    
    if not retrieved:
        logger.warning("No chunks retrieved from vector store.")
        return {
            "answer": "There is not enough information available to answer this question.\n\nThis is not medical advice.",
            "sources": [],
            "model": "mistral-api",
            "confidence_score": 0.0
        }
        
    # Lightweight reranking based on keyword overlap
    # Sort by a combined metric: higher overlap is better, lower distance is better.
    # Since Faiss L2 distance on normalized vectors relates to cosine similarity (lower is better),
    # we can do: score = overlap_count - distance
    reranked = []
    for meta, dist in retrieved:
        overlap = _calculate_keyword_overlap(query, meta.get("text", ""))
        combined_score = overlap - dist
        reranked.append((combined_score, meta, dist))
        
    reranked.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [item for item in reranked[:4]]
    
    # Calculate a simple confidence score (0 to 1)
    # L2 distance on normalized vectors ranges from 0 to 4. 
    # Cosine similarity = 1 - (L2^2 / 2). Let's approximate a 0-1 score:
    best_dist = top_chunks[0][2]
    confidence_score = max(0.0, min(1.0, 1.0 - (best_dist / 4.0)))

    # 4. Build context prompt
    context_blocks = []
    sources = []
    
    for idx, (score, meta, dist) in enumerate(top_chunks):
        # Support both formats: new (drug/section) and legacy (source/meta.brand_name)
        drug = meta.get("drug") or (meta.get("meta", {}) or {}).get("brand_name") or "Unknown"
        section = meta.get("section") or meta.get("source") or "Unknown"
        text = meta.get("text", "")
        
        context_blocks.append(f"--- Context {idx + 1} ---\nDrug: {drug}\nSection: {section}\nInfo: {text}\n")
        sources.append({
            "drug": drug,
            "section": section,
            "snippet": text[:150] + "..." if len(text) > 150 else text
        })
        
    full_context = "\n".join(context_blocks)
    
    # Context length protection
    # Assuming Mistral has 8k context, we truncate full_context to roughly 20000 chars to be safe.
    max_context_chars = 20000
    if len(full_context) > max_context_chars:
        logger.warning("Context truncated to avoid exceeding model context limits.")
        full_context = full_context[:max_context_chars] + "\n[Context Truncated]"

    prompt = f"""{SYSTEM_PROMPT}

Context Information:
{full_context}

USER PROMPT: {query}"""

    # 5. Generate answer using Gemini API
    try:
        answer = generate_text(prompt=prompt, max_new_tokens=2048, temperature=0.1)
        
        # Ensure fallback message is present if the model forgot it
        if "not medical advice" not in answer.lower():
            answer += "\n\nThis is not medical advice."
            
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        answer = "I'm sorry, I encountered an error while trying to generate a response.\n\nThis is not medical advice."
        confidence_score = 0.0

    return {
        "answer": answer.strip(),
        "sources": sources,
        "model": "gemini-api",
        "confidence_score": round(confidence_score, 2)
    }
