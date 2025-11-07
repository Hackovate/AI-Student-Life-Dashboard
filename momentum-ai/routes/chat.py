# routes/chat.py
import json
import re
import traceback
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models import ChatRequest, ChatResponse, ChatAction
from database import collection
from ai_client import call_gemini_generate, gemini_embedding
from utils import retrieve_user_context, determine_optimal_k, determine_context_types, summarize_long_context

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat with AI assistant using user context from ChromaDB"""
    try:
        # OPTIMIZED: Query-specific context retrieval to prevent overcontext
        # Use the actual user message as query for better semantic matching
        context_query = req.message
        
        # Determine optimal k based on query complexity (prevents overcontext for simple queries)
        optimal_k = determine_optimal_k(req.message)
        
        # Determine relevant context types based on query (prevents retrieving irrelevant types)
        allowed_types = determine_context_types(req.message)
        
        # Retrieve context with anti-overfitting measures:
        # - Similarity threshold (min_similarity=0.65) - only relevant docs
        # - Recency weighting (20% weight) - prioritize recent context
        # - Context length limit (2000 chars) - prevent token bloat
        # - Type filtering - only relevant document types
        # - Deduplication - remove similar documents
        context_docs = retrieve_user_context(
            req.user_id, 
            context_query,
            k=optimal_k,
            min_similarity=0.65,  # Only include docs with >65% similarity
            max_context_length=2000,  # Limit total context to prevent token bloat
            recency_weight=0.2,  # 20% weight for recency, 80% for relevance
            allowed_types=allowed_types,
            deduplicate=True
        )
        
        # Build context text from retrieved documents
        # Documents are already sorted by combined_score (relevance + recency)
        context_text = "\n\n".join([d['text'] for d in context_docs]) if context_docs else ""
        
        # Summarize if context is too long (prevent token bloat)
        context_text = summarize_long_context(context_text, max_length=2000)
        
        # Build conversation history string
        conversation_str = ""
        if req.conversation_history:
            for msg in req.conversation_history:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                conversation_str += f"{role.capitalize()}: {content}\n"
        
        # Build prompt with user context
        user_name_part = f" (User's name: {req.user_name})" if req.user_name else ""
        
        # Combine structured context from PostgreSQL with unstructured from ChromaDB
        full_context = ""
        if req.structured_context:
            full_context += f"Structured Information:\n{req.structured_context}\n\n"
        if context_text:
            full_context += f"Additional Context from Memory:\n{context_text}"
        
        # Build personalized prompt with structured instructions
        name_greeting = f"Hi {req.user_name}!" if req.user_name else "Hello!"
        first_name = req.user_name.split()[0] if req.user_name else "there"
        personalization_note = f"\n\nPERSONALIZATION: The user's name is {req.user_name}. Always use their name naturally in conversation to make it feel personal and friendly, like ChatGPT does. For example: 'Hi {first_name}!' or 'That's great, {first_name}!'" if req.user_name else ""
        
        # Optimized prompt - concise and direct for faster responses
        prompt = f"""Momentum AI Assistant. {name_greeting} Be friendly and concise.

RULES:
- Keep responses SHORT (2-3 sentences max unless complex question)
- For skill creation: Extract info from user message, generate milestones/resources quickly
- Always end with "Actions:" JSON array when creating/updating data

ACTIONS (include in Actions: JSON array):
- update_user: {{"type":"update_user","data":{{"firstName":"..."}}}}
- add_course: {{"type":"add_course","data":{{"name":"...","code":"...","credits":3}}}}
- add_skill: {{"type":"add_skill","data":{{"name":"...","category":"Technical|Creative|Soft Skills|Business|Language|Other","level":"beginner|intermediate|advanced|expert","description":"...","goalStatement":"...","durationMonths":N,"estimatedHours":N,"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","milestones":[{{"name":"...","order":0}}],"resources":[{{"title":"...","type":"link|video|note","url":"...","description":"..."}}]}}}}

SKILL CREATION RULES:
- "I know X" → Simple: Create immediately with name, category, level only

- "I want to learn X" → CRITICAL: DO NOT create skill until you have ALL information!
  * Step 1: User mentions wanting to learn → ASK questions (do NOT create skill yet)
  * Step 2: Ask: "How much time per week? How many months? When to start?"
  * Step 3: Wait for user to provide: hours/week, months/duration, start date
  * Step 4: ONLY when you have ALL info → Create skill with complete data
  * NEVER create skill twice - if skill exists, update it instead
  
  Required info before creating:
  - name (from user message)
  - category (infer from skill name)
  - level (usually beginner for "want to learn")
  - durationMonths (from user: "2 months", "1 month", etc.)
  - estimatedHours (calculate: hours/week × weeks)
  - startDate (from user: "Nov 9", "10 nov", etc. - convert to YYYY-MM-DD)
  - endDate (calculate: startDate + durationMonths)
  - description (brief, from goal)
  - goalStatement (specific learning goal)
  - milestones (3-5 progressive)
  - resources (2-4 learning resources)

  If user provides partial info → Ask for missing pieces, DO NOT create yet.
  Only create when user says "that's all", "create it", or provides complete info.

DUPLICATE PREVENTION:
- Check "Current Skills" in context - if skill name already exists, use update_skill action instead of add_skill
- NEVER create duplicate skills with the same name
- If user mentions learning a skill that exists → Update the existing skill with new information

Context: {full_context}
History: {conversation_str}

User: {req.message}
Assistant:"""
        
        # Check if this is a skill creation request for faster processing
        is_skill_creation = any(keyword in req.message.lower() for keyword in [
            "want to learn", "learn", "add skill", "create skill", "skill to", "build", "develop"
        ])
        
        # Generate response using Gemini (use fast model for skill creation)
        raw_response = call_gemini_generate(prompt, use_fast_model=is_skill_creation)
        
        # Parse response to extract actions
        response_text = raw_response
        actions = []
        
        # Try to extract actions from response (handle multi-line JSON with nested brackets)
        # Look for "Actions:" followed by JSON array (handle nested brackets properly)
        actions_match = None
        
        # Pattern 1: Actions: followed by JSON array (may be in code block)
        actions_match = re.search(r'Actions:.*?```json\s*(\[.*?\])\s*```', raw_response, re.DOTALL | re.IGNORECASE)
        if not actions_match:
            # Pattern 2: Actions: followed by JSON array (no code block)
            actions_match = re.search(r'Actions:\s*(\[.*?\])', raw_response, re.DOTALL)
        if not actions_match:
            # Pattern 3: Look for JSON array anywhere after "Actions:"
            # Use balanced bracket matching
            actions_pos = raw_response.find('Actions:')
            if actions_pos != -1:
                # Find the opening bracket after "Actions:"
                bracket_pos = raw_response.find('[', actions_pos)
                if bracket_pos != -1:
                    # Count brackets to find the matching closing bracket
                    bracket_count = 0
                    end_pos = bracket_pos
                    for i in range(bracket_pos, len(raw_response)):
                        if raw_response[i] == '[':
                            bracket_count += 1
                        elif raw_response[i] == ']':
                            bracket_count -= 1
                            if bracket_count == 0:
                                end_pos = i + 1
                                break
                    if bracket_count == 0:
                        actions_str = raw_response[bracket_pos:end_pos]
                        # Clean up and parse directly
                        actions_str = re.sub(r'^```json\s*', '', actions_str, flags=re.IGNORECASE)
                        actions_str = re.sub(r'^```\s*', '', actions_str)
                        actions_str = re.sub(r'\s*```$', '', actions_str)
                        actions_str = actions_str.strip()
                        try:
                            actions_json = json.loads(actions_str)
                            actions = [ChatAction(**action) for action in actions_json]
                            response_text = re.sub(r'\nActions:.*$', '', response_text, flags=re.DOTALL).strip()
                            print(f"Successfully extracted {len(actions)} actions from AI response (bracket matching)")
                        except Exception as e:
                            print(f"Error parsing actions from bracket match: {e}")
                            actions_match = None  # Fall through to try other patterns
        
        if actions_match:
            try:
                # Extract the JSON string from the regex match
                actions_str = actions_match.group(1).strip()
                # Clean up the JSON string (remove markdown code blocks if present)
                actions_str = re.sub(r'^```json\s*', '', actions_str, flags=re.IGNORECASE)
                actions_str = re.sub(r'^```\s*', '', actions_str)
                actions_str = re.sub(r'\s*```$', '', actions_str)
                actions_str = actions_str.strip()
                
                actions_json = json.loads(actions_str)
                actions = [ChatAction(**action) for action in actions_json]
                # Remove actions section from response text
                response_text = re.sub(r'\nActions:.*$', '', response_text, flags=re.DOTALL).strip()
                print(f"Successfully extracted {len(actions)} actions from AI response")
            except Exception as e:
                print(f"Error parsing actions: {e}")
                try:
                    match_str = actions_match.group(1)
                    print(f"Actions string (first 500 chars): {match_str[:500] if len(match_str) > 500 else match_str}")
                except:
                    pass
                import traceback
                traceback.print_exc()
        
        # Also check if user message mentions updates and try to extract them (fallback if AI doesn't return actions)
        update_keywords = ["change", "update", "set", "modify", "edit", "my name is", "call me"]
        if any(keyword in req.message.lower() for keyword in update_keywords) and not actions:
            # Try to extract name changes with better patterns
            name_patterns = [
                r"(?:my name is|call me|name should be|change my name to|update my name to|set my name to)\s+([A-Za-z\s]+?)(?:\.|$|,|\s+and)",
                r"(?:name|it['']s|it is)\s*:?\s*([A-Za-z\s]+?)(?:\.|$|,|\s+and)",
                r"([A-Z][a-z]+\s+[A-Z][a-z]+)",  # Pattern like "Al Amin"
            ]
            for pattern in name_patterns:
                match = re.search(pattern, req.message, re.IGNORECASE)
                if match:
                    new_name = match.group(1).strip()
                    # Handle names like "Al Amin" - if it's two words, treat as first and last
                    name_parts = new_name.split()
                    action_data = {}
                    if len(name_parts) == 1:
                        # Single name - update first name only
                        action_data["firstName"] = name_parts[0]
                    elif len(name_parts) >= 2:
                        # Multiple words - first is first name, rest is last name
                        action_data["firstName"] = name_parts[0]
                        action_data["lastName"] = " ".join(name_parts[1:])
                    if action_data:
                        actions.append(ChatAction(type="update_user", data=action_data))
                        print(f"Extracted name change from message: {action_data}")
                    break
        
        # Store conversation in ChromaDB for future context
        conversation_text = f"User: {req.message}\nAssistant: {response_text}"
        doc_id = f"chat_{req.user_id}_{datetime.now().isoformat()}"
        
        try:
            # Generate embedding for the conversation
            emb = gemini_embedding([conversation_text])[0]
            collection.add(
                documents=[conversation_text],
                ids=[doc_id],
                embeddings=[emb],
                metadatas=[{
                    "user_id": req.user_id,
                    "type": "chat",
                    "timestamp": datetime.now().isoformat()
                }]
            )
        except Exception as e:
            print(f"Error storing chat conversation: {e}")
        
        return ChatResponse(
            response=response_text,
            conversation_id=doc_id,
            actions=actions
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

