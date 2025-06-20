// services/users.js
import api from '../utils/api';

export const getUsers = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Ajouter les filtres à l'URL
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await api.get(`/api/users${query}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { msg: 'Une erreur est survenue lors de la récupération des utilisateurs' };
  }
};

export const getUserById = async (id) => {
  try {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { msg: 'Utilisateur non trouvé' };
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { msg: 'Erreur lors de la création de l\'utilisateur' };
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { msg: 'Erreur lors de la mise à jour de l\'utilisateur' };
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { msg: 'Erreur lors de la suppression de l\'utilisateur' };
  }
};

export const toggleUserStatus = async (id) => {
  try {
    const response = await api.put(`/api/users/${id}/toggle-status`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { msg: 'Erreur lors du changement de statut' };
  }
};
