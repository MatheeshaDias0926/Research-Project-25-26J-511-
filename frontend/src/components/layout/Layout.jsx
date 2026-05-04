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
        background: "var(--bg-body)",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--bg-body)",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            padding: "var(--space-8)",
            maxWidth: "var(--content-max-width)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
