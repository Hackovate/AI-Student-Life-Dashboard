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
  try {
    console.log('Calling AI service /plan with payload:', JSON.stringify(payload, null, 2).substring(0, 500));
    const { data } = await http.post('/plan', payload);
    return data;
  } catch (error: any) {
    console.error('AI service planDay error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      }
    });
    throw error;
  }
}

export async function rebalanceDay(payload: any): Promise<any> {
  const { data } = await http.post('/rebalance', payload);
  return data;
}

export async function summarizeNotifications(notifications: any[]): Promise<string> {
  try {
    const { data } = await http.post('/summarize-notifications', { notifications });
    return data.summary || 'Summary unavailable';
  } catch (error: any) {
    console.error('AI service summarizeNotifications error:', error.response?.data || error.message);
    throw error;
  }
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

// Syllabus sync functions
export async function syncSyllabusToChromaDB(userId: string, courseId: string, syllabusText: string): Promise<void> {
  try {
    // Use the special syllabus ingest endpoint which handles deletion automatically
    await http.post('/ingest/syllabus', {
      user_id: userId,
      docs: [{
        id: `syllabus_${courseId}`,
        text: syllabusText,
        meta: {
          type: 'syllabus',
          course_id: courseId,
          timestamp: new Date().toISOString()
        }
      }]
    });
  } catch (error) {
    console.error('Error syncing syllabus to ChromaDB:', error);
    throw error;
  }
}

export async function deleteSyllabusFromChromaDB(userId: string, courseId: string): Promise<void> {
  try {
    // Call AI service to delete syllabus chunks (user_id as query parameter)
    await http.delete(`/ingest/syllabus/${courseId}?user_id=${userId}`);
  } catch (error: any) {
    // If endpoint doesn't exist yet, that's okay - we'll create it
    if (error.response?.status !== 404) {
      console.error('Error deleting syllabus from ChromaDB:', error);
      throw error;
    }
  }
}

export async function deleteContextFromChromaDB(userId: string): Promise<void> {
  try {
    // Call AI service to delete old context documents (user_id as query parameter)
    await http.delete(`/ingest/context?user_id=${userId}`);
  } catch (error: any) {
    // If endpoint doesn't exist yet, that's okay - we'll create it
    if (error.response?.status !== 404) {
      console.error('Error deleting context from ChromaDB:', error);
      throw error;
    }
  }
}

// Generate syllabus-based tasks
export interface SyllabusTask {
  title: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export interface GenerateSyllabusTasksRequest {
  user_id: string;
  course_id: string;
  syllabus_text: string;
  months: number;
}

export interface GenerateSyllabusTasksResponse {
  tasks: SyllabusTask[];
}

export async function generateSyllabusTasks(
  userId: string, 
  courseId: string, 
  syllabusText: string, 
  months: number
): Promise<SyllabusTask[]> {
  try {
    const { data } = await http.post<GenerateSyllabusTasksResponse>('/generate-syllabus-tasks', {
      user_id: userId,
      course_id: courseId,
      syllabus_text: syllabusText,
      months
    });
    return data.tasks;
  } catch (error) {
    console.error('Error generating syllabus tasks:', error);
    throw error;
  }
}

export interface SyllabusVerificationResponse {
  found: boolean;
  chunk_count: number;
  sample_chunks: string[];
  message: string;
}

export async function verifySyllabusInChromaDB(
  userId: string,
  courseId: string
): Promise<SyllabusVerificationResponse> {
  try {
    const { data } = await http.get<SyllabusVerificationResponse>(`/verify-syllabus/${courseId}`, {
      params: { user_id: userId }
    });
    return data;
  } catch (error) {
    console.error('Error verifying syllabus in ChromaDB:', error);
    throw error;
  }
}


