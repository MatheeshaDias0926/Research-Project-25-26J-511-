import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { TrendingUp, Clock, Users, Map } from "lucide-react";

const Prediction = () => {
  const [routeId, setRouteId] = useState("ROUTE-138");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-fetch on mount for demo
  useEffect(() => {
    fetchPrediction();
  }, []);

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bus/predict/${routeId}`);
      setPrediction(response.data);
    } catch (error) {
      console.error("Prediction failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 896,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
          Occupancy Prediction
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            style={{
              height: 40,
              borderRadius: 8,
              border: "1px solid var(--border-input)",
              background: "var(--bg-card)",
              padding: "0 12px",
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="ROUTE-138">Route 138 (Colombo-Homagama)</option>
            <option value="ROUTE-120">Route 120 (Colombo-Horana)</option>
            <option value="ROUTE-177">Route 177 (Kollupitiya-Kaduwela)</option>
          </select>
          <Button onClick={fetchPrediction} disabled={loading}>
            {loading ? "Refreshing..." : "Update"}
          </Button>
        </div>
      </div>

      {prediction && (
        <Card style={{ overflow: "hidden" }}>
          <div
            style={{
              background: "linear-gradient(to right, #2563eb, #1e40af)",
              padding: 32,
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 24, fontWeight: 700 }}>
                {routeId} Analysis
              </h2>
              <Badge
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  border: "none",
                }}
              >
                ML Model v1.0
              </Badge>
            </div>
            <p style={{ opacity: 0.9 }}>
              Based on historical data and current time.
            </p>
          </div>

          <CardContent style={{ padding: 32 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 32,
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: 16,
                  background: "var(--bg-primary)",
                  borderRadius: 16,
                }}
              >
                <Users
                  style={{
                    height: 32,
                    width: 32,
                    color: "#2563eb",
                    margin: "0 auto 8px",
                  }}
                />
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Predicted Occupancy
                </p>
                <p style={{ fontSize: 30, fontWeight: 700, color: "var(--text-primary)" }}>
                  {prediction.predictedOccupancy || 42}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Passengers
                </p>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: 16,
                  background: "var(--bg-primary)",
                  borderRadius: 16,
                }}
              >
                <TrendingUp
                  style={{
                    height: 32,
                    width: 32,
                    color: "#22c55e",
                    margin: "0 auto 8px",
                  }}
                />
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Confidence Score
                </p>
                <p style={{ fontSize: 30, fontWeight: 700, color: "var(--text-primary)" }}>
                  {prediction.confidence
                    ? (prediction.confidence * 100).toFixed(0)
                    : 85}
                  %
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Accuracy Probability
                </p>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: 16,
                  background: "var(--bg-primary)",
                  borderRadius: 16,
                }}
              >
                <Clock
                  style={{
                    height: 32,
                    width: 32,
                    color: "#f59e42",
                    margin: "0 auto 8px",
                  }}
                />
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Next Bus In
                </p>
                <p style={{ fontSize: 30, fontWeight: 700, color: "var(--text-primary)" }}>
                  12
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Minutes (Est)
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 32,
                padding: 16,
                background: "#eff6ff",
                border: "1px solid #dbeafe",
                borderRadius: 12,
                display: "flex",
                gap: 12,
                color: "#1e40af",
              }}
            >
              <Map
                style={{ height: 20, width: 20, flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <p style={{ fontWeight: 600 }}>Route Recommendation</p>
                <p style={{ fontSize: 14, marginTop: 4, color: "#1d4ed8" }}>
                  Current traffic suggests moderate congestion. The predicted
                  occupancy indicates seating might be available if you board
                  within the next 15 minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Prediction;
