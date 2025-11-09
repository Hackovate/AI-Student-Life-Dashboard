# 📘 Momentum - Technical Documentation

> AI-powered student productivity platform that helps students manage academics, develop skills, track finances, and maintain healthy habits through intelligent automation.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [AI Implementation](#ai-implementation)
- [What AI Can Do](#what-ai-can-do)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [Security & Privacy](#security--privacy)
- [Performance](#performance)

---

## Overview

Momentum is an intelligent AI-powered productivity platform designed specifically for students. It combines modern web technologies with advanced AI to create a personalized assistant that understands natural language, remembers context, learns from behavior, and automates routine tasks.

**Key Differentiators:**
- 🤖 AI-first approach - every feature enhanced with intelligence
- 💬 Natural language interface - no complex UI learning required
- 🧠 Context-aware - remembers and learns from user behavior
- ⚡ Proactive assistance - suggests improvements before problems arise
- 🎯 Personalized experiences - every interaction tailored to individual needs

---

## Core Features

### 📚 Academic Management
- Course tracking with assignments and exam schedules
- Grade monitoring and performance analytics
- **AI-powered syllabus processing** - automatically extracts chapters, topics, and exam dates
- **AI-generated study plans** based on syllabus content
- Attendance tracking and records

### 📅 Daily Planner
- **AI-optimized scheduling** - automatically creates balanced daily plans
- Task management with priorities and deadlines
- **Adaptive time estimation** - learns from actual completion times
- **Auto-prioritization** - orders tasks by urgency and importance
- **Smart rebalancing** - adjusts schedules when you fall behind

### 🎯 Skill Development
- **AI-generated skill roadmaps** with milestones and learning resources
- Progress tracking with levels and achievements
- Personalized learning paths based on current knowledge
- Resource suggestions (tutorials, videos, documentation)

### 💰 Financial Management
- Income and expense tracking with categories
- Budget management and monitoring
- Savings goals and progress tracking
- **AI financial insights** - analyzes spending patterns
- Auto-categorization (coming soon)

### 🤖 AI Assistant (Chat)
- **Natural language interface** - talk to AI in plain English
- **Multi-action support** - one message triggers multiple actions
- **Context-aware** - remembers past conversations
- **Example**: "I have a Math exam on Nov 15, chapters 1-5" → Creates exam + 5 study tasks automatically

### 📊 Habit Tracking
- Daily habit monitoring (exercise, sleep, study time)
- Visual progress indicators
- **AI pattern analysis** - identifies consistency trends

### 📝 Journal & Reflection
- Daily journaling with mood tracking
- Emotional pattern analysis over time
- **AI-generated insights** from journal entries
- Mood correlation with lifestyle factors

### 📊 Analytics Dashboard
- **Comprehensive data visualization** - charts and graphs for all metrics
- Monthly statistics and trends
- Subject performance analysis
- Skills progress tracking
- Expense category breakdowns
- Weekly and daily task completion rates
- Time balance analysis (academic vs. personal)
- Income vs. expenses overview
- **AI-powered insights** - identifies patterns and trends

### 📈 AI Summaries
- **Daily summary** - analyzes tasks, habits, finances, and journal entries
- **Monthly summary** - aggregates data and identifies patterns
- **Notification summaries** - AI-generated insights sent as notifications
- Personalized productivity trends and recommendations

### 📱 Progressive Web App (PWA)
- Install as native app on any device
- Basic offline functionality
- Fully responsive (mobile, tablet, desktop)

---

## AI Implementation

### Architecture

```
┌─────────────────┐
│  React Frontend │
└────────┬────────┘
         │ REST API
┌────────▼────────┐
│ Express Backend │
└────────┬────────┘
         │ REST API
┌────────▼──────────────┐
│  FastAPI AI Service   │
├───────────────────────┤
│  • Google Gemini AI   │
│  • ChromaDB (Memory)  │
│  • LangChain (RAG)    │
└───────────────────────┘
```

### 1. Natural Language Processing (NLP)

**Technology:** Google Gemini 2.5 Flash

**How It Works:**
1. User message sent to AI service
2. Gemini analyzes message to understand:
   - User intent (what they want to do)
   - Entity extraction (dates, amounts, categories)
   - Context from previous messages
3. AI converts natural language to structured actions
4. Actions executed automatically

**Example:**
```
User: "I have a Math exam on November 15 covering chapters 1-5"
AI: Creates exam record + generates 5 study tasks + schedules them
```

### 2. Retrieval Augmented Generation (RAG)

**Technology:** ChromaDB + Gemini Embeddings

**How It Works:**
1. Conversations converted to embeddings (mathematical representations)
2. Embeddings stored in ChromaDB (vector database)
3. When user asks question, AI searches for similar past conversations
4. Relevant context retrieved and included in response
5. Responses become personalized and context-aware

**Benefits:**
- ✅ AI remembers past conversations
- ✅ Responses tailored to user's situation
- ✅ Understands user preferences and patterns

### 3. Predictive Analytics

**Technology:** Machine Learning + Pattern Recognition

**How It Works:**
- Analyzes task completion history
- Tracks actual vs. estimated time
- Identifies patterns (e.g., "User takes 2x longer than estimated")
- Adjusts future estimates based on actual pace
- Optimizes schedules to prevent overload

**Features:**
- Schedule optimization
- Time prediction
- Task prioritization

### 4. Intelligent Content Generation

**Technology:** Large Language Models (Gemini)

**How It Works:**
- Analyzes user profile (education, major, skills, courses)
- Retrieves relevant context from ChromaDB
- Generates personalized content using structured prompts
- Creates learning roadmaps, study plans, and summaries

**Capabilities:**
- Skill roadmap generation
- Syllabus processing and task creation
- Exam preparation schedules
- Daily/monthly summary generation

---

## What AI Can Do

### 🤖 Automation
- **Automatic task creation** - tell AI about exam, it creates all study tasks
- **Smart scheduling** - AI creates optimal daily schedules
- **Content generation** - skill roadmaps, study plans, summaries
- **Pattern recognition** - identifies behavior trends

### 🎯 Personalization
- **Context-aware responses** - every response considers user's situation
- **Adaptive learning** - adjusts to user's pace and preferences
- **Personalized recommendations** - suggestions tailored to goals
- **Customized content** - roadmaps and plans built for individual users

### 🧠 Intelligence
- **Predictive planning** - predicts task duration based on history
- **Proactive suggestions** - suggests improvements before problems
- **Insight generation** - identifies patterns user might not notice
- **Smart prioritization** - automatically orders tasks by importance

### 💬 Natural Interaction
- **Conversational interface** - talk to AI like a friend
- **Multi-action support** - one message triggers multiple actions
- **Context understanding** - remembers previous discussions
- **Intelligent questioning** - only asks for missing information

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|--------|
| React | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| TailwindCSS | Styling framework |

### Backend
| Technology | Purpose |
|------------|--------|
| Node.js | JavaScript runtime |
| Express | Web framework |
| Prisma | Database ORM |
| PostgreSQL | Relational database |

### AI Service
| Technology | Purpose |
|------------|--------|
| Python | AI/ML programming |
| FastAPI | API framework |
| Google Gemini 2.5 Flash | Language model |
| ChromaDB | Vector database |
| LangChain | AI orchestration |
| text-embedding-004 | Embedding model |

### Infrastructure
- **REST APIs** - Communication between services
- **PWA** - Progressive Web App support

### Data Storage
- **PostgreSQL** - Structured data (users, tasks, courses, finances)
- **ChromaDB** - Vector embeddings (conversations, context, memory)

---

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│         User Interface (React)       │
│  • Dashboard, Planner, Chat, etc.    │
└──────────────────┬──────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────┐
│      Backend Server (Express)        │
│  • API endpoints                     │
│  • Authentication                   │
│  • Database operations              │
└──────────────────┬──────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────┐
│      AI Service (FastAPI/Python)     │
│  ├── Google Gemini AI               │
│  │   └── Language understanding     │
│  └── ChromaDB                        │
│      └── Semantic memory storage     │
└──────────────────────────────────────┘
```

### Data Flow

**PostgreSQL** → Stores structured data (facts, records, user data)  
**ChromaDB** → Stores vector embeddings (conversations, context, semantic memory)

---

## Data Flow

### Example 1: Creating a Task via AI Chat

```mermaid
User Input → Frontend → Backend → AI Service
                                    ├── Convert to embedding
                                    ├── Search ChromaDB
                                    ├── Send to Gemini
                                    └── Return structured data
Backend ← AI Service
├── Create task in PostgreSQL
└── Store conversation in ChromaDB
Frontend ← Backend
└── Display new task
```

**Step-by-step:**
1. User types: "Add a task: Study for Math exam on Friday"
2. Frontend sends message to backend API
3. Backend forwards to AI service with user context
4. AI Service:
   - Converts message to embedding
   - Searches ChromaDB for relevant context
   - Sends message + context to Gemini
   - Gemini understands intent and extracts details
   - Returns structured response
5. Backend creates task in PostgreSQL
6. AI Service stores conversation in ChromaDB
7. Frontend displays new task

### Example 2: Generating Daily Schedule

**Step-by-step:**
1. User requests daily plan
2. Backend fetches tasks, courses, preferences from PostgreSQL
3. AI Service:
   - Retrieves relevant context from ChromaDB
   - Analyzes tasks, priorities, deadlines
   - Uses completion history to predict time needed
   - Generates optimized schedule using Gemini
4. Backend saves plan to PostgreSQL
5. Frontend displays personalized schedule

---

## Security & Privacy

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT tokens with secure storage |
| **Password Security** | bcrypt hashing (one-way encryption) |
| **Data Encryption** | HTTPS for all data in transit |
| **User Isolation** | Complete data separation per user |
| **Privacy** | No data sharing with third parties |

---

## Performance

| Metric | Value |
|--------|-------|
| **AI Response Time** | 2-3 seconds average |
| **Intent Accuracy** | High accuracy rate |
| **Context Relevance** | Improved with RAG |
| **Scalability** | Supports thousands of concurrent users |

---

