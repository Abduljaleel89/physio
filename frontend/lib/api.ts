import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

// Remove trailing /api if present to avoid double /api
const baseURL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

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
  assignDoctor: async (patientId: number, doctorId: number) => {
    const response = await api.post('/admin/assign-doctor', { patientId, doctorId });
    return response.data;
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

