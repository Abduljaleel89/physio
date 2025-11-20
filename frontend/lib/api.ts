import axios from 'axios';

// Get API base URL - prioritize environment variable
const getApiBaseUrl = () => {
  // If explicitly set, use it
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  
  // In production (Vercel), warn if not set
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('vercel.app') || hostname.includes('vercel.com') || hostname !== 'localhost';
    
    if (isProduction && !hostname.includes('localhost')) {
      console.error('❌ NEXT_PUBLIC_API_BASE is not set!');
      console.error('Please set NEXT_PUBLIC_API_BASE in Vercel environment variables to your Render backend URL');
      console.error('Example: https://physio-backend-xxxx.onrender.com');
    }
  }
  
  // Fallback to localhost for development
  return 'http://localhost:4000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Remove trailing /api if present to avoid double /api
const baseURL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

// Log API base URL in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', baseURL);
}

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (data: { email: string; password: string; role: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Exercises endpoints
export const exercisesApi = {
  list: async () => {
    const response = await api.get('/exercises');
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/exercises/${id}`);
    return response.data;
  },
  create: async (data: FormData | any) => {
    // If it's FormData (for file upload), send as multipart/form-data
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await api.post('/exercises', data, config);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/exercises/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/exercises/${id}`);
    return response.data;
  },
};

// Therapy Plans endpoints
export const therapyPlansApi = {
  list: async () => {
    const response = await api.get('/therapy-plans');
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/therapy-plans/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/therapy-plans', data);
    return response.data;
  },
  addExercise: async (id: number, data: any) => {
    const response = await api.post(`/therapy-plans/${id}/exercises`, data);
    return response.data;
  },
  editExercise: async (id: number, exerciseId: number, data: any) => {
    const response = await api.patch(`/therapy-plans/${id}/exercises/${exerciseId}`, data);
    return response.data;
  },
  archiveExercise: async (id: number, exerciseId: number) => {
    const response = await api.delete(`/therapy-plans/${id}/exercises/${exerciseId}`);
    return response.data;
  },
  reorderExercises: async (id: number, items: Array<{ id: number; order: number }>) => {
    const response = await api.post(`/therapy-plans/${id}/exercises/reorder`, { items });
    return response.data;
  },
};

// Completion Events endpoints
export const completionEventsApi = {
  create: async (patientId: number, data: any) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        if (key === 'file' && data[key] instanceof File) {
          formData.append('file', data[key]);
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    const response = await api.post(`/patients/${patientId}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  undo: async (id: number, reason?: string) => {
    const response = await api.post(`/completion-events/${id}/undo`, { reason });
    return response.data;
  },
};

// Appointments endpoints
export const appointmentsApi = {
  list: async () => {
    const response = await api.get('/appointments');
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/appointments', data);
    return response.data;
  },
  calendar: async (start: string, end: string) => {
    const response = await api.get(`/appointments/calendar?start=${start}&end=${end}`);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/appointments/${id}`, data);
    return response.data;
  },
  cancel: async (id: number, reason?: string) => {
    const response = await api.delete(`/appointments/${id}`, { data: { reason } as any });
    return response.data;
  }
};

// Upload endpoints
export const uploadsApi = {
  upload: async (file: File, purpose?: string, referenceId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (purpose) formData.append('purpose', purpose);
    if (referenceId) formData.append('referenceId', referenceId);
    const response = await api.post('/uploads/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Admin endpoints
export const adminApi = {
  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },
  listUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  updateUser: async (userId: number, data: any) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },
  resetPassword: async (userId: number) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  assignDoctor: async (patientId: number, doctorId: number) => {
    const response = await api.post('/admin/assign-doctor', { patientId, doctorId });
    return response.data;
  },
  unassignDoctor: async (patientId: number, doctorId: number) => {
    console.log('adminApi.unassignDoctor called with:', { patientId, doctorId });
    try {
      const response = await api.post('/admin/unassign-doctor', { patientId, doctorId });
      console.log('adminApi.unassignDoctor response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('adminApi.unassignDoctor error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },
  getDoctors: async () => {
    const response = await api.get('/admin/doctors');
    return response.data;
  },
  getPatients: async () => {
    const response = await api.get('/admin/patients');
    return response.data;
  },
};

// Analytics endpoints
export const analyticsApi = {
  adherence: async (startDate: string, endDate: string, therapyPlanId?: number) => {
    const params = new URLSearchParams({ startDate, endDate });
    if (therapyPlanId) params.append('therapyPlanId', therapyPlanId.toString());
    const response = await api.get(`/analytics/adherence?${params.toString()}`);
    return response.data;
  },
};

// Invoices endpoints
export const invoicesApi = {
  list: async () => {
    const response = await api.get('/invoices');
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch(`/invoices/${id}`, data);
    return response.data;
  },
  sendEmail: async (id: number) => {
    const response = await api.post(`/invoices/${id}/send-email`);
    return response.data;
  },
};

// Visit Requests endpoints
export const visitRequestsApi = {
  create: async (data: any) => {
    const response = await api.post('/visit-requests', data);
    return response.data;
  },
  list: async (params?: Record<string,string|number|boolean>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await api.get('/visit-requests' + qs);
    return response.data;
  },
  respond: async (id: number, data: { status: 'APPROVED'|'REJECTED'; reason?: string }) => {
    const response = await api.patch(`/visit-requests/${id}/respond`, data);
    return response.data;
  },
  assign: async (id: number, data: { doctorId: number; date?: string; duration?: number; notes?: string }) => {
    const response = await api.post(`/visit-requests/${id}/assign`, data);
    return response.data;
  },
};

// Notifications endpoints
export const notificationsApi = {
  list: async (params?: { page?: number; pageSize?: number; type?: string; startDate?: string; endDate?: string; read?: 'true'|'false' }) => {
    const search = new URLSearchParams();
    if (params?.page) search.append('page', String(params.page));
    if (params?.pageSize) search.append('pageSize', String(params.pageSize));
    if (params?.type) search.append('type', params.type);
    if (params?.startDate) search.append('startDate', params.startDate);
    if (params?.endDate) search.append('endDate', params.endDate);
    if (params?.read) search.append('read', params.read);
    const qs = search.toString();
    const response = await api.get('/notifications' + (qs ? `?${qs}` : ''));
    return response.data;
  },
  markRead: async (id: number) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },
  markAll: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};

export const doctorApi = {
  myPatients: async () => {
    const response = await api.get('/doctor/my-patients');
    return response.data;
  },
  getPatientHistory: async (patientId: number) => {
    const response = await api.get(`/doctor/patients/${patientId}/history`);
    return response.data;
  },
};

// Patient endpoints
export const patientsApi = {
  getMyPatientId: async () => {
    // Get patient ID for current user
    const response = await api.get('/auth/me');
    if (response.data.success && response.data.data?.role === 'PATIENT') {
      // Fetch patient profile to get patient ID
      const patientsResponse = await api.get('/admin/patients');
      if (patientsResponse.data.success) {
        const patients = Array.isArray(patientsResponse.data.data) 
          ? patientsResponse.data.data 
          : (patientsResponse.data.data?.patients || []);
        const patient = patients.find((p: any) => p.userId === response.data.data.id);
        return patient?.id || null;
      }
    }
    return null;
  },
  getCompletions: async (therapyPlanExerciseId?: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (therapyPlanExerciseId) params.append('therapyPlanExerciseId', therapyPlanExerciseId.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/completion-events?${params.toString()}`);
    return response.data;
  },
};

