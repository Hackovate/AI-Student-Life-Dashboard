# routes/planning.py
import json
import uuid
import asyncio
import os
from datetime import datetime
from dateutil import parser
import numpy as np
import joblib
from fastapi import APIRouter
from models import PlanRequest, PlanResponse, CompleteReq
from database import collection
from ai_client import call_gemini_generate
from scheduler import fallback_scheduler
from websocket_manager import ws_manager
from utils import retrieve_user_context
from config import GEMINI_MODEL, POLICY_MODEL_PATH

router = APIRouter()

# Load policy model if exists
policy_model = None
if os.path.exists(POLICY_MODEL_PATH):
    try:
        policy_model = joblib.load(POLICY_MODEL_PATH)
    except Exception as e:
        print("Failed to load policy model:", e)

@router.post("/plan", response_model=PlanResponse)
def plan(req: PlanRequest):
    # 1) get context - optimized retrieval for planning queries
    context_docs = retrieve_user_context(
        req.user_id, 
        query=f"study notes syllabus courses subjects planning schedule",
        k=5,  # Get more context for planning
        min_similarity=0.6,  # Slightly lower threshold for planning (needs broader context)
        max_context_length=2500,  # More context allowed for planning
        allowed_types=["plan", "context", "onboarding"],  # Planning-relevant types
        deduplicate=True
    )
    context_text = "\n\n".join([d['text'] for d in context_docs]) if context_docs else ""

    # 2) build prompt (strict JSON)
    prompt = f"""
You are Momentum — an intelligent student's daily planner assistant. Return ONLY a valid JSON object exactly matching the schema below.

Context:
{context_text}

INPUT:
date: {req.date_iso}
available_windows: { [w.dict() for w in req.available_times] }
classes: { [c.dict() for c in req.classes] }
tasks: { [t.dict() for t in req.tasks] }
preferences: { req.preferences or {} }

SCHEMA:
{{ "summary": string,
  "schedule": [{{"id","task_id","title","type","start","end","priority","estimated_minutes","notes","score"}}],
  "suggestions": [string],
  "rebalanced_tasks": [{{"original_task_id","new_slot"}}]
}}

Rules:
- Do not overlap with classes.
- Prioritize tasks with earlier deadlines, then higher priority.
- Respect user preferred study times when possible.
- Use ISO8601 datetimes for start/end.
- Output VALID JSON ONLY — no extra text.
"""
    raw = call_gemini_generate(prompt)
    import re
    m = re.search(r"\{.*\}", raw, flags=re.S)
    if not m:
        # fallback
        schedule = fallback_scheduler(req.available_times, [t.dict() for t in req.tasks], [c.dict() for c in req.classes])
        return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                            summary="Fallback schedule (LLM failed to produce JSON)",
                            schedule=schedule, suggestions=["Fallback used."], rebalanced_tasks=[],
                            metadata={"model": GEMINI_MODEL, "retrieved_docs": len(context_docs)})
    try:
        parsed = json.loads(m.group(0))
    except Exception:
        schedule = fallback_scheduler(req.available_times, [t.dict() for t in req.tasks], [c.dict() for c in req.classes])
        return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                            summary="Fallback schedule (LLM JSON parse error)",
                            schedule=schedule, suggestions=["Fallback used."], rebalanced_tasks=[],
                            metadata={"model": GEMINI_MODEL, "retrieved_docs": len(context_docs)})

    # 3) score with policy model if available
    if policy_model is not None:
        for s in parsed.get("schedule", []):
            try:
                start_dt = parser.isoparse(s["start"])
                feat = np.array([[start_dt.hour, start_dt.weekday(), s.get("priority", 3), s.get("estimated_minutes", 30)]])
                if hasattr(policy_model, "predict_proba"):
                    prob = policy_model.predict_proba(feat)[:,1][0]
                else:
                    prob = float(policy_model.predict(feat)[0])
                s["score"] = float(prob)
            except Exception:
                s["score"] = 0.0
        parsed["schedule"].sort(key=lambda x: x.get("score",0), reverse=True)

    # ensure ids
    for item in parsed.get("schedule", []):
        if "id" not in item:
            item["id"] = str(uuid.uuid4())

    # persist policy log and optionally push to frontend (store details in your DB in production)
    # For demo: write a small json to logs/
    os.makedirs("logs", exist_ok=True)
    with open("logs/plan_requests.log", "a") as f:
        f.write(json.dumps({"ts": datetime.utcnow().isoformat(), "user_id": req.user_id, "payload": parsed}) + "\n")

    # send realtime update to frontend (best-effort)
    asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"plan","payload":parsed}))

    return PlanResponse(user_id=req.user_id, date_iso=req.date_iso,
                        summary=parsed.get("summary",""),
                        schedule=parsed.get("schedule",[]),
                        suggestions=parsed.get("suggestions",[]),
                        rebalanced_tasks=parsed.get("rebalanced_tasks",[]),
                        metadata={"model": GEMINI_MODEL, "retrieved_docs": len(context_docs)})

@router.post("/complete")
def complete(req: CompleteReq):
    # compute simple reward and append to completions log for offline training
    base = 1.0 if req.outcome == "done" else (0.5 if req.outcome == "partial" else 0.0)
    reward = base  # you can tune with lateness penalties later
    log = {
        "ts": datetime.utcnow().isoformat(),
        "user_id": req.user_id,
        "task_id": req.task_id,
        "scheduled_slot_id": req.scheduled_slot_id,
        "actual_minutes": req.actual_minutes,
        "outcome": req.outcome,
        "feedback": req.feedback,
        "reward": reward
    }
    os.makedirs("logs", exist_ok=True)
    with open("logs/completions.log", "a") as f:
        f.write(json.dumps(log) + "\n")
    # trigger optional immediate small rebalancer (here done synchronously for simplicity)
    # In production enqueue async rebalancer
    asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"complete","payload":log}))
    return {"status":"ok","reward":reward}

@router.post("/rebalance")
def rebalance(req: PlanRequest):
    # greedy pack missed/remaining tasks into available windows
    schedule = fallback_scheduler(req.available_times, [t.dict() for t in req.tasks], [c.dict() for c in req.classes])
    asyncio.create_task(ws_manager.send_json(req.user_id, {"type":"rebalance","payload":{"schedule":schedule}}))
    return {"status":"ok","schedule": schedule}

