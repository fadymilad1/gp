import logging
from typing import Iterable

import numpy as np
from huggingface_hub import InferenceClient
from django.conf import settings

logger = logging.getLogger(__name__)


class LocalModelClient:
    def __init__(self, model_id: str | None = None):
        token = getattr(settings, 'HUGGINGFACE_API_TOKEN', '')
        if not token:
            raise RuntimeError('HUGGINGFACE_API_TOKEN not configured for LocalModelClient')
        self.client = InferenceClient(api_key=token)
        self.model_id = model_id or getattr(settings, 'HF_MEDICAL_MODEL_ID', 'microsoft/Phi-3-mini-4k-instruct')

    def generate(self, prompt: str, max_new_tokens: int = 512, temperature: float = 0.2) -> str:
        try:
            # Try chat completions endpoint (conversational task)
            chat_api = getattr(self.client, 'chat', None)
            completions_api = getattr(chat_api, 'completions', None) if chat_api else None
            create_api = getattr(completions_api, 'create', None) if completions_api else None
            if callable(create_api):
                resp = create_api(model=self.model_id, messages=[{'role': 'user', 'content': prompt}], max_tokens=max_new_tokens, temperature=float(temperature))
                try:
                    choices = getattr(resp, 'choices', None)
                    if choices and len(choices) > 0:
                        first = choices[0]
                        message = getattr(first, 'message', None)
                        if message:
                            content = getattr(message, 'content', None)
                            if content:
                                return content.strip()
                except Exception:
                    pass
                # fallback to str
                return str(resp).strip() if resp else ''
        except Exception as exc:
            logger.exception('LocalModelClient.generate failed: %s', exc)
        # best effort fallback
        return ''

    def embed_texts(self, texts: Iterable[str]) -> list[list[float]]:
        # Use HF embeddings if available via InferenceClient embeddings endpoint
        try:
            # Some HF router models provide an embeddings endpoint
            resp = self.client.embeddings(list(texts))
            vectors = [v['embedding'] if isinstance(v, dict) and 'embedding' in v else v for v in resp]
            arr = np.array(vectors, dtype=np.float32)
            # normalize to unit length (L2) for cosine similarity via inner product
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms
            return arr.tolist()
        except Exception:
            # fallback: simple hashing-based pseudo-embedding for offline dev (not for prod)
            out = []
            for t in texts:
                h = abs(hash(t)) % (10 ** 8)
                vec = [(h >> (i * 8)) & 255 for i in range(16)]
                arr = np.array(vec, dtype=np.float32)
                arr = arr / (np.linalg.norm(arr) + 1e-10)
                out.append(arr.tolist())
            return out
