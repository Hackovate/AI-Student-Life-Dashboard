# routes/ingest.py
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from models import IngestRequest
from database import collection
from ai_client import gemini_embedding
from langchain.text_splitter import RecursiveCharacterTextSplitter
import numpy as np

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
        
        # Convert embeddings to numpy arrays for ChromaDB type compatibility
        embeddings_array = [np.array(emb) for emb in embeddings]
        
        # Batch add to ChromaDB (more efficient than individual adds)
        collection.add(
            documents=all_chunks,
            embeddings=embeddings_array,
            ids=all_ids,
            metadatas=all_metadatas
        )
    
    return {
        "status": "ok",
        "chunks_created": len(all_chunks),
        "docs_processed": len(req.docs),
        "avg_chunks_per_doc": len(all_chunks) / len(req.docs) if req.docs else 0
    }

@router.delete("/ingest/syllabus/{course_id}")
def delete_syllabus(course_id: str, user_id: str = Query(...)):
    """
    Delete all syllabus chunks for a specific course from ChromaDB.
    This is called when syllabus is updated or deleted.
    user_id is passed as a query parameter.
    """
    try:
        # Query all documents with this course_id and type=syllabus
        # Note: ChromaDB doesn't have a direct delete by metadata filter
        # So we need to query first, then delete by IDs
        results = collection.get(
            where={
                "$and": [
                    {"user_id": user_id},
                    {"type": "syllabus"},
                    {"course_id": course_id}
                ]
            }
        )
        
        if results and results['ids']:
            # Delete all chunks for this syllabus
            collection.delete(ids=results['ids'])
            return {
                "status": "ok",
                "deleted_count": len(results['ids']),
                "message": f"Deleted {len(results['ids'])} syllabus chunks for course {course_id}"
            }
        else:
            return {
                "status": "ok",
                "deleted_count": 0,
                "message": "No syllabus chunks found for this course"
            }
    except Exception as e:
        print(f"Error deleting syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest/syllabus")
def ingest_syllabus(req: IngestRequest):
    """
    Ingest syllabus with special handling: delete old chunks before adding new ones.
    This ensures syllabus updates replace old content rather than duplicating.
    """
    try:
        # Extract course_id from first doc's metadata
        if not req.docs or len(req.docs) == 0:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        first_doc = req.docs[0]
        course_id = first_doc.meta.get('course_id') if first_doc.meta else None
        
        if not course_id:
            raise HTTPException(status_code=400, detail="course_id is required in document metadata")
        
        # Delete old syllabus chunks for this course
        try:
            # Call the delete function directly with the same logic
            results = collection.get(
                where={
                    "$and": [
                        {"user_id": req.user_id},
                        {"type": "syllabus"},
                        {"course_id": course_id}
                    ]
                }
            )
            if results and results['ids']:
                collection.delete(ids=results['ids'])
                print(f"Deleted {len(results['ids'])} old syllabus chunks for course {course_id}")
        except Exception as delete_error:
            print(f"Warning: Could not delete old syllabus chunks: {delete_error}")
            # Continue anyway - we'll add new chunks
        
        # Now ingest new syllabus using the standard ingest logic
        return ingest(req)
    except Exception as e:
        print(f"Error ingesting syllabus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

