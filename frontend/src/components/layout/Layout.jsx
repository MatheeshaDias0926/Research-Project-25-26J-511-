import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const Layout = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top header bar with theme toggle */}
        <div
          style={{
            height: 48,
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              background: "var(--bg-muted)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all var(--transition-base)",
            }}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
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
    </div>
  );
};

export default Layout;
