import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Bus,
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
  Radio,
  Wifi,
  Play,
  AlertTriangle,
  BookOpen,
  MapPin,
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
    // Conductor Links
    {
      name: "Overview",
      href: "/conductor",
      icon: LayoutDashboard,
      roles: ["conductor"],
    },
    {
      name: "Maintenance",
      href: "/conductor/maintenance",
      icon: Wrench,
      roles: ["conductor"],
    },
    // Driver Links
    {
      name: "Overview",
      href: "/driver",
      icon: LayoutDashboard,
      roles: ["driver"],
    },
    {
      name: "Maintenance",
      href: "/driver/maintenance",
      icon: Wrench,
      roles: ["driver"],
    },
    {
      name: "Alert Log",
      href: "/driver/alerts",
      icon: FileWarning,
      roles: ["driver"],
    },
    // Admin Links
    {
      name: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      roles: ["authority", "admin"],
    },
    {
      name: "Fleet Management",
      href: "/admin/fleet",
      icon: Bus,
      roles: ["authority", "admin"],
    },
    {
      name: "Bus Assignments",
      href: "/admin/assignments",
      icon: Link2,
      roles: ["authority", "admin"],
    },
    {
      name: "Employee Management",
      href: "/admin/employees",
      icon: Users,
      roles: ["authority", "admin"],
    },
    {
      name: "Edge Devices",
      href: "/admin/edge-devices",
      icon: Cpu,
      roles: ["authority", "admin"],
    },
    {
      name: "SOS Alerts",
      href: "/admin/sos",
      icon: Siren,
      roles: ["authority", "admin"],
    },
    {
      name: "Face Recognition",
      href: "/admin/face-recognition",
      icon: Scan,
      roles: ["authority", "admin"],
    },
    {
      name: "Live Map",
      href: "/admin/live-map",
      icon: MapPin,
      roles: ["authority", "admin"],
    },
    {
      name: "Live Monitor",
      href: "/admin/live-monitor",
      icon: Radio,
      roles: ["authority", "admin"],
    },
    {
      name: "IoT Simulator",
      href: "/admin/iot-simulator",
      icon: Wifi,
      roles: ["authority", "admin"],
    },
    {
      name: "Scenario Simulator",
      href: "/admin/scenario-sim",
      icon: Play,
      roles: ["authority", "admin"],
    },
    {
      name: "Physics Check",
      href: "/admin/physics-check",
      icon: AlertTriangle,
      roles: ["authority", "admin"],
    },
    {
      name: "Safety Theories",
      href: "/admin/safety-theories",
      icon: BookOpen,
      roles: ["authority", "admin"],
    },
  ];

  const filteredLinks = links.filter((link) => link.roles.includes(role));

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
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
              background:
                "linear-gradient(135deg, var(--color-primary-500), var(--color-info-600))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
            }}
          >
            <Bus style={{ height: 20, width: 20, color: "#fff" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              SmartBus
            </h1>
            <p
              style={{
                fontSize: 11,
                color: "var(--color-slate-400)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 500,
              }}
            >
              {role} Portal
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.06)",
          margin: "0 16px 8px",
        }}
      />

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
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-slate-500)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "12px 14px 8px",
          }}
        >
          Navigation
        </p>
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
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
              {isActive && (
                <ChevronRight style={{ height: 14, width: 14, opacity: 0.7 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "8px 12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link
          to="/profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            borderRadius: "var(--radius-md)",
            marginBottom: 4,
            background:
              location.pathname === "/profile"
                ? "rgba(255,255,255,0.08)"
                : "transparent",
            color:
              location.pathname === "/profile" ? "#fff" : "var(--sidebar-text)",
            transition: "all var(--transition-base)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--sidebar-hover-bg)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              location.pathname === "/profile"
                ? "rgba(255,255,255,0.08)"
                : "transparent";
            e.currentTarget.style.color =
              location.pathname === "/profile" ? "#fff" : "var(--sidebar-text)";
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {user.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "inherit",
              }}
            >
              {user.username || "User"}
            </p>
          </div>
        </Link>
        <button
          onClick={logout}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--sidebar-text)",
            borderRadius: "var(--radius-md)",
            background: "transparent",
            cursor: "pointer",
            transition: "all var(--transition-base)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--sidebar-text)";
          }}
        >
          <LogOut style={{ height: 18, width: 18 }} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
