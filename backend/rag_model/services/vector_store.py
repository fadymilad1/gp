import json
import logging
import os
from typing import Any, Dict, List

import faiss
import numpy as np

from django.conf import settings

from rag_model.services.local_models import RAGModelError, embed_query, embed_texts

logger = logging.getLogger(__name__)

class VectorStoreSingleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStoreSingleton, cls).__new__(cls)
            cls._instance.index = None
            cls._instance.metadata = []
            cls._instance.dimension = getattr(settings, 'RAG_EMBEDDING_DIMENSION', 384)
            cls._instance.index_path = os.path.join(settings.BASE_DIR, 'data', 'faiss_index_minilm.bin')
            cls._instance.metadata_path = os.path.join(settings.BASE_DIR, 'data', 'faiss_metadata_minilm.json')
            cls._instance._load_index()
        return cls._instance

    def _load_index(self):
        """Loads the FAISS index and metadata if they exist."""
        try:
            if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
                self.index = faiss.read_index(self.index_path)
                with open(self.metadata_path, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors.")
            else:
                # Initialize empty FAISS index
                self.index = faiss.IndexFlatL2(self.dimension)
                self.metadata = []
                logger.info("Initialized new empty FAISS index.")
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {str(e)}")
            self.index = faiss.IndexFlatL2(self.dimension)
            self.metadata = []

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Add chunks to the index. 
        Each chunk must have 'text' and other metadata like 'drug', 'section'.
        """
        if not chunks:
            return

        texts = [chunk['text'] for chunk in chunks]
        
        try:
            embeddings = embed_texts(texts)
        except RAGModelError as exc:
            logger.warning(f'Cannot add chunks: {exc}')
            return

        if not embeddings:
            logger.warning('Cannot add chunks: no embeddings produced.')
            return

        if self.index.d != len(embeddings[0]):
            self.dimension = len(embeddings[0])
            self.index = faiss.IndexFlatL2(self.dimension)
            self.metadata = []

        embeddings_np = np.array(embeddings, dtype='float32')
        self.index.add(embeddings_np)
        self.metadata.extend(chunks)

    def save_index(self):
        """Saves the current index and metadata to disk."""
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        faiss.write_index(self.index, self.index_path)
        with open(self.metadata_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved FAISS index with {self.index.ntotal} vectors to {self.index_path}")

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Search for the top_k most similar chunks.
        """
        if self.index is None or self.index.ntotal == 0:
            self._load_index()

        if self.index.ntotal == 0:
            return []
            
        try:
            query_embedding = embed_query(query)
        except RAGModelError as exc:
            logger.error(f'RAG search failed: {exc}')
            return []

        query_np = np.array([query_embedding], dtype='float32')
        
        # FAISS search
        distances, indices = self.index.search(query_np, top_k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1 and idx < len(self.metadata):
                # distance thresholding can be added if needed
                results.append(self.metadata[idx])
                
        return results

# Expose a singleton instance
vector_store = VectorStoreSingleton()
