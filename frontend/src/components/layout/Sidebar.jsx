import { Link, useLocation } from "react-router-dom";
<<<<<<< HEAD
import { cn } from "../../lib/utils";
=======
>>>>>>> main
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Bus,
<<<<<<< HEAD
  AlertTriangle,
  Wrench,
  Activity,
  User,
  LogOut,
  Map,
  ShieldAlert,
  BookOpen,
  Navigation,
  Radio,
=======
  Activity,
  User,
  LogOut,
  Link2,
  Users,
  Cpu,
  Siren,
  Wrench,
  FileWarning,
  Scan,
  ChevronRight,
>>>>>>> main
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;

  const links = [
    // Passenger Links
<<<<<<< HEAD
    {
      name: "Dashboard",
      href: "/passenger",
      icon: LayoutDashboard,
      roles: ["passenger"],
    },
    {
      name: "Prediction",
      href: "/passenger/prediction",
      icon: Activity,
      roles: ["passenger"],
    },


    // Conductor Links
    {
      name: "My Bus",
      href: "/conductor",
      icon: Bus,
      roles: ["conductor"],
    },
    {
      name: "Maintenance",
      href: "/conductor/maintenance",
      icon: Wrench,
      roles: ["conductor"],
    },

    // Authority Links
    {
      name: "Overview",
      href: "/authority",
      icon: LayoutDashboard,
      roles: ["authority"],
    },
    {
      name: "Live Monitor",
      href: "/authority/live-monitor",
      icon: Radio,
      roles: ["authority"],
    },
    {
      name: "Fleet",
      href: "/authority/fleet",
      icon: Bus,
      roles: ["authority"],
    },
    {
      name: "Violations",
      href: "/authority/violations",
      icon: AlertTriangle,
      roles: ["authority"],
    },
    {
      name: "Conductors",
      href: "/authority/conductors",
      icon: User,
      roles: ["authority"],
    },
    {
      name: "Maintenance Logs",
      href: "/authority/maintenance",
      icon: Wrench,
      roles: ["authority"],
    },
    {
      name: "IoT Simulator",
      href: "/authority/iot",
      icon: Activity,
      roles: ["authority"],
    },
    {
      name: "Safety Check",
      href: "/authority/safety",
      icon: ShieldAlert,
      roles: ["authority"],
    },
    {
        name: "Safety Logic",
        href: "/authority/theories",
        icon: BookOpen,
        roles: ["authority"],
    },
    {
        name: "Scenario Simulator",
        href: "/authority/simulator",
        icon: Navigation,
        roles: ["authority"],
    },
=======
    { name: "Dashboard", href: "/passenger", icon: LayoutDashboard, roles: ["passenger"] },
    { name: "Prediction", href: "/passenger/prediction", icon: Activity, roles: ["passenger"] },
    // Conductor Links
    { name: "Overview", href: "/conductor", icon: LayoutDashboard, roles: ["conductor"] },
    { name: "Maintenance", href: "/conductor/maintenance", icon: Wrench, roles: ["conductor"] },
    // Driver Links
    { name: "Overview", href: "/driver", icon: LayoutDashboard, roles: ["driver"] },
    { name: "Maintenance", href: "/driver/maintenance", icon: Wrench, roles: ["driver"] },
    { name: "Alert Log", href: "/driver/alerts", icon: FileWarning, roles: ["driver"] },
    // Admin Links
    { name: "Overview", href: "/admin", icon: LayoutDashboard, roles: ["authority", "admin"] },
    { name: "Fleet Management", href: "/admin/fleet", icon: Bus, roles: ["authority", "admin"] },
    { name: "Bus Assignments", href: "/admin/assignments", icon: Link2, roles: ["authority", "admin"] },
    { name: "Employee Management", href: "/admin/employees", icon: Users, roles: ["authority", "admin"] },
    { name: "Edge Devices", href: "/admin/edge-devices", icon: Cpu, roles: ["authority", "admin"] },
    { name: "SOS Alerts", href: "/admin/sos", icon: Siren, roles: ["authority", "admin"] },
    { name: "Face Recognition", href: "/admin/face-recognition", icon: Scan, roles: ["authority", "admin"] },
>>>>>>> main
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(role));

<<<<<<< HEAD
=======
  const linkStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    fontSize: "var(--text-sm)",
    fontWeight: isActive ? 600 : 500,
    borderRadius: "var(--radius-md)",
    background: isActive
      ? "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))"
      : "transparent",
    color: isActive ? "#fff" : "var(--sidebar-text)",
    transition: "all var(--transition-base)",
    cursor: "pointer",
    position: "relative",
    letterSpacing: "0.01em",
  });

>>>>>>> main
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
<<<<<<< HEAD
        width: 256,
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <div style={{ padding: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Bus style={{ height: 24, width: 24, color: "#38bdf8" }} />
          SmartBus
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 4,
            textTransform: "capitalize",
          }}
        >
          {role} Portal
        </p>
      </div>

      <nav
        style={{
          flex: 1,
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
=======
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        background: "linear-gradient(180deg, #0f172a 0%, #0c1322 100%)",
        color: "#fff",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--color-primary-500), var(--color-info-600))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
            }}
          >
            <Bus style={{ height: 20, width: 20, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              SmartBus
            </h1>
            <p style={{ fontSize: 11, color: "var(--color-slate-400)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
              {role} Portal
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px 8px" }} />

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-slate-500)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 14px 8px" }}>
          Navigation
        </p>
>>>>>>> main
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
<<<<<<< HEAD
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                background: isActive ? "#0284c7" : "transparent",
                color: isActive ? "#fff" : "#d1d5db",
                transition: "background 0.2s, color 0.2s",
                cursor: "pointer",
              }}
            >
              <Icon style={{ height: 20, width: 20 }} />
              {link.name}
=======
              style={linkStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--sidebar-hover-bg)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sidebar-text)";
                }
              }}
            >
              <Icon style={{ height: 18, width: 18, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{link.name}</span>
              {isActive && <ChevronRight style={{ height: 14, width: 14, opacity: 0.7 }} />}
>>>>>>> main
            </Link>
          );
        })}
      </nav>

<<<<<<< HEAD
      <div style={{ padding: 16, borderTop: "1px solid #1e293b" }}>
=======
      {/* Footer */}
      <div style={{ padding: "8px 12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
>>>>>>> main
        <Link
          to="/profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
<<<<<<< HEAD
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            marginBottom: 8,
            background:
              location.pathname === "/profile" ? "#1e293b" : "transparent",
            color: location.pathname === "/profile" ? "#fff" : "#d1d5db",
            transition: "background 0.2s, color 0.2s",
            cursor: "pointer",
          }}
        >
          <User style={{ height: 20, width: 20 }} />
          Profile
=======
            padding: "10px 14px",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            borderRadius: "var(--radius-md)",
            marginBottom: 4,
            background: location.pathname === "/profile" ? "rgba(255,255,255,0.08)" : "transparent",
            color: location.pathname === "/profile" ? "#fff" : "var(--sidebar-text)",
            transition: "all var(--transition-base)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sidebar-hover-bg)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = location.pathname === "/profile" ? "rgba(255,255,255,0.08)" : "transparent";
            e.currentTarget.style.color = location.pathname === "/profile" ? "#fff" : "var(--sidebar-text)";
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "var(--radius-full)",
            background: "var(--color-primary-600)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff",
          }}>
            {user.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "inherit" }}>{user.username || "User"}</p>
          </div>
>>>>>>> main
        </Link>
        <button
          onClick={logout}
          style={{
<<<<<<< HEAD
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 500,
            color: "#d1d5db",
            borderRadius: 8,
            background: "transparent",
            transition: "background 0.2s, color 0.2s",
            cursor: "pointer",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(127,29,29,0.1)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#d1d5db";
          }}
        >
          <LogOut style={{ height: 20, width: 20 }} />
          Logout
=======
            display: "flex", width: "100%", alignItems: "center", gap: 12,
            padding: "10px 14px", fontSize: "var(--text-sm)", fontWeight: 500,
            color: "var(--sidebar-text)", borderRadius: "var(--radius-md)",
            background: "transparent", cursor: "pointer",
            transition: "all var(--transition-base)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sidebar-text)"; }}
        >
          <LogOut style={{ height: 18, width: 18 }} />
          Sign Out
>>>>>>> main
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
