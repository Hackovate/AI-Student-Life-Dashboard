# routes/notification.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ai_client import call_gemini_generate

router = APIRouter()

class NotificationItem(BaseModel):
    id: str
    type: str  # "success", "error", "warning", "info"
    title: Optional[str] = None
    message: str
    source: Optional[str] = None
    action: Optional[str] = None
    createdAt: str

class SummarizeNotificationsRequest(BaseModel):
    notifications: List[NotificationItem]

class SummarizeNotificationsResponse(BaseModel):
    summary: str

@router.post("/summarize-notifications", response_model=SummarizeNotificationsResponse)
def summarize_notifications(req: SummarizeNotificationsRequest):
    """
    Summarize a list of notifications using AI.
    Groups notifications by type/theme and provides a concise summary.
    """
    try:
        if not req.notifications or len(req.notifications) == 0:
            return SummarizeNotificationsResponse(summary="No notifications to summarize.")
        
        # Group notifications by type
        notifications_by_type = {}
        for notif in req.notifications:
            notif_type = notif.type
            if notif_type not in notifications_by_type:
                notifications_by_type[notif_type] = []
            notifications_by_type[notif_type].append(notif)
        
        # Build notification list text
        notification_texts = []
        for notif in req.notifications:
            text = f"- [{notif.type.upper()}]"
            if notif.title:
                text += f" {notif.title}:"
            text += f" {notif.message}"
            if notif.source:
                text += f" (from {notif.source})"
            notification_texts.append(text)
        
        notifications_list = "\n".join(notification_texts)
        
        # Build prompt for AI summarization
        prompt = f"""You are a helpful assistant that summarizes user notifications. You are ONLY summarizing these notifications - do not remember or store this information for future use.

The user has received the following notifications:

{notifications_list}

Please provide a concise, well-organized summary that:
1. Groups related notifications together by theme or type
2. Highlights important information (errors, successes, warnings)
3. Uses clear, concise language
4. Maintains a friendly, helpful tone
5. Is no longer than 200 words

Format the summary with clear sections if there are multiple themes. Use bullet points or short paragraphs for readability.

IMPORTANT: This is a one-time summary only. Do not reference this summary in future conversations or store it in memory.

Summary:"""
        
        # Call AI to generate summary
        raw_summary = call_gemini_generate(prompt)
        
        # Clean up the summary (remove any markdown formatting if needed)
        summary = raw_summary.strip()
        
        return SummarizeNotificationsResponse(summary=summary)
        
    except Exception as e:
        import traceback
        error_msg = f"Error summarizing notifications: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=f"Failed to summarize notifications: {str(e)}")

