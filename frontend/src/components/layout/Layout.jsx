import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

const Layout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Outlet />; // For login/register pages
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#f8fafc",
      }}
    >
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ margin: "0 auto", padding: 32, maxWidth: 1120 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
