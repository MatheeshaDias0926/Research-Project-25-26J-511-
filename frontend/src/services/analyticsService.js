import api from './api';

export const getAnalytics = async (range = 'monthly') => {
  const response = await api.get('/analytics', { params: { range } });
  return response.data;
};
