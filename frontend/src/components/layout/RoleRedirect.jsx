import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RoleRedirect = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const dashboardMap = {
        passenger: "/passenger",
        conductor: "/conductor",
        authority: "/admin",
        admin: "/admin",
        driver: "/driver",
    };

    const targetPath = dashboardMap[user.role] || "/passenger"; // Default to passenger or handle error

    return <Navigate to={targetPath} replace />;
};

export default RoleRedirect;
