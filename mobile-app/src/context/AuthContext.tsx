import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { storage } from "../utils/storage";
import { useRouter, useSegments } from "expo-router";
import { authApi } from "../api/auth";
import client from "../api/client";

interface User {
  username: string;
  role: "passenger" | "conductor" | "authority";
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  authenticated: boolean | null; // null = loading
  user: User | null;
}

interface AuthContextType {
  authState: AuthState;
  login: (username: string, password: string) => Promise<any>;
  register: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    authenticated: null,
    user: null,
  });

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const loadToken = async () => {
      const token = await storage.getItem("userToken");
      const userStr = await storage.getItem("userData");

      if (token && userStr) {
        const user = JSON.parse(userStr);
        client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setAuthState({
          token,
          authenticated: true,
          user,
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

  // Protected Routes Logic
  useEffect(() => {
    if (authState.authenticated === null) return;

    const inAuthGroup = segments[0] === "(passenger)" || segments[0] === "(conductor)" || segments[0] === "(authority)";

    if (authState.authenticated && !inAuthGroup) {
      // Redirect based on role
      const role = authState.user?.role;
      if (role === "passenger") router.replace("/(passenger)/home");
      else if (role === "conductor") router.replace("/(conductor)/dashboard");
      else if (role === "authority") router.replace("/(authority)/dashboard");
    } else if (!authState.authenticated && inAuthGroup) {
      // If not authenticated but in a protected group, redirect to login
      router.replace("/login");
    }
  }, [authState.authenticated, segments]);

  const login = async (username: string, password: string) => {
    try {
      const data = await authApi.login(username, password);
      // Backend returns { token, ...userData }
      const { token, ...userData } = data;

      await storage.setItem("userToken", token);
      await storage.setItem("userData", JSON.stringify(userData));

      client.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setAuthState({
        token,
        authenticated: true,
        user: userData,
      });

      // Navigation is handled by the useEffect above
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  };
  
  const register = async (username: string, password: string) => {
      try {
          await authApi.register(username, password, "passenger");
          return await login(username, password);
      } catch (error) {
          throw error;
      }
  }

  const logout = async () => {
    await storage.deleteItem("userToken");
    await storage.deleteItem("userData");
    await storage.deleteItem("currentBusId");
    await storage.deleteItem("currentBusNumber");
    delete client.defaults.headers.common["Authorization"];

    setAuthState({
      token: null,
      authenticated: false,
      user: null,
    });
    
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ authState, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
