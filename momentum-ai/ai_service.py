# ai_service.py - Main FastAPI application
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from config import PORT, GEMINI_MODEL
from websocket_manager import ws_manager
from routes import ingest, planning, onboarding, chat, insights, skill_generation

# Create FastAPI app
app = FastAPI(title="Momentum AI microservice")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ingest.router)
app.include_router(planning.router)
app.include_router(onboarding.router)
app.include_router(chat.router)
app.include_router(insights.router)
app.include_router(skill_generation.router)

# WebSocket endpoint for realtime updates
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # ping/pong or client messages can be handled (not required)
            await websocket.send_text("ack")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)

# Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok", "model": GEMINI_MODEL}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service:app", host="0.0.0.0", port=PORT, reload=True)
