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
import { UserPlus } from "lucide-react";

const Register = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    const result = await registerUser(data.username, data.password);
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
              <UserPlus style={{ height: 32, width: 32, color: "#0284c7" }} />
            </div>
          </div>
          <CardTitle
            style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}
          >
            Create Account
          </CardTitle>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
            Join as a Passenger
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
                Username
              </label>
              <Input
                {...register("username", {
                  required: "Username is required",
                  minLength: { value: 3, message: "Min 3 characters" },
                })}
                placeholder="Choose a username"
              />
              {errors.username && (
                <p style={{ fontSize: 12, color: "#ef4444" }}>
                  {errors.username.message}
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
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Min 6 characters" },
                })}
                placeholder="••••••••"
              />
              {errors.password && (
                <p style={{ fontSize: 12, color: "#ef4444" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Confirm Password
              </label>
              <Input
                type="password"
                {...register("confirmPassword", {
                  required: "Please confirm password",
                  validate: (val) => {
                    if (watch("password") != val) {
                      return "Your passwords do not match";
                    }
                  },
                })}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p style={{ fontSize: 12, color: "#ef4444" }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating Account..." : "Register"}
            </Button>

            <div
              style={{ textAlign: "center", fontSize: 14, color: "#64748b" }}
            >
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  fontWeight: 500,
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
