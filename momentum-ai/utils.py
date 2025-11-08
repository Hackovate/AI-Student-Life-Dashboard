# utils.py
from datetime import datetime
import numpy as np
from database import collection
from ai_client import gemini_embedding

# Lazy import for reranker (only load when needed)
_reranker = None

def _get_reranker():
    """Lazy load reranker to avoid loading on import"""
    global _reranker
    if _reranker is None:
        try:
            from sentence_transformers import CrossEncoder
            _reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            print("Reranker model loaded successfully")
        except ImportError:
            print("Warning: sentence-transformers not installed. Reranking disabled.")
            print("Install with: pip install sentence-transformers")
            _reranker = False  # Mark as unavailable
    return _reranker

def retrieve_user_context(
    user_id: str, 
    query: str, 
    k: int = 5,
    min_similarity: float = 0.65,
    max_context_length: int = 2000,
    recency_weight: float = 0.2,
    allowed_types: list = None,
    deduplicate: bool = True,
    use_reranking: bool = True
):
    """
    Optimized context retrieval with anti-overfitting measures:
    - Similarity threshold filtering (only relevant docs)
    - Recency weighting (prioritize recent context)
    - Context length limits (prevent token bloat)
    - Type filtering (only relevant document types)
    - Deduplication (remove similar documents)
    - Reranking (cross-encoder for better relevance, if enabled)
    """
    # Build where clause with user_id and optional type filter
    # ChromaDB requires $and operator when combining multiple conditions
    if allowed_types:
        where_clause = {
            "$and": [
                {"user_id": user_id},
                {"type": {"$in": allowed_types}}
            ]
        }
    else:
        where_clause = {"user_id": user_id}
    
    # Get more candidates than needed for filtering
    q_emb = gemini_embedding([query])[0]
    res = collection.query(
        query_embeddings=[q_emb],
        n_results=k * 3,  # Get 3x for filtering down
        where=where_clause
    )
    
    docs = []
    now = datetime.now()
    total_length = 0
    
    # Process results with similarity and recency scoring
    for doc_text, meta, distance in zip(
        res['documents'][0],
        res['metadatas'][0],
        res['distances'][0]
    ):
        # Convert distance to similarity (ChromaDB uses cosine distance)
        # Distance: 0 = identical, 2 = opposite
        # Similarity: 1 = identical, 0 = opposite
        similarity = 1 - distance
        
        # Filter by similarity threshold - only include relevant docs
        if similarity < min_similarity:
            continue
        
        # Calculate recency score (exponential decay)
        recency_score = 1.0
        timestamp_str = meta.get('timestamp', '')
        if timestamp_str:
            try:
                # Parse timestamp (handle both with and without timezone)
                doc_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                if doc_time.tzinfo:
                    doc_time = doc_time.replace(tzinfo=None)
                days_old = (now - doc_time).days
                # Exponential decay: newer = higher score
                # Documents older than 30 days get lower scores
                recency_score = max(0.1, 1.0 / (1 + days_old / 30))
            except Exception:
                # If timestamp parsing fails, use default score
                pass
        
        # Combined score: weighted average of similarity and recency
        combined_score = (1 - recency_weight) * similarity + recency_weight * recency_score
        
        # Check context length limit to prevent token bloat
        if total_length + len(doc_text) > max_context_length:
            break
        
        docs.append({
            "text": doc_text,
            "meta": meta,
            "similarity": similarity,
            "recency_score": recency_score,
            "combined_score": combined_score
        })
        total_length += len(doc_text)
    
    # Sort by combined score (highest first)
    docs.sort(key=lambda x: x['combined_score'], reverse=True)
    
    # Deduplicate if requested (remove very similar documents)
    if deduplicate and len(docs) > 1:
        docs = _deduplicate_context(docs)
    
    # Rerank documents for better relevance (if reranker is available and enabled)
    if use_reranking:
        docs = _rerank_documents(query, docs, top_k=k * 2)  # Rerank more than needed
    
    # Include adjacent chunks from same document for better context continuity
    # This helps when a chunk is relevant but needs surrounding context
    docs = _include_adjacent_chunks(docs, user_id, max_context_length, total_length)
    
    # Return top k most relevant documents
    return docs[:k]


def _rerank_documents(query: str, docs: list, top_k: int = 10) -> list:
    """
    Rerank retrieved documents using cross-encoder for better relevance.
    This improves retrieval quality by using a more sophisticated ranking model.
    
    Args:
        query: The user's query
        docs: List of document dictionaries with 'text' key
        top_k: Number of top documents to return after reranking
    
    Returns:
        Reranked list of documents
    """
    if not docs or len(docs) <= 1:
        return docs
    
    reranker = _get_reranker()
    
    # If reranker is not available, return original docs
    if reranker is False or reranker is None:
        return docs
    
    try:
        # Create query-document pairs for reranking
        pairs = [[query, doc['text']] for doc in docs]
        
        # Get relevance scores from cross-encoder
        # Higher score = more relevant
        scores = reranker.predict(pairs)
        
        # Combine documents with scores
        doc_scores = list(zip(docs, scores))
        
        # Sort by score (descending - highest relevance first)
        doc_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Update combined_score in documents with rerank score
        # Blend original combined_score (80%) with rerank score (20%)
        reranked_docs = []
        for doc, rerank_score in doc_scores[:top_k]:
            # Normalize rerank score to 0-1 range (cross-encoder scores can vary)
            normalized_rerank = max(0, min(1, (rerank_score + 1) / 2))  # Rough normalization
            
            # Blend scores: 80% original, 20% rerank
            original_score = doc.get('combined_score', 0.5)
            blended_score = 0.8 * original_score + 0.2 * normalized_rerank
            
            doc['rerank_score'] = float(rerank_score)
            doc['combined_score'] = blended_score
            reranked_docs.append(doc)
        
        return reranked_docs
        
    except Exception as e:
        print(f"Error during reranking: {e}")
        # Return original docs if reranking fails
        return docs


def _deduplicate_context(docs: list, similarity_threshold: float = 0.95):
    """
    Remove duplicate or very similar documents using embedding similarity.
    Prevents overcontext from redundant information.
    """
    if len(docs) <= 1:
        return docs
    
    # Get embeddings for all documents
    texts = [d['text'] for d in docs]
    embeddings = gemini_embedding(texts)
    
    unique_docs = [docs[0]]  # Always keep first (highest score)
    
    for i, doc in enumerate(docs[1:], 1):
        is_duplicate = False
        emb_i = np.array(embeddings[i])
        
        # Check similarity with already included documents
        for unique_doc in unique_docs:
            unique_idx = docs.index(unique_doc)
            emb_unique = np.array(embeddings[unique_idx])
            
            # Calculate cosine similarity
            dot_product = np.dot(emb_i, emb_unique)
            norm_i = np.linalg.norm(emb_i)
            norm_unique = np.linalg.norm(emb_unique)
            
            if norm_i > 0 and norm_unique > 0:
                similarity = dot_product / (norm_i * norm_unique)
                
                # If very similar, skip this document
                if similarity > similarity_threshold:
                    is_duplicate = True
                    break
        
        if not is_duplicate:
            unique_docs.append(doc)
    
    return unique_docs


def determine_optimal_k(user_message: str) -> int:
    """
    Determine how many documents to retrieve based on query complexity.
    Prevents overcontext for simple queries.
    """
    message_lower = user_message.lower()
    
    # Simple queries need minimal context
    simple_keywords = ['hi', 'hello', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'bye']
    if any(kw in message_lower for kw in simple_keywords):
        return 2
    
    # Complex queries need more context
    complex_keywords = ['explain', 'how', 'why', 'what is', 'compare', 'analyze', 'describe', 'tell me about']
    if any(kw in message_lower for kw in complex_keywords):
        return 7
    
    # Medium complexity - default
    return 5


def determine_context_types(user_message: str) -> list:
    """
    Determine which document types are relevant based on user query.
    Prevents retrieving irrelevant context types.
    """
    message_lower = user_message.lower()
    
    # Skill/learning related queries
    if any(kw in message_lower for kw in ['skill', 'learn', 'study', 'course', 'subject']):
        return ["context", "onboarding", "chat"]
    
    # Planning/scheduling related queries
    if any(kw in message_lower for kw in ['plan', 'schedule', 'task', 'todo', 'routine', 'daily']):
        return ["plan", "context", "onboarding"]
    
    # Personal information queries
    if any(kw in message_lower for kw in ['name', 'call me', 'preference', 'like', 'dislike']):
        return ["context", "onboarding"]
    
    # General queries - prioritize important context
    return ["context", "onboarding"]


def _include_adjacent_chunks(docs: list, user_id: str, max_context_length: int, current_length: int):
    """
    Include adjacent chunks from the same document for better context continuity.
    When a chunk from a multi-chunk document is retrieved, try to include its neighbors.
    This is a simplified version that works with the chunks already retrieved.
    """
    if not docs:
        return docs
    
    # Group chunks by source document
    chunked_docs = {}  # source_doc_id -> dict of chunk_index -> doc
    standalone_docs = []  # Documents that aren't chunks
    
    for doc in docs:
        source_id = doc['meta'].get('source_doc_id')
        chunk_idx = doc['meta'].get('chunk_index')
        is_chunk = doc['meta'].get('is_chunk', False)
        
        if is_chunk and source_id and chunk_idx is not None:
            if source_id not in chunked_docs:
                chunked_docs[source_id] = {}
            chunked_docs[source_id][chunk_idx] = doc
        else:
            standalone_docs.append(doc)
    
    enhanced_docs = list(standalone_docs)  # Start with non-chunked docs
    total_length = current_length
    
    # For each source document with chunks, try to include adjacent chunks
    for source_id, chunks_dict in chunked_docs.items():
        if not chunks_dict:
            continue
        
        # Get sorted chunk indices
        chunk_indices = sorted(chunks_dict.keys())
        
        # For each retrieved chunk, try to include adjacent chunks
        for chunk_idx in chunk_indices:
            doc = chunks_dict[chunk_idx]
            
            # Add the main chunk if not already added
            if doc not in enhanced_docs:
                enhanced_docs.append(doc)
                total_length += len(doc['text'])
            
            # Try to get previous chunk by ID
            if chunk_idx > 0:
                prev_chunk_id = f"{source_id}_chunk_{chunk_idx - 1}"
                try:
                    prev_results = collection.get(ids=[prev_chunk_id])
                    if prev_results and 'documents' in prev_results and prev_results['documents']:
                        prev_text = prev_results['documents'][0]
                        prev_meta = prev_results.get('metadatas', [{}])[0] if prev_results.get('metadatas') else {}
                        
                        # Check if we can add it without exceeding limits
                        if total_length + len(prev_text) <= max_context_length:
                            prev_doc = {
                                "text": prev_text,
                                "meta": prev_meta,
                                "similarity": 0.75,  # Slightly lower score for adjacent chunks
                                "recency_score": 1.0,
                                "combined_score": 0.75
                            }
                            if prev_doc not in enhanced_docs:
                                enhanced_docs.append(prev_doc)
                                total_length += len(prev_text)
                except Exception:
                    pass  # If chunk doesn't exist, skip
            
            # Try to get next chunk by ID
            next_chunk_id = f"{source_id}_chunk_{chunk_idx + 1}"
            try:
                next_results = collection.get(ids=[next_chunk_id])
                if next_results and 'documents' in next_results and next_results['documents']:
                    next_text = next_results['documents'][0]
                    next_meta = next_results.get('metadatas', [{}])[0] if next_results.get('metadatas') else {}
                    
                    # Check if we can add it without exceeding limits
                    if total_length + len(next_text) <= max_context_length:
                        next_doc = {
                            "text": next_text,
                            "meta": next_meta,
                            "similarity": 0.75,  # Slightly lower score for adjacent chunks
                            "recency_score": 1.0,
                            "combined_score": 0.75
                        }
                        if next_doc not in enhanced_docs:
                            enhanced_docs.append(next_doc)
                            total_length += len(next_text)
            except Exception:
                pass  # If chunk doesn't exist, skip
            
            # Stop if we've exceeded context length
            if total_length >= max_context_length:
                break
    
    # Sort by combined_score to maintain relevance order
    enhanced_docs.sort(key=lambda x: x.get('combined_score', 0), reverse=True)
    
    return enhanced_docs


def summarize_long_context(context_text: str, max_length: int = 1000) -> str:
    """
    Summarize context if too long to avoid token bloat.
    Uses intelligent truncation: keeps beginning and end, removes middle.
    """
    if len(context_text) <= max_length:
        return context_text
    
    # For very long context, take first and last parts
    # This preserves important context from both ends
    half = max_length // 2
    return f"{context_text[:half]}...\n[Context truncated for efficiency]\n...{context_text[-half:]}"

