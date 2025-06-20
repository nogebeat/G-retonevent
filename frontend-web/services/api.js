// services/api.js
import axios from 'axios';
import { getCurrentUser } from './auth';

const API_URL = 'http://localhost:2001/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const user = getCurrentUser();
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Services utilisateurs
export const userService = {
  getAll: (filters = {}) => {
    const queryParams = new URLSearchParams(filters);
    return api.get(`/users?${queryParams}`);
  },
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
};

// Services tickets
export const ticketService = {
  getAll: (filters = {}) => {
    const queryParams = new URLSearchParams(filters);
    return api.get(`/tickets?${queryParams}`);
  },
  getById: (id) => api.get(`/tickets/${id}`),
  create: (ticketsData) => api.post('/tickets', ticketsData),
  activate: (id) => api.put(`/tickets/${id}/activate`),
  deactivate: (id) => api.put(`/tickets/${id}/deactivate`),
  verify: (code) => api.get(`/tickets/verify/${code}`),
};

// Services distributions
export const distributionService = {
  getAll: () => api.get('/distributions'),
  getById: (id) => api.get(`/distributions/${id}`),
  create: (distributionData) => api.post('/distributions', distributionData),
};

// Services statistiques
export const statsService = {
  getUserSales: (userId) => api.get(`/stats/users/${userId}/sales`),
  getUserInventory: (userId) => api.get(`/stats/users/${userId}/inventory`),
  getUserRevenue: (userId) => api.get(`/stats/users/${userId}/revenue`),
  getUserSellers: (userId) => api.get(`/stats/users/${userId}/sellers`),
};

export default api;