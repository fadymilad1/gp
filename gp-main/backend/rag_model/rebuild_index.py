"""
Rebuild the FAISS index from existing meta.json using proper SentenceTransformer embeddings.

The old index was built with 16-dim hash-based pseudo-embeddings (fallback from broken
HuggingFace API path). This script re-embeds all texts with the real all-MiniLM-L6-v2
model (384-dim) and saves a proper FAISS L2 index.

Usage:
    python manage.py shell < rag_model/rebuild_index.py
    OR
    cd backend && python -c "import django; django.setup(); exec(open('rag_model/rebuild_index.py').read())"
"""
import json
import os
import sys

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medify_backend.settings')

# Only call setup if not already configured
try:
    django.setup()
except RuntimeError:
    pass

import faiss
import numpy as np
from django.conf import settings
from rag_model.services.local_models import embed_texts

DATA_DIR = os.path.join(settings.BASE_DIR, 'rag_model', 'data')
META_PATH = os.path.join(DATA_DIR, 'meta.json')
INDEX_PATH = os.path.join(DATA_DIR, 'faiss.index')

def rebuild():
    print(f"Loading metadata from {META_PATH} ...")
    with open(META_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    print(f"Found {len(metadata)} chunks. Embedding with SentenceTransformer ...")
    texts = [m.get('text', '') for m in metadata]

    # Embed in batches to avoid memory issues
    batch_size = 32
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embs = embed_texts(batch)
        all_embeddings.extend(embs)
        print(f"  Embedded {min(i + batch_size, len(texts))}/{len(texts)} chunks")

    embeddings_np = np.array(all_embeddings, dtype='float32')
    dim = embeddings_np.shape[1]
    print(f"Embedding dimension: {dim}")

    # Build FAISS L2 index (matches services/vector_store.py expectation)
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings_np)

    print(f"Saving new FAISS index ({index.ntotal} vectors, {dim}-dim) to {INDEX_PATH} ...")
    faiss.write_index(index, INDEX_PATH)

    print("Done! Index rebuilt successfully.")
    print(f"  Vectors: {index.ntotal}")
    print(f"  Dimension: {dim}")
    print(f"  Index type: IndexFlatL2")


if __name__ == '__main__':
    rebuild()
else:
    rebuild()
