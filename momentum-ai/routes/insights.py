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
    finances: Dict[str, Any]
    skills: List[Dict[str, Any]]

class InsightsResponse(BaseModel):
    insights: List[str]

@router.post("/insights", response_model=InsightsResponse)
async def get_insights(req: InsightsRequest):
    """Generate AI-powered insights based on finances, habits, and skills data"""
    try:
        # Build context from habits data
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

        # Analyze finances
        finances = req.finances or {}
        total_income = finances.get('totalIncome', 0)
        total_expenses = finances.get('totalExpenses', 0)
        net_savings = finances.get('netSavings', 0)
        expense_by_category = finances.get('expenseByCategory', {})

        # Analyze skills
        skills_summary = []
        for skill in req.skills:
            milestones = skill.get('milestones', [])
            if isinstance(milestones, str):
                try:
                    milestones = json.loads(milestones)
                except:
                    milestones = []
            completed_milestones = sum(1 for m in milestones if m.get('completed', False)) if isinstance(milestones, list) else 0
            total_milestones = len(milestones) if isinstance(milestones, list) else 0
            
            skills_summary.append({
                'name': skill.get('name', 'Unknown'),
                'category': skill.get('category', 'General'),
                'level': skill.get('level', 'beginner'),
                'progress': skill.get('progress', 0),
                'completed_milestones': completed_milestones,
                'total_milestones': total_milestones,
                'estimated_hours': skill.get('estimatedHours', 0)
            })

        # Build prompt for AI
        prompt = f"""You are an AI assistant analyzing user finances, habits, and skills to provide personalized insights and suggestions.

FINANCES (this month):
- Total Income: {total_income} BDT
- Total Expenses: {total_expenses} BDT
- Net Savings: {net_savings} BDT
- Spending by Category: {json.dumps(expense_by_category, indent=2)}

HABITS DATA:
{json.dumps(habits_summary, indent=2)}

SKILLS DATA:
{json.dumps(skills_summary, indent=2)}

TASK:
Analyze the data above and generate EXACTLY 3 personalized, actionable insights. Focus ONLY on:
1. Financial performance: savings, spending patterns, budget management
2. Habit consistency and streaks: celebrate wins, identify areas for improvement
3. Skills progress and performance: learning consistency, milestone completion, skill development

Return ONLY a JSON array with EXACTLY 3 insight strings (no markdown, no explanations, just the insights):
["insight 1", "insight 2", "insight 3"]

Keep each insight concise (1-2 sentences max) and actionable. Focus on performance, consistency, and progress."""

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
                insights = [insight for insight in insights if insight][:3]
        except Exception as e:
            print(f"Error parsing insights JSON: {e}")
            # Return empty array if parsing fails
            insights = []

        # Limit to exactly 3 insights (replace oldest if more than 3)
        # Only return insights if we have valid ones (no fallbacks)
        insights = insights[:3] if insights else []

        return InsightsResponse(insights=insights)
        
    except Exception as e:
        print(f"Insights error: {e}")
        import traceback
        traceback.print_exc()
        # Return empty insights on error
        return InsightsResponse(insights=[])

