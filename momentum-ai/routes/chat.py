# routes/chat.py
import json
import re
import traceback
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models import ChatRequest, ChatResponse, ChatAction
from database import collection
from ai_client import call_gemini_generate, gemini_embedding
from utils import retrieve_user_context, determine_optimal_k, determine_context_types, summarize_long_context
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Text splitter for long conversations (smaller chunks for chat context)
conversation_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,  # Smaller chunks for conversations
    chunk_overlap=50,  # Small overlap for context
    length_function=len
)

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
        
        # Get current date for prompt
        current_date_iso = datetime.now().strftime('%Y-%m-%d')
        current_date_readable = datetime.now().strftime('%B %d, %Y')
        current_day = datetime.now().strftime('%A')
        
        # Optimized prompt - concise and direct for faster responses
        prompt = f"""Momentum AI Assistant. {name_greeting} Be friendly and concise.

CURRENT DATE: Today is {current_date_readable} ({current_day}). The date in YYYY-MM-DD format is {current_date_iso}.

RULES:
- Keep responses SHORT (2-3 sentences max unless complex question)
- For skill creation: Extract info from user message, generate milestones/resources quickly
- When creating/updating data: Provide a friendly response, then add "Actions:" followed by JSON array on a new line
- IMPORTANT: Do NOT include the Actions JSON in your response text - only show it after "Actions:" on a separate line
- The Actions section should be separate from your conversational response

EXAMPLE FORMAT:
User: "I want to learn CSS, 3 hours per week for 1 month starting Nov 13"
Assistant: Great! I'll set up your CSS learning plan for you. You'll be dedicating 3 hours per week for 1 month, starting November 13, 2025.

Actions:
[{{"type":"add_skill","data":{{"name":"CSS",...}}}}]

ACTIONS (include in Actions: JSON array):
- update_user: {{"type":"update_user","data":{{"firstName":"..."}}}}
- add_course: {{"type":"add_course","data":{{"name":"..." OR "courseName":"...","code":"..." OR "courseCode":"..." (optional),"description":"..." (optional),"group":"science|commerce|arts" (for school/college),"credits":N (optional, default 3 for university),"semester":"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8" (optional, for university),"year":1|2|3|4 (optional, for university),"status":"ongoing|completed|dropped" (optional, default "ongoing"),"progress":0-100 (optional, default 0),"attendance":0-100 (optional, default 0)}}}}
- add_skill: {{"type":"add_skill","data":{{"name":"...","category":"Technical|Creative|Soft Skills|Business|Language|Other","level":"beginner|intermediate|advanced|expert","description":"...","goalStatement":"...","durationMonths":N,"estimatedHours":N,"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","milestones":[{{"name":"...","order":0}}],"resources":[{{"title":"...","type":"link|video|note","url":"...","description":"..."}}]}}}}
- add_expense: {{"type":"add_expense","data":{{"amount":N,"category":"Food|Transport|Entertainment|Shopping|Bills|Education|Health|Other","description":"...","date":"YYYY-MM-DD","paymentMethod":"cash|card|digital|bank_transfer","recurring":false,"frequency":"weekly|monthly|yearly"}}}}
- update_expense: {{"type":"update_expense","data":{{"finance_id":"..." OR "description":"..." (find by description if ID not provided),"amount":N,"category":"Food|Transport|Entertainment|Shopping|Bills|Education|Health|Other","description":"...","date":"YYYY-MM-DD"}}}}
- add_income: {{"type":"add_income","data":{{"amount":N,"category":"Salary|Freelance|Gift|Other","description":"...","date":"YYYY-MM-DD","paymentMethod":"cash|card|digital|bank_transfer"}}}}
- update_income: {{"type":"update_income","data":{{"finance_id":"..." OR "description":"..." (find by description if ID not provided),"amount":N,"category":"Salary|Freelance|Gift|Other","description":"...","date":"YYYY-MM-DD"}}}}
- add_savings_goal: {{"type":"add_savings_goal","data":{{"title":"...","targetAmount":N,"category":"emergency|vacation|education|investment|other","dueDate":"YYYY-MM-DD","description":"...","priority":"high|medium|low"}}}}
- update_savings_goal: {{"type":"update_savings_goal","data":{{"goal_id":"...","title":"...","targetAmount":N,"currentAmount":N,"dueDate":"YYYY-MM-DD","status":"active|completed|cancelled"}}}}
- delete_finance: {{"type":"delete_finance","data":{{"finance_id":"..." OR "description":"..." (find by description if ID not provided)}}}}
- add_journal: {{"type":"add_journal","data":{{"title":"...","content":"...","mood":"happy|sad|neutral|anxious|excited|tired|energetic","tags":["tag1","tag2"],"date":"YYYY-MM-DD"}}}}
- update_journal: {{"type":"update_journal","data":{{"journal_id":"...","title":"...","content":"...","mood":"...","tags":["..."]}}}}
- delete_journal: {{"type":"delete_journal","data":{{"journal_id":"..."}}}}
- add_lifestyle: {{"type":"add_lifestyle","data":{{"date":"YYYY-MM-DD","sleepHours":N,"exerciseMinutes":N,"waterIntake":N,"mealQuality":"excellent|good|fair|poor","stressLevel":1-10,"notes":"..."}}}}
- update_lifestyle: {{"type":"update_lifestyle","data":{{"lifestyle_id":"...","sleepHours":N,"exerciseMinutes":N,"waterIntake":N,"mealQuality":"...","stressLevel":N,"notes":"..."}}}}
- delete_lifestyle: {{"type":"delete_lifestyle","data":{{"lifestyle_id":"..."}}}}
- add_habit: {{"type":"add_habit","data":{{"name":"...","target":"...","time":"HH:MM","color":"from-blue-500 to-cyan-500","icon":"..."}}}}
- update_habit: {{"type":"update_habit","data":{{"habit_id":"...","name":"...","target":"...","time":"HH:MM","color":"...","icon":"..."}}}}
- delete_habit: {{"type":"delete_habit","data":{{"habit_id":"..."}}}}
- toggle_habit: {{"type":"toggle_habit","data":{{"habit_id":"..."}}}}
- add_schedule: {{"type":"add_schedule","data":{{"courseId":"..." OR "courseName":"...","day":"Mon|Tue|Wed|Thu|Fri|Sat|Sun","time":"HH:MM" (e.g., "09:00"),"type":"Lecture|Lab|Tutorial" (optional),"location":"..." (optional)}}}}
- update_schedule: {{"type":"update_schedule","data":{{"schedule_id":"...","day":"Mon|Tue|Wed|Thu|Fri|Sat|Sun","time":"HH:MM","type":"Lecture|Lab|Tutorial","location":"..."}}}}
- delete_schedule: {{"type":"delete_schedule","data":{{"schedule_id":"..."}}}}
- mark_attendance: {{"type":"mark_attendance","data":{{"courseId":"..." OR "courseName":"...","classScheduleId":"..." OR "day":"Mon|Tue|Wed|Thu|Fri|Sat|Sun" AND "time":"HH:MM","status":"present|absent|late","date":"YYYY-MM-DD" (optional, default today),"notes":"..." (optional)}}}}
- update_attendance: {{"type":"update_attendance","data":{{"attendance_id":"...","status":"present|absent|late","notes":"..." (optional)}}}}
- delete_attendance: {{"type":"delete_attendance","data":{{"attendance_id":"..."}}}}
- add_assignment: {{"type":"add_assignment","data":{{"courseId":"..." OR "courseName":"...","title":"...","description":"..." (optional),"dueDate":"YYYY-MM-DD" (optional),"startDate":"YYYY-MM-DD" (optional),"estimatedHours":N (optional),"status":"pending|in_progress|completed" (optional, default "pending"),"points":N (optional)}}}}
- update_assignment: {{"type":"update_assignment","data":{{"assignment_id":"...","title":"...","description":"...","dueDate":"YYYY-MM-DD","startDate":"YYYY-MM-DD","estimatedHours":N,"status":"pending|in_progress|completed","points":N}}}}
- delete_assignment: {{"type":"delete_assignment","data":{{"assignment_id":"..."}}}}

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
    * IMPORTANT: If user says "today" or "now", use {current_date_iso}
    * If user says "next week" or similar, calculate from {current_date_iso}
  - endDate (calculate: startDate + durationMonths)
  - description (brief, from goal)
  - goalStatement (specific learning goal)
  - milestones (3-5 progressive)
  - resources (2-4 learning resources)

  If user provides partial info → Ask for missing pieces, DO NOT create yet.
  Only create when user says "that's all", "create it", or provides complete info.

COURSE CREATION RULES:
- CRITICAL: Check user's education level from structured context to determine required fields
- Education level is shown in context as "Education: school|college|university, Class: X, Year: X, Group: X"

- For SCHOOL/COLLEGE users (education level is "school" or "college"):
  * Required: Subject name (courseName/name)
  * Required: Group (science/commerce/arts) - Check if user is in class 9-10 (school) or any college year
    - If user is in class 9-10 (school) or college → Group is REQUIRED
    - If user is in class 6-8 (school) → Group is NOT required
  * DO NOT ask for: course code, credits, semester, year (these are not used for school/college)
  * Example: "I want to add Physics" → Ask: "Which group is Physics in? (Science, Commerce, or Arts)"
  * When creating: Set courseCode to null, credits to null, description to group value

- For UNIVERSITY users (education level is "university"):
  * Required: Course name (courseName/name)
  * Optional but recommended: Course code (code/courseCode), credits (default 3), semester (1-8), year (1-4)
  * Optional: Status (ongoing/completed/dropped, default "ongoing"), description, progress (0-100, default 0), attendance (0-100, default 0)
  * Example: "I want to add Data Structures" → Ask: "What's the course code? How many credits? Which semester and year?"
  * Ask for ALL missing info in ONE message: "I need a few details: What's the course code? How many credits? Which semester (1-8) and year (1-4)? What's the status (ongoing/completed/dropped)?"
  * Only create when user provides complete info or explicitly says "create it" / "that's all"

- IMPORTANT: Ask for ALL missing information in ONE message, then create when complete
- DO NOT create course with partial information - wait for user to provide all required fields
- If user provides partial info → Ask for remaining fields in one message
- Only create when user says "that's all", "create it", "add it", or provides all required information

COURSE MANAGEMENT RULES:
- When user mentions a course/subject, identify it by name from "Courses/Subjects" in context
- Course names are shown in context - use partial matching if needed (e.g., "Physics" matches "Physics 1st Paper")
- For schedule operations:
  * Required: courseName (or courseId), day (Mon/Tue/Wed/Thu/Fri/Sat/Sun), time (HH:MM format)
  * Optional: type (Lecture/Lab/Tutorial), location
  * Ask for missing info in one message: "I need: Which day? What time? Type (Lecture/Lab/Tutorial)? Location?"
  * Example: "Add schedule for Physics" → Ask: "Which day? What time? What type (Lecture/Lab/Tutorial)? Any location?"
- For attendance operations:
  * Required: courseName (or courseId), classScheduleId (or identify by day/time), status (present/absent/late)
  * Optional: date (default today), notes
  * If classScheduleId not provided, identify schedule from course's schedule list by day/time
  * Example: "Mark me present for Physics Monday class" → Find Monday schedule for Physics, mark present
- For assignment operations:
  * Required: courseName (or courseId), title
  * Optional: description, dueDate, startDate, estimatedHours, status (pending/in_progress/completed), points
  * Ask for missing info: "I need: What's the title? When is it due? Any description? Estimated hours?"
  * Example: "Add assignment for Data Structures" → Ask: "What's the assignment title? When is it due? Any description?"
- For performance queries (e.g., "How's my performance in X?", "Tell me about X course", "When was I last present in X?", "How many times was I absent this month?"):
  * DO NOT create actions
  * Analyze course data from context (attendance %, progress %, assignments, exams, schedules, attendance records)
  * Use "Recent Attendance" and "Attendance Stats" from context to answer detailed attendance questions
  * For questions like "When was I last present?", check Recent Attendance records and find the most recent "present" or "late" status
  * For questions like "How many absences this month?", count "absent" statuses from Recent Attendance records within the current month
  * Return insights as natural language response
  * Provide specific metrics and recommendations
  * Example: "Your attendance in Physics is 85%. You have 2 pending assignments. Progress is at 60%. Recent attendance: Dec 15: present, Dec 12: absent, Dec 10: present."

DUPLICATE PREVENTION:
- Check "Current Skills" in context - if skill name already exists, use update_skill action instead of add_skill
- Check "Courses/Subjects" in context - if course/subject name already exists, inform user and ask if they want to update it
- NEVER create duplicate courses/subjects with the same name
- If user mentions adding a course/subject that exists → Ask if they want to update it instead

FINANCE RULES:
- For expenses: Extract amount, category, description, date from user message
  * IMPORTANT: If user doesn't specify a date, ALWAYS use today's date ({current_date_iso})
  * Only use a different date if user explicitly mentions it (e.g., "yesterday", "last week", specific date)
  * ALWAYS infer category from description (e.g., "fuchka", "food", "groceries" → "Food"; "bus", "taxi", "uber" → "Transport"; "movie", "netflix" → "Entertainment"; "shirt", "shopping" → "Shopping"; "rent", "electricity" → "Bills"; "book", "course" → "Education"; "medicine", "doctor" → "Health")
  * If category cannot be inferred, use "Other"
  * Valid categories: Food, Transport, Entertainment, Shopping, Bills, Education, Health, Other
- For income: Extract amount, category, description, date from user message
  * IMPORTANT: If user doesn't specify a date, ALWAYS use today's date ({current_date_iso})
  * Only use a different date if user explicitly mentions it (e.g., "yesterday", "last week", specific date)
  * Valid categories: Salary, Freelance, Gift, Other
- For updating expenses/income: Use update_expense or update_income action
  * You can find expenses by description (e.g., "internet utilities", "fuchka") - check "Recent Finances" in context
  * If user says "change category of X" or "fix category of X", use update_expense with description to find it
  * You can update: amount, category, description, date
- For deleting expenses/income: Use delete_finance action
  * You can find by description (e.g., "delete internet utilities") - check "Recent Finances" in context
  * If description matches multiple, use the most recent one
- For savings goals: Extract title, target amount, category, due date, priority
  * IMPORTANT: For due dates, use future dates. If user doesn't specify, ask for a target date.
- If user asks "How can I save money?" or "Show me spending analysis" → Use analyze_finances (return analysis as text, not action)
- Calculate savings suggestions based on income vs expenses ratio
- Identify top spending categories and suggest cuts

JOURNAL & LIFESTYLE RULES:
- For journal entries: Extract title, content, mood, tags, date from user message
  * IMPORTANT: If user doesn't specify a date, ALWAYS use today's date ({current_date_iso})
  * Only use a different date if user explicitly mentions it (e.g., "yesterday", "last week", specific date)
  * Current date is {current_date_readable} ({current_day})
- For lifestyle tracking: Extract sleep hours, exercise minutes, water intake, meal quality, stress level, date
  * IMPORTANT: If user doesn't specify a date, ALWAYS use today's date ({current_date_iso})
- If user asks "How's my mood been?" or "Am I sleeping enough?" → Use analyze_lifestyle (return analysis as text, not action)
- Correlate lifestyle factors (sleep, exercise) with mood/stress from journal entries
- Provide actionable recommendations based on patterns

HABIT RULES:
- For habits: Extract name, target (e.g., "30 minutes daily"), time (e.g., "7:00 AM"), color, icon
- Support any type of habit (exercise, reading, meditation, etc.)
- For toggle: Mark habit as completed/incomplete for today
- If user says "I completed [habit name]" → Use toggle_habit action

ANALYSIS MODE:
- When user asks analysis questions (e.g., "How am I spending?", "How's my mood?", "Am I consistent with habits?"):
  * DO NOT create actions
  * Analyze the data from context
  * Return insights as natural language response
  * Provide specific, actionable suggestions

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
        
        # Improved JSON extraction using balanced bracket matching
        # This handles nested JSON structures properly
        actions_pos = raw_response.find('Actions:')
        if actions_pos != -1:
            # Find the opening bracket after "Actions:"
            # Skip past any code block markers
            search_start = actions_pos + len('Actions:')
            bracket_pos = raw_response.find('[', search_start)
            
            if bracket_pos != -1:
                # Use balanced bracket matching to find the complete JSON array
                # This handles nested arrays and objects correctly
                bracket_count = 0
                brace_count = 0  # Also track braces for nested objects
                in_string = False
                escape_next = False
                end_pos = bracket_pos
                
                for i in range(bracket_pos, len(raw_response)):
                    char = raw_response[i]
                    
                    if escape_next:
                        escape_next = False
                        continue
                    
                    if char == '\\':
                        escape_next = True
                        continue
                    
                    if char == '"' and not escape_next:
                        in_string = not in_string
                        continue
                    
                    if not in_string:
                        if char == '[':
                            bracket_count += 1
                        elif char == ']':
                            bracket_count -= 1
                            if bracket_count == 0:
                                end_pos = i + 1
                                break
                        elif char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                
                if bracket_count == 0:
                    # Extract the JSON string
                    actions_str = raw_response[bracket_pos:end_pos]
                    
                    # Clean up markdown code blocks if present
                    actions_str = re.sub(r'^```json\s*', '', actions_str, flags=re.IGNORECASE | re.MULTILINE)
                    actions_str = re.sub(r'^```\s*', '', actions_str, flags=re.MULTILINE)
                    actions_str = re.sub(r'\s*```$', '', actions_str, flags=re.MULTILINE)
                    actions_str = actions_str.strip()
                    
                    # Try to parse the JSON
                    try:
                        actions_json = json.loads(actions_str)
                        if isinstance(actions_json, list):
                            actions = [ChatAction(**action) for action in actions_json]
                            # Remove the entire Actions section from response text
                            # Remove from "Actions:" to the end of the JSON array
                            response_text = raw_response[:actions_pos].strip()
                            # Also remove any trailing newlines or markdown
                            response_text = re.sub(r'\n+$', '', response_text)
                            print(f"Successfully extracted {len(actions)} actions from AI response")
                        else:
                            print(f"Warning: Actions JSON is not a list: {type(actions_json)}")
                    except json.JSONDecodeError as e:
                        print(f"Error parsing actions JSON: {e}")
                        print(f"Actions string (first 1000 chars): {actions_str[:1000] if len(actions_str) > 1000 else actions_str}")
                        # Try to fix common JSON issues
                        try:
                            # Try to complete truncated JSON by adding closing brackets
                            fixed_str = actions_str
                            if bracket_count > 0:
                                fixed_str += ']' * bracket_count
                            if brace_count > 0:
                                fixed_str += '}' * brace_count
                            actions_json = json.loads(fixed_str)
                            if isinstance(actions_json, list):
                                actions = [ChatAction(**action) for action in actions_json]
                                response_text = raw_response[:actions_pos].strip()
                                response_text = re.sub(r'\n+$', '', response_text)
                                print(f"Successfully extracted {len(actions)} actions after fixing truncated JSON")
                        except Exception as e2:
                            print(f"Failed to fix truncated JSON: {e2}")
                            traceback.print_exc()
                    except Exception as e:
                        print(f"Error processing actions: {e}")
                        traceback.print_exc()
                else:
                    print(f"Warning: Unbalanced brackets in Actions JSON (bracket_count={bracket_count})")
        
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
        base_doc_id = f"chat_{req.user_id}_{datetime.now().isoformat()}"
        
        try:
            # For long conversations, chunk them for better retrieval
            # Short conversations (<500 chars) stored as single document
            if len(conversation_text) > 500:
                # Split long conversation into chunks
                chunks = conversation_splitter.split_text(conversation_text)
                
                # Generate embeddings for all chunks at once (more efficient)
                embeddings = gemini_embedding(chunks)
                
                # Prepare metadata and IDs for all chunks
                chunk_ids = []
                chunk_metadatas = []
                
                for i, chunk in enumerate(chunks):
                    chunk_id = f"{base_doc_id}_chunk_{i}"
                    chunk_ids.append(chunk_id)
                    chunk_metadatas.append({
                        "user_id": req.user_id,
                        "type": "chat",
                        "timestamp": datetime.now().isoformat(),
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "source_doc_id": base_doc_id,
                        "is_chunk": True
                    })
                
                # Batch add chunks to ChromaDB
                collection.add(
                    documents=chunks,
                    ids=chunk_ids,
                    embeddings=embeddings,
                    metadatas=chunk_metadatas
                )
            else:
                # Short conversation - store as single document
                emb = gemini_embedding([conversation_text])[0]
                collection.add(
                    documents=[conversation_text],
                    ids=[base_doc_id],
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
            conversation_id=base_doc_id,
            actions=actions
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

