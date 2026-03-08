import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PrivateRoutes = ({ roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Redirect to their default dashboard if unauthorized for this specific route
    const dashboardMap = {
      passenger: "/passenger",
      conductor: "/conductor",
      authority: "/admin",
      admin: "/admin",
      driver: "/driver",
    };
    return <Navigate to={dashboardMap[user.role] || "/"} replace />;
  }

  return <Outlet />;
};

export default PrivateRoutes;
