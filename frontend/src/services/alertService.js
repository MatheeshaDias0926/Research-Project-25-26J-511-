import api from './api';

export const getAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

export const getPoliceAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

export const getHospitalAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

export const acceptAlert = async (id) => {
  const response = await api.post(`/alerts/${id}/accept`);
  return response.data;
};

export const dispatchUnits = async (id, data) => {
  const response = await api.post(`/alerts/${id}/dispatch`, data);
  return response.data;
};

export const closeCase = async (id, data) => {
  const response = await api.post(`/alerts/${id}/close`, data);
  return response.data;
};
