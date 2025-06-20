// geretonevent-web/services/auth.js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Configuration d'axios avec les credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

const AuthService = {
  // Connexion
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { 
        email, 
        mot_de_passe: password 
      });
      
      if (response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        status: 'error', 
        message: 'Erreur de connexion au serveur' 
      };
    }
  },

  // Déconnexion
  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { status: 'success', message: 'Déconnexion réussie' };
    } catch (error) {
      throw error.response?.data || { 
        status: 'error', 
        message: 'Erreur lors de la déconnexion' 
      };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        status: 'error', 
        message: 'Erreur lors de la récupération des données utilisateur' 
      };
    }
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('token');
  },

  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  hasRole: (roles) => {
    const user = AuthService.getStoredUser();
    if (!user) return false;
    return roles.includes(user.role);
  }
};

export default AuthService;
