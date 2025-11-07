import axios, { AxiosInstance } from 'axios';

// AI service base URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const http: AxiosInstance = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120000 // 2 minutes - increased for complex skill creation with milestones/resources
});

// Types mirror FastAPI Pydantic models (subset for onboarding)
export interface OnboardingStartRequest {
  user_id: string;
  first_name?: string | null;
}

export interface OnboardingAnswerRequest {
  user_id: string;
  answer: string;
}

export interface OnboardingResponse {
  question?: string | null;
  completed: boolean;
  structured_data?: Record<string, unknown> | null;
  next_step?: string | null;
}

export async function aiHealth(): Promise<any> {
  const { data } = await http.get('/health');
  return data;
}

export async function startOnboardingAI(payload: OnboardingStartRequest): Promise<OnboardingResponse> {
  const { data } = await http.post<OnboardingResponse>('/onboarding/start', payload);
  return data;
}

export async function answerOnboardingAI(payload: OnboardingAnswerRequest): Promise<OnboardingResponse> {
  const { data } = await http.post<OnboardingResponse>('/onboarding/answer', payload);
  return data;
}

// Ingest documents to ChromaDB
export interface DocItem {
  id?: string;
  text: string;
  meta?: Record<string, any>;
}

export interface IngestRequest {
  user_id: string;
  docs: DocItem[];
}

export async function ingestDocs(payload: IngestRequest): Promise<{ status: string; count: number }> {
  const { data } = await http.post<{ status: string; count: number }>('/ingest', payload);
  return data;
}

export async function planDay(payload: any): Promise<any> {
  const { data } = await http.post('/plan', payload);
  return data;
}

// Chat with AI
export interface ChatRequest {
  user_id: string;
  user_name?: string;
  message: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  structured_context?: string;
}

export interface ChatAction {
  type: string;
  data: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  conversation_id?: string;
  actions?: ChatAction[];
}

export async function chatAI(payload: ChatRequest): Promise<ChatResponse> {
  const { data } = await http.post<ChatResponse>('/chat', payload);
  return data;
}

// AI Insights for dashboard
export interface InsightsRequest {
  user_id: string;
  habits: any[];
  lifestyle_data: any[];
  journal_entries: any[];
}

export interface InsightsResponse {
  insights: string[];
}

export async function getAIInsights(payload: InsightsRequest): Promise<InsightsResponse> {
  const { data } = await http.post<InsightsResponse>('/insights', payload);
  return data;
}

// Skill Generation
export interface SkillSuggestionRequest {
  user_id: string;
  courses: any[];
  existing_skills: any[];
  education_level?: string;
  major?: string;
  unstructured_context?: string;
}

export interface SkillSuggestion {
  name: string;
  category: string;
  description: string;
  reason: string;
}

export interface SkillSuggestionsResponse {
  suggestions: SkillSuggestion[];
}

export interface SkillRoadmapRequest {
  user_id: string;
  skill_name: string;
  courses: any[];
  existing_skills: any[];
  education_level?: string;
  major?: string;
  unstructured_context?: string;
}

export interface SkillRoadmapResponse {
  name: string;
  category: string;
  level: string;
  description: string;
  goalStatement: string;
  durationMonths: number;
  estimatedHours: number;
  startDate: string;
  endDate: string;
  milestones: Array<{ name: string; order: number }>;
  resources: Array<{ title: string; type: string; url?: string; description?: string }>;
}

export async function getSkillSuggestions(payload: SkillSuggestionRequest): Promise<SkillSuggestionsResponse> {
  const { data } = await http.post<SkillSuggestionsResponse>('/generate-skill-suggestions', payload);
  return data;
}

export async function generateSkillRoadmap(payload: SkillRoadmapRequest): Promise<SkillRoadmapResponse> {
  const { data } = await http.post<SkillRoadmapResponse>('/generate-skill-roadmap', payload);
  return data;
}


