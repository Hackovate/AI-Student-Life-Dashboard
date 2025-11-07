# ai_client.py
from typing import List
from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL

# Initialize Google GenAI client
genai_client = genai.Client(api_key=GEMINI_API_KEY)

def gemini_embedding(texts: List[str]) -> List[List[float]]:
    """
    Use genai embeddings API with the newer SDK.
    """
    try:
        res = genai_client.models.embed_content(
            model="text-embedding-004",
            contents=texts
        )
        # Extract embedding values from response
        embeddings = []
        for emb_obj in res.embeddings:
            if hasattr(emb_obj, 'values'):
                embeddings.append(emb_obj.values)
            else:
                # Fallback if structure is different
                embeddings.append(list(emb_obj))
        return embeddings
    except Exception as e:
        print(f"Embedding error: {e}")
        # Return zero embeddings as fallback
        return [[0.0] * 768 for _ in texts]

def call_gemini_generate(prompt: str, use_fast_model: bool = False) -> str:
    """
    Generate content using Gemini with fallback to lite model if rate limited.
    use_fast_model: If True, use faster lite model for speed-critical operations like skill creation.
    """
    fallback_model = "gemini-2.5-flash-lite"
    model_to_use = fallback_model if use_fast_model else GEMINI_MODEL
    
    try:
        # Use faster model for skill creation or primary model otherwise
        # Using gemini-2.5-flash-lite for skill creation (faster, optimized for speed)
        resp = genai_client.models.generate_content(
            model=model_to_use,
            contents=prompt
        )
        
        # Extract text from response
        if hasattr(resp, 'text') and resp.text:
            return resp.text
        
        # Fallback extraction methods
        if hasattr(resp, 'candidates') and resp.candidates:
            for candidate in resp.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                return part.text
        
        return str(resp)
        
    except Exception as e:
        print(f"Primary model ({GEMINI_MODEL}) failed: {e}")
        print(f"Retrying with fallback model: {fallback_model}")
        
        try:
            # Try fallback model
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

