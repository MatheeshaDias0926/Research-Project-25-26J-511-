import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PrivateRoutes = ({ roles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        // Redirect to their default dashboard if unauthorized for this specific route
        const dashboardMap = {
            passenger: "/passenger",
            conductor: "/conductor",
            authority: "/authority",
        };
        return <Navigate to={dashboardMap[user.role] || "/"} replace />;
    }

    return <Outlet />;
};

export default PrivateRoutes;
