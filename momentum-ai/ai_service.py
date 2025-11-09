# ai_service.py - Main FastAPI application
import os
# Disable telemetry before any imports
# LangSmith telemetry
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGCHAIN_ENDPOINT"] = ""
# ChromaDB telemetry (PostHog)
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import PORT, GEMINI_MODEL, ALLOWED_ORIGINS
from websocket_manager import ws_manager
from routes import ingest, planning, onboarding, chat, skill_generation, notification

# Create FastAPI app
app = FastAPI(title="Momentum AI microservice")

# Add CORS middleware - restrict to specific origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(ingest.router)
app.include_router(planning.router)
app.include_router(onboarding.router)
app.include_router(chat.router)
app.include_router(skill_generation.router)
app.include_router(notification.router)

# WebSocket endpoint for realtime updates
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # Get token from query parameters or headers
    token = None
    # Check query parameters
    if "token" in websocket.query_params:
        token = websocket.query_params["token"]
    # Check Authorization header
    elif "authorization" in websocket.headers:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    await ws_manager.connect(websocket, user_id, token)
    try:
        while True:
            data = await websocket.receive_text()
            # ping/pong or client messages can be handled (not required)
            await websocket.send_text("ack")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)

# Health check endpoint - minimal information for security
@app.get("/health")
def health():
    import os
    # Only expose model name in development
    if os.getenv("ENVIRONMENT", "development") == "development":
        return {"status": "ok", "model": GEMINI_MODEL}
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service:app", host="0.0.0.0", port=PORT, reload=True)
