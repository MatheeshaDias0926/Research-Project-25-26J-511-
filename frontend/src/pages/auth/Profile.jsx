import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { User, Shield, Briefcase, UserCircle, Hash } from "lucide-react";

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
                  {user.role}
                </span>
              </div>
            </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
