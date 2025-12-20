import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Bus,
  AlertTriangle,
  Wrench,
  Activity,
  User,
  LogOut,
  Map,
  ShieldAlert,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;

  const links = [
    // Passenger Links
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
    {
      name: "Physics Check",
      href: "/passenger/physics",
      icon: ShieldAlert,
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
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(role));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
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
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
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
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: 16, borderTop: "1px solid #1e293b" }}>
        <Link
          to="/profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
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
        </Link>
        <button
          onClick={logout}
          style={{
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
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
