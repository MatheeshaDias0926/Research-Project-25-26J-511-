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
        authority: "/authority",
        admin: "/admin",
        police: "/police",
        hospital: "/hospital",
        busowner: "/busowner",
    };

    const targetPath = dashboardMap[user.role] || "/passenger";

    return <Navigate to={targetPath} replace />;
};

export default RoleRedirect;
