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
import { Bus } from "lucide-react";

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
    const result = await login(data.email, data.password);
    setLoading(false);

    if (result.success) {
      // Decode locally or refetch user to know role?
      // AuthContext updates user state. We can rely on that or simple redirect logic.
      // Usually AuthContext state update is async/effect based, so might need to wait or check result.
      // For now, let's just let the AuthProvider/PrivateRoutes handle redirection or simple default.
      // But we need to know where to go. Helper?
      // Actually, let's just look at localStorage for instant redirect or wait for context.
      // Simpler: Redirect to root, let helper decide.
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
        background: "#f8fafc",
        padding: 16,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <CardHeader style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: 12,
                background: "#e0f2fe",
                borderRadius: "9999px",
              }}
            >
              <Bus style={{ height: 32, width: 32, color: "#0284c7" }} />
            </div>
          </div>
          <CardTitle
            style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}
          >
            Welcome Back
          </CardTitle>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            Sign in to your account
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {error && (
              <div
                style={{
                  padding: 12,
                  fontSize: 14,
                  color: "#dc2626",
                  background: "#fef2f2",
                  borderRadius: 8,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Email
              </label>
              <Input
                {...register("email", { required: "Email is required" })}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p style={{ fontSize: 12, color: "#ef4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Password
              </label>
              <Input
                type="password"
                {...register("password", { required: "Password is required" })}
                placeholder="••••••••"
              />
              {errors.password && (
                <p style={{ fontSize: 12, color: "#ef4444" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div
              style={{ textAlign: "center", fontSize: 14, color: "#64748b" }}
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{
                  fontWeight: 500,
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
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
