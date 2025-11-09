# websocket_manager.py
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Optional
import jwt
import os

# Get JWT secret from environment (should match backend JWT_SECRET)
JWT_SECRET = os.getenv("JWT_SECRET")

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id if valid"""
    if not JWT_SECRET:
        return None
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return decoded.get("userId")
    except jwt.InvalidTokenError:
        return None

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, token: Optional[str] = None):
        # Verify authentication if token is provided
        if token:
            verified_user_id = verify_token(token)
            if not verified_user_id or verified_user_id != user_id:
                await websocket.close(code=1008, reason="Authentication failed")
                return
        elif not JWT_SECRET:
            # In development, allow connection without token if JWT_SECRET not set
            # In production, this should be required
            pass
        else:
            # In production, require token
            await websocket.close(code=1008, reason="Authentication required")
            return
        
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            self.active[user_id].remove(websocket)

    async def send_json(self, user_id: str, data):
        conns = self.active.get(user_id, [])
        for ws in conns:
            try:
                await ws.send_json(data)
            except:
                pass

# Global instance
ws_manager = ConnectionManager()

