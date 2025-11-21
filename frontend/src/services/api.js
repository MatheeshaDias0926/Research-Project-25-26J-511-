import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getProfile: () => api.get("/auth/profile"),
};

// Bus API
export const busAPI = {
  getAllBuses: () => api.get("/bus"),
  getBusStatus: (busId) => api.get(`/bus/${busId}/status`),
  getBusByPlate: (licensePlate) => api.get(`/bus/plate/${licensePlate}`),
  getBusViolations: (busId, params) =>
    api.get(`/bus/${busId}/violations`, { params }),
  getBusLogs: (busId, params) => api.get(`/bus/${busId}/logs`, { params }),
  getPrediction: (routeId, params) =>
    api.get(`/bus/predict/${routeId}`, { params }),
  createBus: (data) => api.post("/bus", data),
};

// Maintenance API
export const maintenanceAPI = {
  createLog: (data) => api.post("/maintenance", data),
  getAllLogs: (params) => api.get("/maintenance", { params }),
  getLogsByBus: (busId, params) =>
    api.get(`/maintenance/bus/${busId}`, { params }),
  getLogById: (id) => api.get(`/maintenance/${id}`),
  updateLog: (id, data) => api.put(`/maintenance/${id}`, data),
  deleteLog: (id) => api.delete(`/maintenance/${id}`),
};

// IoT API
export const iotAPI = {
  ingestData: (data) => api.post("/iot/iot-data", data),
};

export default api;
