import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const validateToken = async () => {
  const response = await api.get('/auth/validate');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};
