import axios from "axios";
import { storage } from "../utils/storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const BACKEND_PORT = 3000;

function getApiUrl(): string {
  if (Platform.OS === "web") {
    return `http://localhost:${BACKEND_PORT}/api`;
  }

  // Auto-detect the dev server IP (same machine running the backend)
  // Expo Go connects to this IP to load the bundle, so it's always correct
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "10.141.238.159:8081"
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:${BACKEND_PORT}/api`;
  }

  // Fallback for production builds (update this when deploying)
  return `http://localhost:${BACKEND_PORT}/api`;
}

export const API_URL = getApiUrl();

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add the auth token to headers
client.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default client;
