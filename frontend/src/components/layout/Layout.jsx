import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import CrashAlertBanner from "./CrashAlertBanner";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const TABLE_STYLES = `
  /* ===== Professional Table Styles ===== */

  .dashboard-content table {
    width: 100% !important;
    border-collapse: separate !important;
    border-spacing: 0 !important;
    font-size: 14px !important;
    min-width: 700px;
  }

  .dashboard-content thead tr {
    background: var(--table-header-gradient) !important;
    border: none !important;
  }

  .dashboard-content thead th {
    padding: 15px 20px !important;
    text-align: left !important;
    font-weight: 700 !important;
    color: var(--text-table-header) !important;
    font-size: 11.5px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
    border-bottom: 2px solid var(--border-strong) !important;
    white-space: nowrap;
    background: inherit;
  }

  .dashboard-content tbody td {
    padding: 15px 20px !important;
    border-bottom: 1px solid var(--border-primary) !important;
    color: var(--text-body);
    vertical-align: middle;
  }

  .dashboard-content tbody tr:last-child td {
    border-bottom: none !important;
  }

  .dashboard-content tbody tr {
    transition: background 0.15s ease !important;
    background: var(--table-row-bg) !important;
    border: none !important;
    cursor: default;
  }

  .dashboard-content tbody tr:nth-child(even) {
    background: var(--table-row-alt) !important;
  }

  .dashboard-content tbody tr:hover {
    background: var(--table-row-hover) !important;
  }

  /* Active / emergency rows */
  .dashboard-content tbody tr[data-active="true"] {
    background: #fef2f2 !important;
    box-shadow: inset 4px 0 0 0 #dc2626;
  }
  .dashboard-content tbody tr[data-active="true"]:hover {
    background: #fee2e2 !important;
  }

  .dashboard-content tbody tr[data-critical="true"] {
    background: #fef2f2 !important;
    box-shadow: inset 4px 0 0 0 #dc2626;
  }
  .dashboard-content tbody tr[data-critical="true"]:hover {
    background: #fee2e2 !important;
  }

  /* Table wrapper */
  .dashboard-content .table-card {
    border-radius: 14px;
    border: 1px solid var(--border-primary);
    background: var(--bg-card);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }

  .dashboard-content .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dashboard-content .table-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .dashboard-content .table-scroll::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
  .dashboard-content .table-scroll::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }

  /* Empty state row */
  .dashboard-content tbody tr:only-child:hover {
    background: var(--bg-card) !important;
  }
`;

const Layout = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) {
    return <Outlet />;
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      <style>{TABLE_STYLES}</style>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Header Bar */}
        <header style={{
          height: 48,
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 24px",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
        }}>
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border-primary)",
              background: "var(--bg-muted)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
            }}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light"
              ? <Moon style={{ height: 18, width: 18 }} />
              : <Sun style={{ height: 18, width: 18 }} />
            }
          </button>
        </header>
        {/* Main Content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          <div className="dashboard-content" style={{ margin: "0 auto", padding: 32, maxWidth: 1120 }}>
            <CrashAlertBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
