# ai_client.py
from typing import List
import hashlib
from cachetools import TTLCache
from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL

# Initialize Google GenAI client
genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Embedding cache: Cache embeddings for 7 days (604800 seconds)
# Max 10,000 cached embeddings to prevent memory bloat
embedding_cache = TTLCache(maxsize=10000, ttl=604800)

# LLM response cache: Cache responses for 1 hour (3600 seconds)
# Max 1000 cached responses
llm_cache = TTLCache(maxsize=1000, ttl=3600)

def gemini_embedding(texts: List[str]) -> List[List[float]]:
    """
    Use genai embeddings API with caching to reduce API calls.
    Caches embeddings for 7 days to avoid regenerating same embeddings.
    """
    cached_results = {}
    uncached_texts = []
    uncached_indices = []
    
    # Check cache for each text
    for i, text in enumerate(texts):
        # Create cache key from text hash (normalize whitespace)
        normalized_text = ' '.join(text.split())
        cache_key = hashlib.md5(normalized_text.encode('utf-8')).hexdigest()
        
        if cache_key in embedding_cache:
            cached_results[i] = embedding_cache[cache_key]
        else:
            uncached_texts.append(text)
            uncached_indices.append(i)
    
    # Generate embeddings only for uncached texts
    if uncached_texts:
        try:
            res = genai_client.models.embed_content(
                model="text-embedding-004",
                contents=uncached_texts
            )
            # Extract embedding values from response
            new_embeddings = []
            for emb_obj in res.embeddings:
                if hasattr(emb_obj, 'values'):
                    new_embeddings.append(emb_obj.values)
                else:
                    # Fallback if structure is different
                    new_embeddings.append(list(emb_obj))
            
            # Cache the new embeddings
            for text, emb in zip(uncached_texts, new_embeddings):
                normalized_text = ' '.join(text.split())
                cache_key = hashlib.md5(normalized_text.encode('utf-8')).hexdigest()
                embedding_cache[cache_key] = emb
        except Exception as e:
            print(f"Embedding error: {e}")
            # Return zero embeddings as fallback for failed ones
            new_embeddings = [[0.0] * 768 for _ in uncached_texts]
            for text, emb in zip(uncached_texts, new_embeddings):
                normalized_text = ' '.join(text.split())
                cache_key = hashlib.md5(normalized_text.encode('utf-8')).hexdigest()
                embedding_cache[cache_key] = emb
    
    # Combine cached and new results in correct order
    result = []
    uncached_idx = 0
    for i in range(len(texts)):
        if i in cached_results:
            result.append(cached_results[i])
        else:
            normalized_text = ' '.join(uncached_texts[uncached_idx].split())
            cache_key = hashlib.md5(normalized_text.encode('utf-8')).hexdigest()
            result.append(embedding_cache[cache_key])
            uncached_idx += 1
    
    return result

def call_gemini_generate(prompt: str, use_fast_model: bool = False) -> str:
    """
    Generate content using Gemini with caching and fallback to lite model if rate limited.
    use_fast_model: If True, use faster lite model for speed-critical operations like skill creation.
    
    Caches responses for 1 hour to reduce API calls for similar prompts.
    """
    fallback_model = "gemini-2.5-flash-lite"
    model_to_use = fallback_model if use_fast_model else GEMINI_MODEL
    
    # Create cache key from prompt and model
    # Normalize whitespace for better cache hits
    normalized_prompt = ' '.join(prompt.split())
    cache_key = hashlib.md5(f"{model_to_use}:{normalized_prompt}".encode('utf-8')).hexdigest()
    
    # Check cache first
    if cache_key in llm_cache:
        print(f"Cache hit for LLM request (model: {model_to_use})")
        return llm_cache[cache_key]
    
    try:
        # Use faster model for skill creation or primary model otherwise
        # Using gemini-2.5-flash-lite for skill creation (faster, optimized for speed)
        resp = genai_client.models.generate_content(
            model=model_to_use,
            contents=prompt
        )
        
        # Extract text from response
        response_text = None
        if hasattr(resp, 'text') and resp.text:
            response_text = resp.text
        else:
            # Fallback extraction methods
            if hasattr(resp, 'candidates') and resp.candidates:
                for candidate in resp.candidates:
                    if hasattr(candidate, 'content') and candidate.content:
                        if hasattr(candidate.content, 'parts') and candidate.content.parts:
                            for part in candidate.content.parts:
                                if hasattr(part, 'text') and part.text:
                                    response_text = part.text
                                    break
                    if response_text:
                        break
        
        if not response_text:
            response_text = str(resp)
        
        # Cache the response
        llm_cache[cache_key] = response_text
        return response_text
        
    except Exception as e:
        print(f"Primary model ({GEMINI_MODEL}) failed: {e}")
        print(f"Retrying with fallback model: {fallback_model}")
        
        try:
            # Try fallback model (don't cache fallback responses to avoid caching errors)
            resp = genai_client.models.generate_content(
                model=fallback_model,
                contents=prompt
            )
            
            if hasattr(resp, 'text') and resp.text:
                return resp.text
            
            return str(resp)
            
        except Exception as fallback_error:
            print(f"Fallback model also failed: {fallback_error}")
            return "Error: Unable to generate response from Gemini API"

