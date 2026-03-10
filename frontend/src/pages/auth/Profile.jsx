import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
<<<<<<< HEAD
import { User, Shield, Briefcase, UserCircle } from "lucide-react";
=======
import { User, Shield, Briefcase, UserCircle, Hash } from "lucide-react";
>>>>>>> main

const Profile = () => {
  const { user } = useAuth();

  const getRoleIcon = (role) => {
    const iconStyle = { height: 20, width: 20 };
    switch (role) {
      case "authority":
        return <Shield style={iconStyle} />;
      case "conductor":
        return <Briefcase style={iconStyle} />;
      default:
        return <User style={iconStyle} />;
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "authority":
        return "danger";
      case "conductor":
        return "warning";
      default:
        return "default";
    }
  };

<<<<<<< HEAD
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        My Profile
      </h1>

      <Card style={{ maxWidth: 672 }}>
        <CardHeader>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserCircle style={{ height: 24, width: 24, color: "#2563eb" }} />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #f1f5f9",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Username
              </p>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>
                {user.username}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #f1f5f9",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Role
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {getRoleIcon(user.role)}
                <span
                  style={{
                    fontWeight: 600,
                    textTransform: "capitalize",
                    color: "#0f172a",
                  }}
                >
=======
  const infoRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-4) var(--space-5)",
    background: "var(--bg-muted)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-light)",
    transition: "var(--transition-fast)",
  };

  const labelStyle = { fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-muted)" };
  const valueStyle = { fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{
          padding: 10,
          background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))",
          borderRadius: "var(--radius-lg)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <UserCircle size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>
          My Profile
        </h1>
      </div>

      <Card style={{ maxWidth: 672 }}>
        <CardHeader>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <User style={{ height: 20, width: 20, color: "var(--color-primary-500)" }} />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={infoRow}>
            <div>
              <p style={labelStyle}>Username</p>
              <p style={valueStyle}>{user.username}</p>
            </div>
            <UserCircle size={24} style={{ color: "var(--color-primary-400)" }} />
          </div>

          <div style={infoRow}>
            <div>
              <p style={labelStyle}>Role</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {getRoleIcon(user.role)}
                <span style={{ fontWeight: 600, textTransform: "capitalize", color: "var(--text-primary)" }}>
>>>>>>> main
                  {user.role}
                </span>
              </div>
            </div>
<<<<<<< HEAD
            <Badge
              variant={getRoleBadgeVariant(user.role)}
              style={{
                textTransform: "uppercase",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              {user.role} Account
            </Badge>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #f1f5f9",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Account ID
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: "#475569",
                  marginTop: 4,
                }}
              >
                {user.id || user._id}
              </p>
            </div>
=======
            <Badge variant={getRoleBadgeVariant(user.role)} style={{ textTransform: "uppercase", fontSize: "var(--text-xs)", letterSpacing: 1 }}>
              {user.role}
            </Badge>
          </div>

          <div style={infoRow}>
            <div>
              <p style={labelStyle}>Account ID</p>
              <p style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginTop: 4 }}>
                {user.id || user._id}
              </p>
            </div>
            <Hash size={20} style={{ color: "var(--text-muted)" }} />
>>>>>>> main
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
