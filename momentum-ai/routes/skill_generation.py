# routes/skill_generation.py
import json
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from ai_client import call_gemini_generate
from utils import retrieve_user_context

router = APIRouter()

class SkillSuggestionRequest(BaseModel):
    user_id: str
    courses: List[Dict[str, Any]] = []
    existing_skills: List[Dict[str, Any]] = []
    education_level: Optional[str] = None
    major: Optional[str] = None
    unstructured_context: Optional[str] = None

class SkillSuggestion(BaseModel):
    name: str
    category: str
    description: str
    reason: str  # Why this skill is relevant to the user

class SkillSuggestionsResponse(BaseModel):
    suggestions: List[SkillSuggestion]

class SkillRoadmapRequest(BaseModel):
    user_id: str
    skill_name: str
    courses: List[Dict[str, Any]] = []
    existing_skills: List[Dict[str, Any]] = []
    education_level: Optional[str] = None
    major: Optional[str] = None
    unstructured_context: Optional[str] = None

class Milestone(BaseModel):
    name: str
    order: int

class LearningResource(BaseModel):
    title: str
    type: str  # "link", "video", "note"
    url: Optional[str] = None
    description: Optional[str] = None

class SkillRoadmapResponse(BaseModel):
    name: str
    category: str
    level: str
    description: str
    goalStatement: str
    durationMonths: int
    estimatedHours: float
    startDate: str  # YYYY-MM-DD
    endDate: str  # YYYY-MM-DD
    milestones: List[Milestone]
    resources: List[LearningResource]

@router.post("/generate-skill-suggestions", response_model=SkillSuggestionsResponse)
async def generate_skill_suggestions(req: SkillSuggestionRequest):
    """Generate AI-powered skill suggestions based on user data"""
    try:
        # Retrieve user context from ChromaDB
        context_query = "skills learning goals career development"
        context_docs = retrieve_user_context(
            req.user_id,
            context_query,
            k=5,
            min_similarity=0.6,
            max_context_length=1500,
            allowed_types=["goal", "preference", "note", "skill"]
        )
        context_text = "\n\n".join([d['text'] for d in context_docs]) if context_docs else ""
        
        # Build structured context
        courses_text = ", ".join([c.get('courseName', c.get('name', '')) for c in req.courses[:5]]) if req.courses else "None"
        existing_skills_text = ", ".join([s.get('name', '') for s in req.existing_skills[:5]]) if req.existing_skills else "None"
        
        # Get current date
        current_date_iso = datetime.now().strftime('%Y-%m-%d')
        
        # Build prompt
        prompt = f"""You are an AI assistant that suggests relevant skills for students based on their academic background, existing skills, and goals.

USER CONTEXT:
- Education Level: {req.education_level or 'Not specified'}
- Major/Field: {req.major or 'Not specified'}
- Current Courses: {courses_text}
- Existing Skills: {existing_skills_text}
- Additional Context: {req.unstructured_context or 'None'}

SEMANTIC CONTEXT FROM USER MEMORY:
{context_text[:1000] if context_text else 'None'}

TASK:
Analyze the user's academic background, current courses, existing skills, and goals. Generate 3-5 highly relevant skill suggestions that would:
1. Complement their current studies
2. Build on their existing skills
3. Align with their career goals (inferred from context)
4. Be practical and achievable

For each suggestion, provide:
- name: The skill name (e.g., "React.js", "Data Analysis with Python", "Public Speaking")
- category: One of: "Technical", "Creative", "Soft Skills", "Business", "Language", "Other"
- description: Brief 1-2 sentence description of what the skill is
- reason: Why this skill is relevant to THIS specific user (personalized reason)

Return ONLY a JSON array with this exact structure:
[
  {{
    "name": "Skill Name",
    "category": "Technical",
    "description": "Brief description",
    "reason": "Why this is relevant to the user"
  }},
  ...
]

Generate 3-5 suggestions. Focus on skills that are:
- Relevant to their field of study
- Complementary to existing skills
- Practical and in-demand
- Achievable for their level"""

        # Generate suggestions using Gemini
        raw_response = call_gemini_generate(prompt, use_fast_model=True)
        
        # Parse JSON response
        try:
            # Extract JSON array from response
            json_match = re.search(r'\[.*?\]', raw_response, re.DOTALL)
            if json_match:
                suggestions_data = json.loads(json_match.group(0))
            else:
                raise ValueError("No JSON array found in response")
            
            # Validate and convert to Pydantic models
            suggestions = []
            for item in suggestions_data[:5]:  # Limit to 5
                suggestions.append(SkillSuggestion(
                    name=item.get('name', 'Unknown Skill'),
                    category=item.get('category', 'Other'),
                    description=item.get('description', ''),
                    reason=item.get('reason', 'Relevant to your goals')
                ))
            
            # Ensure at least 3 suggestions
            if len(suggestions) < 3:
                # Add fallback suggestions
                fallbacks = [
                    SkillSuggestion(
                        name="Project Management",
                        category="Business",
                        description="Learn to plan, execute, and deliver projects effectively",
                        reason="Essential for managing academic and personal projects"
                    ),
                    SkillSuggestion(
                        name="Data Analysis",
                        category="Technical",
                        description="Analyze and interpret data to make informed decisions",
                        reason="Valuable across many fields and industries"
                    ),
                    SkillSuggestion(
                        name="Communication Skills",
                        category="Soft Skills",
                        description="Improve written and verbal communication abilities",
                        reason="Critical for academic success and career advancement"
                    )
                ]
                suggestions.extend(fallbacks[:3 - len(suggestions)])
            
            return SkillSuggestionsResponse(suggestions=suggestions[:5])
            
        except Exception as e:
            print(f"Error parsing suggestions JSON: {e}")
            print(f"Raw response: {raw_response[:500]}")
            # Return fallback suggestions
            return SkillSuggestionsResponse(suggestions=[
                SkillSuggestion(
                    name="Project Management",
                    category="Business",
                    description="Learn to plan, execute, and deliver projects effectively",
                    reason="Essential for managing academic and personal projects"
                ),
                SkillSuggestion(
                    name="Data Analysis",
                    category="Technical",
                    description="Analyze and interpret data to make informed decisions",
                    reason="Valuable across many fields and industries"
                ),
                SkillSuggestion(
                    name="Communication Skills",
                    category="Soft Skills",
                    description="Improve written and verbal communication abilities",
                    reason="Critical for academic success and career advancement"
                )
            ])
            
    except Exception as e:
        print(f"Skill suggestions error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating skill suggestions: {str(e)}")

@router.post("/generate-skill-roadmap", response_model=SkillRoadmapResponse)
async def generate_skill_roadmap(req: SkillRoadmapRequest):
    """Generate complete skill roadmap with milestones and resources"""
    try:
        # Retrieve user context from ChromaDB
        context_query = f"{req.skill_name} learning roadmap resources"
        context_docs = retrieve_user_context(
            req.user_id,
            context_query,
            k=5,
            min_similarity=0.6,
            max_context_length=1500,
            allowed_types=["goal", "preference", "note", "skill"]
        )
        context_text = "\n\n".join([d['text'] for d in context_docs]) if context_docs else ""
        
        # Build structured context
        courses_text = ", ".join([c.get('courseName', c.get('name', '')) for c in req.courses[:5]]) if req.courses else "None"
        existing_skills_text = ", ".join([s.get('name', '') for s in req.existing_skills[:5]]) if req.existing_skills else "None"
        
        # Get current date
        current_date = datetime.now()
        current_date_iso = current_date.strftime('%Y-%m-%d')
        
        # Build prompt
        prompt = f"""You are an AI assistant that creates comprehensive learning roadmaps for skills.

USER CONTEXT:
- Education Level: {req.education_level or 'Not specified'}
- Major/Field: {req.major or 'Not specified'}
- Current Courses: {courses_text}
- Existing Skills: {existing_skills_text}
- Additional Context: {req.unstructured_context or 'None'}

SEMANTIC CONTEXT FROM USER MEMORY:
{context_text[:1000] if context_text else 'None'}

TASK:
Generate a complete learning roadmap for the skill: "{req.skill_name}"

Create a comprehensive roadmap including:
1. Skill Details:
   - name: "{req.skill_name}"
   - category: One of: "Technical", "Creative", "Soft Skills", "Business", "Language", "Other"
   - level: "beginner", "intermediate", "advanced", or "expert" (usually "beginner" for new skills)
   - description: 2-3 sentence description of what the skill is and why it's valuable
   - goalStatement: Specific, measurable learning goal (1 sentence)

2. Timeline:
   - durationMonths: Realistic duration in months (1-6 months, typically 2-3)
   - estimatedHours: Total estimated learning hours (calculate: hours per week × weeks)
   - startDate: "{current_date_iso}" (today's date)
   - endDate: Calculate startDate + durationMonths (format: YYYY-MM-DD)

3. Milestones (3-5 progressive milestones):
   - Each milestone should be a clear, achievable step
   - Order them from beginner to advanced
   - Make them specific and actionable
   - Example progression: "Learn basics" → "Build first project" → "Advanced concepts" → "Real-world application"

4. Learning Resources (2-4 resources):
   - Include mix of: tutorials, documentation, video courses, practice platforms
   - Provide real URLs when possible (use actual learning platforms)
   - Types: "link", "video", or "note"
   - Each resource should have: title, type, url (if available), description

Return ONLY a JSON object with this exact structure:
{{
  "name": "{req.skill_name}",
  "category": "Technical",
  "level": "beginner",
  "description": "2-3 sentence description",
  "goalStatement": "Specific learning goal",
  "durationMonths": 2,
  "estimatedHours": 40,
  "startDate": "{current_date_iso}",
  "endDate": "YYYY-MM-DD",
  "milestones": [
    {{"name": "Milestone 1", "order": 0}},
    {{"name": "Milestone 2", "order": 1}},
    ...
  ],
  "resources": [
    {{
      "title": "Resource Title",
      "type": "link",
      "url": "https://example.com",
      "description": "Brief description"
    }},
    ...
  ]
}}

Make the roadmap realistic, achievable, and personalized to the user's background."""

        # Generate roadmap using Gemini
        raw_response = call_gemini_generate(prompt, use_fast_model=True)
        
        # Parse JSON response
        try:
            # Extract JSON object from response
            json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if json_match:
                roadmap_data = json.loads(json_match.group(0))
            else:
                raise ValueError("No JSON object found in response")
            
            # Validate and calculate endDate if missing
            if 'endDate' not in roadmap_data or not roadmap_data['endDate']:
                duration_months = roadmap_data.get('durationMonths', 2)
                start_date = datetime.strptime(roadmap_data.get('startDate', current_date_iso), '%Y-%m-%d')
                end_date = start_date + timedelta(days=duration_months * 30)
                roadmap_data['endDate'] = end_date.strftime('%Y-%m-%d')
            
            # Ensure milestones have order
            milestones = roadmap_data.get('milestones', [])
            for i, milestone in enumerate(milestones):
                if 'order' not in milestone:
                    milestone['order'] = i
            
            # Validate resources
            resources = roadmap_data.get('resources', [])
            for resource in resources:
                if 'type' not in resource:
                    resource['type'] = 'link'
            
            # Convert to Pydantic model
            roadmap = SkillRoadmapResponse(
                name=roadmap_data.get('name', req.skill_name),
                category=roadmap_data.get('category', 'Other'),
                level=roadmap_data.get('level', 'beginner'),
                description=roadmap_data.get('description', f'Learn {req.skill_name}'),
                goalStatement=roadmap_data.get('goalStatement', f'Master {req.skill_name}'),
                durationMonths=roadmap_data.get('durationMonths', 2),
                estimatedHours=float(roadmap_data.get('estimatedHours', 40)),
                startDate=roadmap_data.get('startDate', current_date_iso),
                endDate=roadmap_data.get('endDate', (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')),
                milestones=[Milestone(**m) for m in milestones[:5]],
                resources=[LearningResource(**r) for r in resources[:4]]
            )
            
            return roadmap
            
        except Exception as e:
            print(f"Error parsing roadmap JSON: {e}")
            print(f"Raw response: {raw_response[:500]}")
            # Return fallback roadmap
            end_date = (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')
            return SkillRoadmapResponse(
                name=req.skill_name,
                category="Other",
                level="beginner",
                description=f"Learn {req.skill_name} through structured practice and projects",
                goalStatement=f"Master the fundamentals of {req.skill_name}",
                durationMonths=2,
                estimatedHours=40,
                startDate=current_date_iso,
                endDate=end_date,
                milestones=[
                    Milestone(name=f"Learn {req.skill_name} basics", order=0),
                    Milestone(name=f"Build first {req.skill_name} project", order=1),
                    Milestone(name=f"Apply {req.skill_name} to real-world scenarios", order=2)
                ],
                resources=[
                    LearningResource(
                        title=f"{req.skill_name} Documentation",
                        type="link",
                        url="https://example.com",
                        description="Official documentation and guides"
                    )
                ]
            )
            
    except Exception as e:
        print(f"Skill roadmap error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating skill roadmap: {str(e)}")

