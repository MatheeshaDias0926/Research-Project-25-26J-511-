import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Bus, Lock, UserCircle } from "lucide-react";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    const result = await login(data.username, data.password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--color-slate-900) 0%, var(--color-primary-900) 50%, var(--color-slate-900) 100%)",
        padding: "var(--space-4)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
        top: "-10%", right: "-10%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)",
        bottom: "-5%", left: "-5%", pointerEvents: "none",
      }} />

      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "var(--bg-surface)",
          animation: "fadeInUp 0.5s ease-out",
          position: "relative",
          zIndex: 1,
        }}
      >
        <CardHeader style={{ textAlign: "center", padding: "32px 32px 16px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div
              style={{
                padding: 14,
                background: "linear-gradient(135deg, var(--color-primary-500), var(--color-info-600))",
                borderRadius: "var(--radius-xl)",
                boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
              }}
            >
              <Bus style={{ height: 28, width: 28, color: "#fff" }} />
            </div>
          </div>
          <CardTitle style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>
            Welcome Back
          </CardTitle>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 4 }}>
            Sign in to your SmartBus account
          </p>
        </CardHeader>
        <CardContent style={{ padding: "16px 32px 32px" }}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {error && (
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-danger-600)",
                  background: "var(--color-danger-50)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-danger-100)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>!</span> {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <UserCircle size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <Input
                  {...register("username", { required: "Username is required" })}
                  placeholder="Enter your username"
                  style={{ paddingLeft: 40 }}
                />
              </div>
              {errors.username && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger-500)" }}>
                  {errors.username.message}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <Input
                  type="password"
                  {...register("password", { required: "Password is required" })}
                  placeholder="••••••••"
                  style={{ paddingLeft: 40 }}
                />
              </div>
              {errors.password && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger-500)" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" style={{ width: "100%", height: 44, fontSize: "var(--text-md)" }} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%" }} />
                  Signing in...
                </span>
              ) : "Sign In"}
            </Button>

            <div style={{ textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{ fontWeight: 600, color: "var(--color-primary-600)", cursor: "pointer" }}
              >
                Register as Passenger
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
