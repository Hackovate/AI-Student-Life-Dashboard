# routes/ingest.py
import uuid
from datetime import datetime
from fastapi import APIRouter
from models import IngestRequest
from database import collection
from ai_client import gemini_embedding
from langchain.text_splitter import RecursiveCharacterTextSplitter

router = APIRouter()

# Create text splitter with optimal settings for this project
# Chunk size 1000 chars with 200 char overlap balances precision and context
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]  # Smart splitting by paragraphs, sentences, words
)

@router.post("/ingest")
def ingest(req: IngestRequest):
    """
    Ingest documents using LangChain for proper chunking.
    Long documents are split into smaller chunks for better semantic retrieval.
    """
    all_chunks = []
    all_metadatas = []
    all_ids = []
    
    for d in req.docs:
        doc_id = d.id or str(uuid.uuid4())
        base_meta = {
            "user_id": req.user_id,
            "timestamp": datetime.now().isoformat(),
            **(d.meta or {})
        }
        
        # Split document into chunks using LangChain
        # This ensures long documents (syllabi, notes) are properly chunked
        chunks = text_splitter.split_text(d.text)
        
        # If document is short enough, store as single chunk
        if len(chunks) == 1 and len(d.text) <= 1000:
            # Short document - store as-is
            all_chunks.append(d.text)
            all_metadatas.append(base_meta)
            all_ids.append(doc_id)
        else:
            # Long document - store as multiple chunks with metadata
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc_id}_chunk_{i}"
                all_chunks.append(chunk)
                all_metadatas.append({
                    **base_meta,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "source_doc_id": doc_id,
                    "is_chunk": True
                })
                all_ids.append(chunk_id)
    
    # Batch generate embeddings for all chunks (more efficient)
    if all_chunks:
        embeddings = gemini_embedding(all_chunks)
        
        # Batch add to ChromaDB (more efficient than individual adds)
        collection.add(
            documents=all_chunks,
            embeddings=embeddings,
            ids=all_ids,
            metadatas=all_metadatas
        )
    
    return {
        "status": "ok",
        "chunks_created": len(all_chunks),
        "docs_processed": len(req.docs),
        "avg_chunks_per_doc": len(all_chunks) / len(req.docs) if req.docs else 0
    }

