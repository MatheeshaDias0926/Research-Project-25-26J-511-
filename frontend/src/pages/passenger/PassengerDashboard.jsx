import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Users, Activity } from "lucide-react";

const PassengerDashboard = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await api.get("/bus");
      setBuses(response.data);
    } catch (error) {
      console.error("Failed to fetch buses", error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage > 90) return "text-red-600";
    if (percentage > 70) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>Loading buses...</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
          Active Buses
        </h1>
        <Badge
          variant="secondary"
          style={{ fontSize: 14, padding: "4px 12px" }}
        >
          {buses.length} Active
        </Badge>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        {buses.map((bus) => (
          <Card key={bus._id} style={{ transition: "box-shadow 0.2s" }}>
            <CardContent style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      padding: 8,
                      background: "#f0f9ff",
                      borderRadius: 12,
                    }}
                  >
                    <Bus style={{ height: 24, width: 24, color: "#0284c7" }} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#0f172a",
                      }}
                    >
                      {bus.licensePlate}
                    </h3>
                    <p style={{ fontSize: 14, color: "#64748b" }}>
                      Route {bus.routeId}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    (typeof bus.currentStatus === "string" &&
                      bus.currentStatus === "active") ||
                      (typeof bus.currentStatus === "object" && bus.currentStatus)
                      ? "success"
                      : "secondary"
                  }
                >
                  {typeof bus.currentStatus === "object"
                    ? "Active"
                    : bus.currentStatus || "Inactive"}
                </Badge>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#475569",
                    }}
                  >
                    <Users style={{ height: 16, width: 16 }} /> Occupancy
                  </span>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>
                    {bus.capacity} Max
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#475569",
                    }}
                  >
                    <MapPin style={{ height: 16, width: 16 }} /> Live Tracking
                  </span>
                  <Link
                    to={`/passenger/prediction`}
                    style={{
                      color: "#2563eb",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    View Prediction
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {buses.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "48px 0",
              color: "#64748b",
            }}
          >
            No buses found.
          </div>
        )}
      </div>
    </div>
  );
};

export default PassengerDashboard;
