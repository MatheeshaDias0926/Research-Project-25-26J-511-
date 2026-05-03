/**
 * Frontend Configuration
 * =====================
 * Centralized config for backend URLs and other environment settings.
 * 
 * Change BACKEND_URL here to point to your backend server.
 */

// ── Backend Server Configuration ──
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:5001";

// ── API Endpoints ──
export const API_BASE_URL = BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;
export const ML_API_URL = `${ML_SERVICE_URL}/api`;

// ── Specific API Paths ──
export const API_ENDPOINTS = {
  // Driver APIs
  driver: {
    register: `${API_URL}/driver/register`,
    list: `${API_URL}/driver`,
    verify: `${API_URL}/driver/verify`,
    reuploadPhoto: `${API_URL}/driver/reupload-photo`,
    delete: (id) => `${API_URL}/driver/${id}`,
    update: (id) => `${API_URL}/driver/${id}`,
  },
  // ML Service APIs
  ml: {
    faceStatus: `${ML_API_URL}/face/status`,
    faceFeed: `${ML_API_URL}/face/feed`,
    faceSettings: `${ML_API_URL}/face/settings`,
  },
  // Other APIs can be added here as needed
};

export default {
  BACKEND_URL,
  ML_SERVICE_URL,
  API_BASE_URL,
  API_URL,
  ML_API_URL,
  API_ENDPOINTS,
};
