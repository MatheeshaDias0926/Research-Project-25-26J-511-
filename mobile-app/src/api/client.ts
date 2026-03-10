import axios from "axios";
import { storage } from "../utils/storage";
import { Platform } from "react-native";

// Use user's specific IP for physical device testing
const DEV_API_URL = "http://10.167.202.11:3000/api";
const WEB_API_URL = "http://localhost:3000/api";

export const API_URL = Platform.OS === "web" ? WEB_API_URL : DEV_API_URL;

const client = axios.create({
  baseURL: API_URL,
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
