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
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        Safety Check
      </h1>
      <p style={{ color: "#475569" }}>
        Calculate rollover risk and braking distance based on current
        conditions.
      </p>

      <Card>
        <CardHeader>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck style={{ height: 24, width: 24, color: "#2563eb" }} />
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
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
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
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
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
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
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
                ? { background: "#fef2f2", border: "1px solid #fecaca" }
                : { background: "#f0fdf4", border: "1px solid #bbf7d0" }
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
                  <AlertTriangle style={{ color: "#dc2626" }} />
                ) : (
                  <ShieldCheck style={{ color: "#22c55e" }} />
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
                <Info style={{ color: "#2563eb" }} />
                Braking Distance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <p style={{ fontSize: 14, color: "#64748b" }}>Dry Road</p>
                  <p style={{ fontSize: 20, fontWeight: 700 }}>
                    {result.stoppingDistance?.dry?.toFixed(1)} m
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: "#64748b" }}>Wet Road</p>
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
