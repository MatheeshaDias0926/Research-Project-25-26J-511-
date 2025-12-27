import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Use user's specific IP for physical device testing
const DEV_API_URL = 'http://192.168.8.193:3000/api';

export const API_URL = DEV_API_URL;

const client = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to add the auth token to headers
client.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync("userToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default client;
