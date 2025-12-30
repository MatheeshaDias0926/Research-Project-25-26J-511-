import { createContext, useContext, useState, useEffect } from "react";
import { validateToken } from "../services/authService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const userData = await validateToken();
                    setUser(userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUser(null);
                    setIsAuthenticated(false);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const value = {
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
