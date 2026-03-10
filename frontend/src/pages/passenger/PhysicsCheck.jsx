import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { ShieldCheck, AlertTriangle, Info } from "lucide-react";

const PhysicsCheck = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Mocking lat/lon for now as user input might be tedious, or defaulting to a gentle curve location
      const payload = {
        seated: parseInt(data.seated),
        standing: parseInt(data.standing),
        speed: parseInt(data.speed),
        lat: 6.9271, // Colombo default
        lon: 79.8612,
      };
      const response = await api.post("/bus/physics", payload);
      setResult(response.data);
    } catch (error) {
      console.error("Physics check failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 672,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
<<<<<<< HEAD
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        Safety Check
      </h1>
      <p style={{ color: "#475569" }}>
=======
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{
          padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))",
        }}>
          <ShieldCheck size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>
          Safety Check
        </h1>
      </div>
      <p style={{ color: "var(--text-muted)" }}>
>>>>>>> main
        Calculate rollover risk and braking distance based on current
        conditions.
      </p>

      <Card>
        <CardHeader>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
<<<<<<< HEAD
            <ShieldCheck style={{ height: 24, width: 24, color: "#2563eb" }} />
=======
            <ShieldCheck style={{ height: 24, width: 24, color: "var(--color-primary-500)" }} />
>>>>>>> main
            Enter Bus Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
<<<<<<< HEAD
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
=======
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
>>>>>>> main
                >
                  Seated Passengers
                </label>
                <Input
                  type="number"
                  {...register("seated", { required: true, min: 0 })}
                  placeholder="e.g. 40"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
<<<<<<< HEAD
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
=======
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
>>>>>>> main
                >
                  Standing Passengers
                </label>
                <Input
                  type="number"
                  {...register("standing", { required: true, min: 0 })}
                  placeholder="e.g. 10"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
<<<<<<< HEAD
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
=======
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
>>>>>>> main
                >
                  Speed (km/h)
                </label>
                <Input
                  type="number"
                  {...register("speed", { required: true, min: 0 })}
                  placeholder="e.g. 60"
                />
              </div>
            </div>
            <Button type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Calculating..." : "Analyze Safety"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            animation: "fadeInUp 0.5s",
          }}
        >
          <Card
            style={
              result.rolloverRisk
<<<<<<< HEAD
                ? { background: "#fef2f2", border: "1px solid #fecaca" }
                : { background: "#f0fdf4", border: "1px solid #bbf7d0" }
=======
                ? { background: "var(--color-danger-50)", border: "1px solid var(--color-danger-200)" }
                : { background: "var(--color-success-50)", border: "1px solid var(--color-success-200)" }
>>>>>>> main
            }
          >
            <CardHeader>
              <CardTitle
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 18,
                }}
              >
                {result.rolloverRisk ? (
<<<<<<< HEAD
                  <AlertTriangle style={{ color: "#dc2626" }} />
                ) : (
                  <ShieldCheck style={{ color: "#22c55e" }} />
=======
                  <AlertTriangle style={{ color: "var(--color-danger-500)" }} />
                ) : (
                  <ShieldCheck style={{ color: "var(--color-success-500)" }} />
>>>>>>> main
                )}
                Rollover Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                {result.rolloverRisk ? "High Risk" : "Safe"}
              </p>
              <p style={{ fontSize: 14, opacity: 0.8 }}>
                {result.rolloverRisk
                  ? "The bus is unstable at this speed with the current load."
                  : "The bus is stable under these conditions."}
              </p>
<<<<<<< HEAD
              {result["Distance to sharpest curve"] && (
                 <div style={{ marginTop: 12, padding: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        ⚠️ Curve Ahead: {result["Distance to sharpest curve"]}
                    </p>
                 </div>
              )}
=======
>>>>>>> main
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 18,
                }}
              >
<<<<<<< HEAD
                <Info style={{ color: "#2563eb" }} />
=======
                <Info style={{ color: "var(--color-primary-500)" }} />
>>>>>>> main
                Braking Distance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
<<<<<<< HEAD
                  <p style={{ fontSize: 14, color: "#64748b" }}>Dry Road</p>
=======
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Dry Road</p>
>>>>>>> main
                  <p style={{ fontSize: 20, fontWeight: 700 }}>
                    {result.stoppingDistance?.dry?.toFixed(1)} m
                  </p>
                </div>
                <div>
<<<<<<< HEAD
                  <p style={{ fontSize: 14, color: "#64748b" }}>Wet Road</p>
=======
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Wet Road</p>
>>>>>>> main
                  <p style={{ fontSize: 20, fontWeight: 700 }}>
                    {result.stoppingDistance?.wet?.toFixed(1)} m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PhysicsCheck;
