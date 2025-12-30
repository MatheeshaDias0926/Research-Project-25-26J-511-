import api from './api';

export const getCrashes = async (params = {}) => {
  const response = await api.get('/crashes', { params });
  return response.data;
};

export const getCrashById = async (id) => {
  const response = await api.get(`/crashes/${id}`);
  return response.data;
};

export const getSystemStats = async () => {
  const response = await api.get('/crashes/stats');
  return response.data;
};

export const updateCrashStatus = async (id, data) => {
  const response = await api.patch(`/crashes/${id}/status`, data);
  return response.data;
};

export const getActiveCrashes = async () => {
  const response = await api.get('/crashes', { params: { status: 'active' } });
  return response.data.crashes || [];
};
