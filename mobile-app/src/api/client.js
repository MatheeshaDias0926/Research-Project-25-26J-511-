import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../constants/config";

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
