# routes/insights.py
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from ai_client import call_gemini_generate

router = APIRouter()

class InsightsRequest(BaseModel):
    user_id: str
    habits: List[Dict[str, Any]]
    lifestyle_data: List[Dict[str, Any]]
    journal_entries: List[Dict[str, Any]]

class InsightsResponse(BaseModel):
    insights: List[str]

@router.post("/insights", response_model=InsightsResponse)
async def get_insights(req: InsightsRequest):
    """Generate AI-powered insights based on habits, lifestyle, and journal data"""
    try:
        # Build context from data
        habits_summary = []
        for habit in req.habits:
            completion_history = habit.get('completionHistory', [])
            if isinstance(completion_history, str):
                try:
                    completion_history = json.loads(completion_history)
                except:
                    completion_history = []
            completed_count = sum(1 for entry in completion_history if entry.get('completed', False)) if isinstance(completion_history, list) else 0
            total_count = len(completion_history) if isinstance(completion_history, list) else 0
            completion_rate = (completed_count / total_count * 100) if total_count > 0 else 0
            
            habits_summary.append({
                'name': habit.get('name', 'Unknown'),
                'streak': habit.get('streak', 0),
                'completed_today': habit.get('completed', False),
                'completion_rate': round(completion_rate, 1),
                'target': habit.get('target', 'Daily')
            })

        # Analyze lifestyle patterns
        lifestyle_summary = {
            'avg_sleep': 0,
            'avg_exercise': 0,
            'avg_stress': 0,
            'total_records': len(req.lifestyle_data)
        }
        if req.lifestyle_data:
            sleep_hours = [d.get('sleepHours') for d in req.lifestyle_data if d.get('sleepHours')]
            exercise_mins = [d.get('exerciseMinutes') for d in req.lifestyle_data if d.get('exerciseMinutes')]
            stress_levels = [d.get('stressLevel') for d in req.lifestyle_data if d.get('stressLevel')]
            
            lifestyle_summary['avg_sleep'] = round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else 0
            lifestyle_summary['avg_exercise'] = round(sum(exercise_mins) / len(exercise_mins), 0) if exercise_mins else 0
            lifestyle_summary['avg_stress'] = round(sum(stress_levels) / len(stress_levels), 1) if stress_levels else 0

        # Analyze mood trends
        mood_summary = {}
        for entry in req.journal_entries:
            mood = entry.get('mood', 'neutral')
            mood_summary[mood] = mood_summary.get(mood, 0) + 1

        # Build prompt for AI
        prompt = f"""You are an AI assistant analyzing user habits, lifestyle, and journal data to provide personalized insights and suggestions.

HABITS DATA:
{json.dumps(habits_summary, indent=2)}

LIFESTYLE DATA (last 30 days):
- Average Sleep: {lifestyle_summary['avg_sleep']} hours
- Average Exercise: {lifestyle_summary['avg_exercise']} minutes
- Average Stress Level: {lifestyle_summary['avg_stress']}/10
- Total Records: {lifestyle_summary['total_records']}

MOOD TRENDS (from journal entries):
{json.dumps(mood_summary, indent=2)}

TASK:
Analyze the data above and generate 3-5 personalized, actionable insights. Focus on:
1. Habit consistency and streaks (celebrate wins, identify areas for improvement)
2. Correlation between lifestyle factors (sleep, exercise, stress) and mood/productivity
3. Specific, actionable suggestions (e.g., "You've completed morning meditation 7 days in a row! Keep it up!" or "You sleep better when you exercise. Try adding 20min walks on days you feel stressed.")
4. Patterns that could improve user's well-being and productivity

Return ONLY a JSON array of insight strings (no markdown, no explanations, just the insights):
["insight 1", "insight 2", "insight 3", ...]

Keep each insight concise (1-2 sentences max) and actionable."""

        # Generate insights using Gemini
        raw_response = call_gemini_generate(prompt, use_fast_model=False)
        
        # Parse JSON response
        try:
            # Try to extract JSON array from response
            import re
            json_match = re.search(r'\[.*?\]', raw_response, re.DOTALL)
            if json_match:
                insights = json.loads(json_match.group(0))
            else:
                # Fallback: split by lines and clean
                insights = [line.strip().strip('"').strip("'") for line in raw_response.split('\n') if line.strip() and not line.strip().startswith('#')]
                insights = [insight for insight in insights if insight][:5]
        except Exception as e:
            print(f"Error parsing insights JSON: {e}")
            # Fallback insights
            insights = [
                "Keep tracking your habits to see patterns over time!",
                "Regular exercise and good sleep can improve your mood and productivity.",
                "Consistency is key - small daily actions lead to big results."
            ]

        # Ensure we have 3-5 insights
        if len(insights) < 3:
            insights.extend([
                "Track your progress daily to build momentum!",
                "Remember: small consistent actions create lasting change."
            ])
        insights = insights[:5]

        return InsightsResponse(insights=insights)
        
    except Exception as e:
        print(f"Insights error: {e}")
        import traceback
        traceback.print_exc()
        # Return default insights on error
        return InsightsResponse(insights=[
            "Keep tracking your habits to see patterns over time!",
            "Regular exercise and good sleep can improve your mood and productivity.",
            "Consistency is key - small daily actions lead to big results."
        ])

