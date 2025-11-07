# utils.py
from datetime import datetime
import numpy as np
from database import collection
from ai_client import gemini_embedding

def retrieve_user_context(
    user_id: str, 
    query: str, 
    k: int = 5,
    min_similarity: float = 0.65,
    max_context_length: int = 2000,
    recency_weight: float = 0.2,
    allowed_types: list = None,
    deduplicate: bool = True
):
    """
    Optimized context retrieval with anti-overfitting measures:
    - Similarity threshold filtering (only relevant docs)
    - Recency weighting (prioritize recent context)
    - Context length limits (prevent token bloat)
    - Type filtering (only relevant document types)
    - Deduplication (remove similar documents)
    """
    # Build where clause with user_id and optional type filter
    where_clause = {"user_id": user_id}
    if allowed_types:
        where_clause["type"] = {"$in": allowed_types}
    
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
    
    # Return top k most relevant documents
    return docs[:k]


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

