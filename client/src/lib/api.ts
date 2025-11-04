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
const apiRequest = async <T>(
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Something went wrong');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
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

  create: async (data: any) => {
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
};

// Journal API
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
export const skillsAPI = {
  getAll: async () => {
    return apiRequest<any[]>('/skills');
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

export default {
  auth: authAPI,
  academics: academicsAPI,
  finance: financeAPI,
  journal: journalAPI,
  tasks: tasksAPI,
  skills: skillsAPI,
  lifestyle: lifestyleAPI,
  courses: coursesAPI,
};
