import React, { createContext, useState, useContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import client from "../api/client";
import { router } from "expo-router";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        authenticated: null, // null = loading, true/false
        user: null,
    });

    useEffect(() => {
        const loadToken = async () => {
            const token = await SecureStore.getItemAsync("userToken");
            const user = await SecureStore.getItemAsync("userData");

            if (token && user) {
                client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
                setAuthState({
                    token,
                    authenticated: true,
                    user: JSON.parse(user),
                });
            } else {
                setAuthState({
                    token: null,
                    authenticated: false,
                    user: null,
                });
            }
        };

        loadToken();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await client.post("/auth/login", { username, password });

            const { token, ...userData } = response.data;

            // Store token and user data
            await SecureStore.setItemAsync("userToken", token);
            await SecureStore.setItemAsync("userData", JSON.stringify(userData));

            // Update axios defaults
            client.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            setAuthState({
                token,
                authenticated: true,
                user: userData,
            });

            // Navigate to home
            router.replace("/(app)/dashboard");
            return response.data;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync("userToken");
        await SecureStore.deleteItemAsync("userData");

        // Clear axios defaults
        delete client.defaults.headers.common["Authorization"];

        setAuthState({
            token: null,
            authenticated: false,
            user: null,
        });

        router.replace("/login");
    };

    return (
        <AuthContext.Provider value={{ authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
