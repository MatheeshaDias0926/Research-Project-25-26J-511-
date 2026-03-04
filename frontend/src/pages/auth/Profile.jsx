import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { User, Shield, Briefcase, UserCircle } from "lucide-react";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "var(--text-primary)" }}>
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
              background: "var(--bg-primary)",
              borderRadius: 8,
              border: "1px solid var(--bg-muted)",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>
                Username
              </p>
              <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
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
              background: "var(--bg-primary)",
              borderRadius: 8,
              border: "1px solid var(--bg-muted)",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>
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
                    color: "var(--text-primary)",
                  }}
                >
                  {user.role}
                </span>
              </div>
            </div>
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
              background: "var(--bg-primary)",
              borderRadius: 8,
              border: "1px solid var(--bg-muted)",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>
                Account ID
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: "var(--text-label)",
                  marginTop: 4,
                }}
              >
                {user.id || user._id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
