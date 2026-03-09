import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check if token is expired
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // If we have a user object in storage, use it, otherwise decoding gives us minimal info
                    // Depending on backend, we might need to fetch profile explicitly
                    // For now, let's assume we store the user info or just use decoded if sufficient
                    const storedUser = localStorage.getItem("user");
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    } else {
                        setUser({ ...decoded });
                    }
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        try {
            const response = await api.post("/auth/login", { username, password });
            const { token: newToken, ...userData } = response.data;
            const newUser = { ...userData };

            localStorage.setItem("token", newToken);
            localStorage.setItem("user", JSON.stringify(newUser));

            setToken(newToken);
            setUser(newUser);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || "Login failed"
            };
        }
    };

    const register = async (username, password) => {
        try {
            await api.post("/auth/register", { username, password, role: "passenger" });
            // Auto login after register
            return await login(username, password);
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || "Registration failed"
            };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        window.location.href = "/login";
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
