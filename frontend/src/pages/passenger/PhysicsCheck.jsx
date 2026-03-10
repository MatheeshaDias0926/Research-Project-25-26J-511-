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
        Calculate rollover risk and braking distance based on current
        conditions.
      </p>

      <Card>
        <CardHeader>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck style={{ height: 24, width: 24, color: "var(--color-primary-500)" }} />
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
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
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
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
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
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
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
                ? { background: "var(--color-danger-50)", border: "1px solid var(--color-danger-200)" }
                : { background: "var(--color-success-50)", border: "1px solid var(--color-success-200)" }
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
                  <AlertTriangle style={{ color: "var(--color-danger-500)" }} />
                ) : (
                  <ShieldCheck style={{ color: "var(--color-success-500)" }} />
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
                <Info style={{ color: "var(--color-primary-500)" }} />
                Braking Distance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Dry Road</p>
                  <p style={{ fontSize: 20, fontWeight: 700 }}>
                    {result.stoppingDistance?.dry?.toFixed(1)} m
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Wet Road</p>
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
