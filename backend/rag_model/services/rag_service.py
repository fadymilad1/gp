import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
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


_SENTENCE_STARTER_STOPWORDS = {"i", "is", "are", "do", "does", "can", "what", "which", "tell"}
_LOWERCASE_NAME_PATTERN = re.compile(r"(?:about|for|is)\s+([a-zA-Z][a-zA-Z\-]{2,})\b", re.IGNORECASE)


def _extract_candidate_drug_name(query: str) -> Optional[str]:
    """
    Best-effort, local (no API call) extraction of a medicine name mentioned in a
    free-text question, e.g. "Tell me about Panadol" -> "Panadol".

    Returns None when no plausible medicine name can be identified (a vague/generic
    question) so callers can fall through to the normal grounded-generation flow.
    """
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9\-]*", query)

    candidate_tokens: List[str] = []
    for index, token in enumerate(tokens):
        is_capitalized = token[0].isupper()
        is_sentence_starter = index == 0 or token.lower() in _SENTENCE_STARTER_STOPWORDS
        if is_capitalized and not is_sentence_starter:
            candidate_tokens.append(token)
        elif candidate_tokens:
            # Stop joining as soon as the run of capitalized tokens ends.
            break

    if candidate_tokens:
        candidate = " ".join(candidate_tokens)
    else:
        match = _LOWERCASE_NAME_PATTERN.search(query)
        candidate = match.group(1) if match else None

    if not candidate:
        return None

    candidate = candidate.strip().strip(".,!?;:-").rstrip("'s").strip()
    return candidate or None


def _drug_field_matches_candidate(candidate: str, retrieved: List[Tuple[Dict[str, Any], float]]) -> bool:
    """
    Name-anchored overlap check: does the candidate medicine name share any token
    with the 'drug' metadata field of any retrieved chunk? This is deliberately
    separate from _calculate_keyword_overlap, which scores free text for reranking
    rather than checking a specific structured name field.
    """
    candidate_tokens = set(re.findall(r"\w+", candidate.lower()))
    if not candidate_tokens:
        return False

    for meta, _dist in retrieved:
        drug_name = meta.get("drug") or (meta.get("meta") or {}).get("brand_name") or ""
        drug_tokens = set(re.findall(r"\w+", drug_name.lower()))
        if candidate_tokens & drug_tokens:
            return True
    return False


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

    # Deterministic "not found" gate: if the question names a specific medicine
    # (e.g. "Tell me about Panadol") and none of the retrieved chunks' drug names
    # share any token with it, return a fixed template instead of letting the LLM
    # free-write an inconsistent "I don't have that" answer. Skipped entirely for
    # vague/generic questions where no candidate name can be extracted.
    candidate_name = _extract_candidate_drug_name(query)
    if candidate_name and not _drug_field_matches_candidate(candidate_name, retrieved):
        logger.info(f"Deterministic not-found gate triggered for candidate '{candidate_name}'.")
        return {
            "answer": (
                f"Sorry, we couldn't find any information about {candidate_name} in our records. "
                "Please check the spelling, or ask your pharmacist for more details.\n\n"
                "This is not medical advice."
            ),
            "sources": [],
            "model": "gemini-api",
            "confidence_score": 0.0,
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
