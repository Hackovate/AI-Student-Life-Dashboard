// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// Remove auth token from localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

// Generic API request handler
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    // Add timeout for long-running requests (like skill creation with milestones/resources)
    const timeout = 180000; // 3 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Something went wrong');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - the operation is taking longer than expected. Please try again.');
      }
      throw error;
    }
    throw new Error('Network error occurred');
  }
};

// Auth API
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    const response = await apiRequest<{
      user: any;
      token: string;
      message: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(response.token);
    return response;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiRequest<{
      user: any;
      token: string;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(response.token);
    return response;
  },

  logout: () => {
    removeAuthToken();
  },

  getProfile: async () => {
    return apiRequest<{ user: any }>('/auth/profile');
  },
};

// Academics API
export const academicsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/academics');
  },

  create: async (data: any) => {
    return apiRequest<any>('/academics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/academics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/academics/${id}`, {
      method: 'DELETE',
    });
  },
};

// Courses API (same as academics endpoints)
export const coursesAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/academics');
  },
  create: async (data: any) => {
    return apiRequest<any>('/academics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest<any>(`/academics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/academics/${id}`, {
      method: 'DELETE',
    });
  },
  // schedule/assignments/exams nested endpoints
  getSchedule: async (courseId: string) => apiRequest<any[]>(`/academics/${courseId}/schedule`),
  createSchedule: async (courseId: string, data: any) => apiRequest<any>(`/academics/${courseId}/schedule`, { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: async (id: string, data: any) => apiRequest<any>(`/academics/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: async (id: string) => apiRequest<{ message: string }>(`/academics/schedule/${id}`, { method: 'DELETE' }),

  getAssignments: async (courseId: string) => apiRequest<any[]>(`/academics/${courseId}/assignments`),
  createAssignment: async (courseId: string, data: any) => apiRequest<any>(`/academics/${courseId}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: async (id: string, data: any) => apiRequest<any>(`/academics/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: async (id: string) => apiRequest<{ message: string }>(`/academics/assignments/${id}`, { method: 'DELETE' }),

  getExams: async (courseId: string) => apiRequest<any[]>(`/academics/${courseId}/exams`),
  createExam: async (courseId: string, data: any) => apiRequest<any>(`/academics/${courseId}/exams`, { method: 'POST', body: JSON.stringify(data) }),
  updateExam: async (id: string, data: any) => apiRequest<any>(`/academics/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExam: async (id: string) => apiRequest<{ message: string }>(`/academics/exams/${id}`, { method: 'DELETE' }),

  // Syllabus endpoints
  updateSyllabus: async (courseId: string, syllabus: string) => 
    apiRequest<any>(`/academics/${courseId}/syllabus`, { 
      method: 'PUT', 
      body: JSON.stringify({ syllabus }) 
    }),
  deleteSyllabus: async (courseId: string) => 
    apiRequest<{ message: string; course: any }>(`/academics/${courseId}/syllabus`, { 
      method: 'DELETE' 
    }),
      generateSyllabusTasks: async (courseId: string, months: number) => 
        apiRequest<{ message: string; assignments: any[] }>(`/academics/${courseId}/syllabus/generate`, { 
          method: 'POST', 
          body: JSON.stringify({ months }) 
        }),
      verifySyllabus: async (courseId: string) => 
        apiRequest<{ found: boolean; chunk_count: number; sample_chunks: string[]; message: string }>(`/academics/${courseId}/syllabus/verify`, { 
          method: 'GET' 
        }),
};

// Attendance API
export const attendanceAPI = {
  // Get today's class schedules with attendance status
  getTodaysClasses: async (courseId: string) => 
    apiRequest<any[]>(`/attendance/${courseId}/today`),
  
  // Get all class schedules with attendance history
  getAllSchedules: async (courseId: string) => 
    apiRequest<any[]>(`/attendance/${courseId}/all`),
  
  // Mark attendance for a specific class schedule
  markAttendance: async (courseId: string, classScheduleId: string, status: string, date?: string, notes?: string) => 
    apiRequest<any>(`/attendance/${courseId}/mark`, { 
      method: 'POST', 
      body: JSON.stringify({ classScheduleId, status, date, notes }) 
    }),
  
  // Delete attendance record
  deleteRecord: async (recordId: string) => 
    apiRequest<{ message: string; attendancePercentage: number }>(`/attendance/${recordId}`, { 
      method: 'DELETE' 
    }),
  
  // Get attendance statistics (schedule-based)
  getStats: async (courseId: string) => 
    apiRequest<any>(`/attendance/${courseId}/stats`),
};

// Finance API
export const financeAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/finances');
  },

  create: async (data: {
    category: string;
    amount: number;
    description: string;
    date?: string;
    type?: 'income' | 'expense' | 'savings';
    paymentMethod?: string;
    recurring?: boolean;
    frequency?: string;
    goalId?: string;
  }) => {
    return apiRequest<any>('/finances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/finances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/finances/${id}`, {
      method: 'DELETE',
    });
  },

  // New summary endpoints
  getMonthlySummary: async () => {
    return apiRequest<{
      totalIncome: number;
      totalExpenses: number;
      balance: number;
      netSavings: number;
    }>('/finances/summary/monthly');
  },

  getCategoryBreakdown: async (type: 'income' | 'expense' = 'expense') => {
    return apiRequest<Record<string, number>>(`/finances/summary/categories?type=${type}`);
  },

  getAIInsights: async () => {
    return apiRequest<{
      message: string;
      insights: any[];
      recommendations: any[];
    }>('/finances/ai-insight');
  },
};

// Savings Goal API
export const savingsGoalAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/savings');
  },

  create: async (data: {
    title: string;
    targetAmount: number;
    category?: string;
    dueDate?: string;
    description?: string;
    priority?: string;
  }) => {
    return apiRequest<any>('/savings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/savings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/savings/${id}`, {
      method: 'DELETE',
    });
  },

  getProgress: async (id: string) => {
    return apiRequest<any>(`/savings/${id}/progress`);
  },
};

// Monthly Budget API
export const monthlyBudgetAPI = {
  getAll: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any[]>(`/monthly-budgets${query}`);
  },

  create: async (data: {
    title: string;
    targetAmount: number;
    category?: string;
    month?: number;
    year?: number;
    description?: string;
    priority?: string;
  }) => {
    return apiRequest<any>('/monthly-budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/monthly-budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/monthly-budgets/${id}`, {
      method: 'DELETE',
    });
  },

  getProgress: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any[]>(`/monthly-budgets/progress${query}`);
  },
};

export const journalAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/journals');
  },

  getById: async (id: string) => {
    return apiRequest<any>(`/journals/${id}`);
  },

  create: async (data: any) => {
    return apiRequest<any>('/journals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/journals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/journals/${id}`, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const tasksAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/tasks');
  },

  create: async (data: any) => {
    return apiRequest<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

// Skills API
// Skills API
export const skillsAPI = {
  // Skills CRUD
  getAll: async () => {
    return apiRequest<any[]>('/skills');
  },

  getById: async (id: string) => {
    return apiRequest<any>(`/skills/${id}`);
  },

  create: async (data: any) => {
    return apiRequest<any>('/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/skills/${id}`, {
      method: 'DELETE',
    });
  },

  getStats: async (id: string) => {
    return apiRequest<any>(`/skills/${id}/stats`);
  },

  // Milestones
  getMilestones: async (skillId: string) => {
    return apiRequest<any[]>(`/skills/${skillId}/milestones`);
  },

  addMilestone: async (skillId: string, data: { 
    name: string; 
    completed?: boolean; 
    status?: string; 
    dueDate?: string; 
    startDate?: string;
    order?: number;
    estimatedHours?: number;
    progressPercentage?: number;
    actualHoursSpent?: number;
    daysAllocated?: number;
    currentDay?: number;
  }) => {
    return apiRequest<any>(`/skills/${skillId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMilestone: async (milestoneId: string, data: { 
    name?: string; 
    completed?: boolean; 
    status?: string; 
    dueDate?: string; 
    startDate?: string;
    order?: number;
    estimatedHours?: number;
    progressPercentage?: number;
    actualHoursSpent?: number;
    daysAllocated?: number;
    currentDay?: number;
  }) => {
    return apiRequest<any>(`/skills/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggleMilestone: async (milestoneId: string) => {
    return apiRequest<any>(`/skills/milestones/${milestoneId}/toggle`, {
      method: 'PATCH',
    });
  },

  deleteMilestone: async (milestoneId: string) => {
    return apiRequest<{ message: string }>(`/skills/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
  },

  // Learning Resources
  getResources: async (skillId: string) => {
    return apiRequest<any[]>(`/skills/${skillId}/resources`);
  },

  addResource: async (skillId: string, data: { title: string; type: string; url?: string; content?: string; description?: string }) => {
    return apiRequest<any>(`/skills/${skillId}/resources`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateResource: async (resourceId: string, data: { title?: string; type?: string; url?: string; content?: string; description?: string }) => {
    return apiRequest<any>(`/skills/resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteResource: async (resourceId: string) => {
    return apiRequest<{ message: string }>(`/skills/resources/${resourceId}`, {
      method: 'DELETE',
    });
  },

  // AI Recommendations
  getRecommendations: async () => {
    return apiRequest<any[]>('/skills/recommendations/all');
  },

  generateRecommendations: async () => {
    return apiRequest<any[]>('/skills/recommendations/generate', {
      method: 'POST',
    });
  },

  // AI Skill Generation
  getSuggestions: async () => {
    return apiRequest<{ suggestions: Array<{ name: string; category: string; description: string; reason: string }> }>('/skills/generate/suggestions');
  },

  generateRoadmap: async (skillName: string) => {
    return apiRequest<{
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
    }>('/skills/generate/roadmap', {
      method: 'POST',
      body: JSON.stringify({ skillName }),
    });
  },

  completeRecommendation: async (recommendationId: string) => {
    return apiRequest<any>(`/skills/recommendations/${recommendationId}/complete`, {
      method: 'PATCH',
    });
  },

  deleteRecommendation: async (recommendationId: string) => {
    return apiRequest<{ message: string }>(`/skills/recommendations/${recommendationId}`, {
      method: 'DELETE',
    });
  },
};

// Lifestyle API
export const lifestyleAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/lifestyle');
  },

  create: async (data: any) => {
    return apiRequest<any>('/lifestyle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiRequest<any>(`/lifestyle/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/lifestyle/${id}`, {
      method: 'DELETE',
    });
  },
};

// Onboarding API
export const onboardingAPI = {
  start: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        question: string;
        completed: boolean;
        next_step: string;
      };
    }>('/onboarding/start', {
      method: 'POST',
    });
  },

  submitAnswer: async (answer: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        question?: string;
        completed: boolean;
        structured_data?: any;
        next_step?: string;
      };
    }>('/onboarding/answer', {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  },

  getStatus: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        completed: boolean;
        userData: any;
      };
    }>('/onboarding/status');
  },

  submit: async (data: any) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// AI Chat API
export const aiChatAPI = {
  chat: async (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    return apiRequest<{
      success: boolean;
      data: {
        response: string;
        conversation_id?: string;
        actions?: Array<{
          type: string;
          data: Record<string, any>;
        }>;
        actionResults?: Array<{
          type: string;
          success: boolean;
          data?: Record<string, any>;
          error?: string;
        }>;
      };
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: conversationHistory || [] }),
    });
  },

  generateDailySummary: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        summary: string;
        stats: any;
      };
    }>('/ai/summary/daily', {
      method: 'POST',
    });
  },

  generateMonthlySummary: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        summary: string;
        stats: any;
      };
    }>('/ai/summary/monthly', {
      method: 'POST',
    });
  },
};

// Habits API
export const habitsAPI = {
  getAll: async () => {
    return apiRequest<Array<{
      id: string;
      name: string;
      target: string;
      time: string;
      streak: number;
      completed: boolean;
      color: string;
      icon: string;
      completionHistory?: Array<{ date: string; completed: boolean }>;
      createdAt: string;
      updatedAt: string;
    }>>('/habits');
  },
  getById: async (id: string) => {
    return apiRequest<{
      id: string;
      name: string;
      target: string;
      time: string;
      streak: number;
      completed: boolean;
      color: string;
      icon: string;
      completionHistory?: Array<{ date: string; completed: boolean }>;
      createdAt: string;
      updatedAt: string;
    }>(`/habits/${id}`);
  },
  create: async (data: {
    name: string;
    target: string;
    time: string;
    color?: string;
    icon?: string;
    streak?: number;
    completed?: boolean;
    completionHistory?: Array<{ date: string; completed: boolean }>;
  }) => {
    return apiRequest<{
      id: string;
      name: string;
      target: string;
      time: string;
      streak: number;
      completed: boolean;
      color: string;
      icon: string;
      completionHistory?: Array<{ date: string; completed: boolean }>;
      createdAt: string;
      updatedAt: string;
    }>('/habits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: {
    name?: string;
    target?: string;
    time?: string;
    color?: string;
    icon?: string;
    streak?: number;
    completed?: boolean;
    completionHistory?: Array<{ date: string; completed: boolean }>;
  }) => {
    return apiRequest<{
      id: string;
      name: string;
      target: string;
      time: string;
      streak: number;
      completed: boolean;
      color: string;
      icon: string;
      completionHistory?: Array<{ date: string; completed: boolean }>;
      createdAt: string;
      updatedAt: string;
    }>(`/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  toggle: async (id: string) => {
    return apiRequest<{
      id: string;
      name: string;
      target: string;
      time: string;
      streak: number;
      completed: boolean;
      color: string;
      icon: string;
      completionHistory?: Array<{ date: string; completed: boolean }>;
      createdAt: string;
      updatedAt: string;
    }>(`/habits/${id}/toggle`, {
      method: 'PATCH',
    });
  },
  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/habits/${id}`, {
      method: 'DELETE',
    });
  },
};

// Analytics API
export const analyticsAPI = {
  getAll: async () => {
    return apiRequest<{
      monthlyStats: {
        tasksCompleted: number;
        studyHours: number;
        savingsRate: number;
        wellnessScore: number;
        skillProgress: number;
      };
      subjectPerformance: Array<{
        id: string;
        name: string;
        code: string;
        progress: number;
        grade: string;
        score: number;
        trend: 'up' | 'down' | 'neutral';
        assignments: number;
        nextClass: string;
      }>;
      skills: Array<{
        id: string;
        name: string;
        category: string;
        progress: number;
        gradient: string;
        milestones: Array<{ name: string; completed: boolean }>;
        nextTask: string;
        resources: number;
        timeSpent: string;
      }>;
      expenses: Array<{
        id: string;
        category: string;
        amount: number;
        description: string;
        date: string;
        type: 'expense' | 'income';
        paymentMethod?: string;
        recurring?: boolean;
        frequency?: string;
      }>;
      expenseCategories: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
      weeklyTaskCompletion: Array<{
        week: string;
        completed: number;
        total: number;
      }>;
      dailyTaskCompletion: { [key: string]: { completed: number; total: number } };
      achievements: Array<{
        id: number;
        title: string;
        description: string;
        icon: string;
      }>;
      totalIncome: number;
      totalExpenses: number;
      timeBalance: {
        study: number;
        skills: number;
        lifestyle: number;
        social: number;
        rest: number;
      };
    }>('/analytics');
  },
};

export default {
  auth: authAPI,
  academics: academicsAPI,
  finance: financeAPI,
  savingsGoal: savingsGoalAPI,
  monthlyBudget: monthlyBudgetAPI,
  journal: journalAPI,
  tasks: tasksAPI,
  skills: skillsAPI,
  lifestyle: lifestyleAPI,
  courses: coursesAPI,
  onboarding: onboardingAPI,
  analytics: analyticsAPI,
  habits: habitsAPI,
};

// AI Planning API
export const planningAPI = {
  generateDailyPlan: async (data: {
    date_iso: string;
    tasks: any[];
    classes: any[];
    available_times?: any[];
    preferences?: any;
  }) => {
    return apiRequest<any>('/ai/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  rebalanceDailyPlan: async (data: {
    date_iso: string;
    incomplete_tasks: any[];
    completion_history?: any;
    preferences?: any;
  }) => {
    return apiRequest<any>('/ai/plan/rebalance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const learningAPI = {
  savePattern: async (data: {
    taskType: string;
    estimatedHours: number;
    actualHours: number;
    estimatedDays: number;
    actualDays: number | null;
    completionRate: number;
    progressRate: number | null;
  }) => apiRequest<any>('/learning/patterns', { method: 'POST', body: JSON.stringify(data) }),
  
  getPatterns: async (taskType?: string) => {
    const query = taskType ? `?taskType=${taskType}` : '';
    return apiRequest<any>(`/learning/patterns${query}`);
  },
  
  predict: async (data: {
    taskType: string;
    estimatedHours: number;
    estimatedDays: number;
  }) => apiRequest<any>('/learning/predict', { method: 'POST', body: JSON.stringify(data) }),
};

export const notificationsAPI = {
  getAll: async (limit?: number, offset?: number, read?: boolean) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (read !== undefined) params.append('read', read.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ success: boolean; data: any[] }>(`/notifications${query}`);
  },
  
  getUnreadCount: async () => {
    return apiRequest<{ success: boolean; data: { count: number } }>('/notifications/unread');
  },
  
  markAsRead: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },
  
  summarize: async () => {
    return apiRequest<{ success: boolean; data: { summary: string; notificationIds: string[] } }>('/notifications/summarize', {
      method: 'POST',
    });
  },
  
  bulkDelete: async (ids: string[]) => {
    return apiRequest<{ success: boolean; message: string }>('/notifications/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },
  
  create: async (data: {
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
    source?: string;
    action?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
