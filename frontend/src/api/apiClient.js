import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (full_name, email, password, role) => apiClient.post('/auth/register', { full_name, email, password, role }),
  getMe: () => apiClient.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => apiClient.post('/auth/change-password', { currentPassword, newPassword }),
  logout: () => apiClient.post('/auth/logout')
};

// Users API endpoints
export const usersAPI = {
  getAll: () => apiClient.get('/users'),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (userData) => apiClient.post('/users', userData),
  update: (id, userData) => apiClient.put(`/users/${id}`, userData),
  delete: (id) => apiClient.delete(`/users/${id}`),
  toggleStatus: (id) => apiClient.patch(`/users/${id}/toggle-status`),
  resetPassword: (id, newPassword) => apiClient.post(`/users/${id}/reset-password`, { newPassword })
};

// Residents API endpoints
export const residentsAPI = {
  getAll: (page = 1, limit = 20) => apiClient.get('/residents', { params: { page, limit } }),
  search: (q, page = 1) => apiClient.get('/residents/search/query', { params: { q, page } }),
  getById: (id) => apiClient.get(`/residents/${id}`),
  create: (data) => apiClient.post('/residents', data),
  update: (id, data) => apiClient.put(`/residents/${id}`, data),
  delete: (id) => apiClient.delete(`/residents/${id}`),
  export: () => apiClient.get('/residents/export/csv')
};

// Certificates API endpoints
export const certificatesAPI = {
  getAll: (params = {}) => apiClient.get('/certificates', { params }),
  getById: (id) => apiClient.get(`/certificates/${id}`),
  generate: (data) => apiClient.post('/certificates/generate', data),
  uploadTemplate: (formData) => apiClient.post('/certificates/templates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getTemplates: () => apiClient.get('/certificates/templates'),
  getTemplateById: (id) => apiClient.get(`/certificates/templates/${id}`),
  deleteTemplate: (id) => apiClient.delete(`/certificates/templates/${id}`),
  approve: (id) => apiClient.patch(`/certificates/${id}/approve`),
  reject: (id) => apiClient.patch(`/certificates/${id}/reject`),
  delete: (id) => apiClient.delete(`/certificates/${id}`),
  getStats: () => apiClient.get('/certificates/stats/overview')
};

// Finance API endpoints
export const financeAPI = {
  getAll: (params = {}) => apiClient.get('/finance', { params }),
  create: (data) => apiClient.post('/finance', data),
  update: (id, data) => apiClient.put(`/finance/${id}`, data),
  delete: (id) => apiClient.delete(`/finance/${id}`),
  getStats: () => apiClient.get('/finance/stats/overview'),
  export: () => apiClient.get('/finance/export/csv')
};

// Blotter API endpoints
export const blotterAPI = {
  getAll: (params = {}) => apiClient.get('/blotter', { params }),
  getById: (id) => apiClient.get(`/blotter/${id}`),
  create: (data) => apiClient.post('/blotter', data),
  update: (id, data) => apiClient.put(`/blotter/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/blotter/${id}/status`, { status }),
  delete: (id) => apiClient.delete(`/blotter/${id}`)
};

// Requests API endpoints
export const requestsAPI = {
  getAll: (params = {}) => apiClient.get('/requests', { params }),
  getById: (id) => apiClient.get(`/requests/${id}`),
  create: (data) => apiClient.post('/requests', data),
  update: (id, data) => apiClient.put(`/requests/${id}`, data),
  approve: (id) => apiClient.patch(`/requests/${id}/approve`),
  reject: (id, reason) => apiClient.patch(`/requests/${id}/reject`, { reason }),
  process: (id) => apiClient.patch(`/requests/${id}/process`),
  complete: (id) => apiClient.patch(`/requests/${id}/complete`),
  delete: (id) => apiClient.delete(`/requests/${id}`)
};

// Announcements API endpoints
export const announcementsAPI = {
  getAll: () => apiClient.get('/announcements'),
  create: (data) => apiClient.post('/announcements', data),
  update: (id, data) => apiClient.put(`/announcements/${id}`, data),
  delete: (id) => apiClient.delete(`/announcements/${id}`)
};

// Audit API endpoints
export const auditAPI = {
  getAll: (params = {}) => apiClient.get('/audit', { params })
};

export default apiClient;
