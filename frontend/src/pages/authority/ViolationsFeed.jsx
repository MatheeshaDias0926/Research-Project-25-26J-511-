import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { AlertTriangle, Clock, MapPin } from "lucide-react";

/**
 * Note: The backend endpoint `GET /api/bus/:busId/violations` gets violations for ONE bus.
 * To get a system-wide feed, we probably need a new endpoint or iterate active buses.
 * For now, we will mock the feed or just fallback to fetching a few active buses and aggregating.
 * OR if the backend supports `GET /api/violations` (it wasn't in the list), we'd use that.
 * Let's assume we need to fetch for active buses or just mock the aggregation for the UI demo.
 */
const ViolationsFeed = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulating fetching a feed. Real implementation would likely need a backend update for "All Violations"
    // or we fetch the "All Buses" and then fetch violations for each (inefficient but works for small scale).
    const fetchViolations = async () => {
      try {
        const buses = await api.get("/bus");
        // For demo purposes, let's just use mock data mixed with real bus IDs if possible
        // or just static mock data to demonstrate the UI since we can't easily query all violations yet.

        const mockViolations = [
          {
            _id: "v1",
            busId: "BUS-1234",
            licensePlate: "NP-1234",
            type: "footboard",
            description: "Passenger on footboard while moving",
            speed: 45,
            timestamp: new Date().toISOString(),
          },
          {
            _id: "v2",
            busId: "BUS-5678",
            licensePlate: "WP-5678",
            type: "overcrowding",
            description: "Occupancy exceeded safety limit (65/50)",
            speed: 20,
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
          },
          {
            _id: "v3",
            busId: "BUS-9999",
            licensePlate: "CP-9999",
            type: "speeding",
            description: "Speed limit exceeded (85 km/h)",
            speed: 85,
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
          },
        ];
        setViolations(mockViolations);
      } catch (error) {
        console.error("Failed to fetch violations", error);
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, []);

  const getViolationBadge = (type) => {
    switch (type) {
      case "footboard":
        return <Badge variant="danger">Footboard</Badge>;
      case "speeding":
        return <Badge variant="danger">Speeding</Badge>;
      case "overcrowding":
        return <Badge variant="warning">Overcrowding</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) return <div>Loading violations...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        Violation Log
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {violations.map((violation) => (
          <Card key={violation._id} style={{ borderLeft: "4px solid #ef4444" }}>
            <CardContent
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                justifyContent: "space-between",
                ...(window.innerWidth >= 768
                  ? { flexDirection: "row", alignItems: "center" }
                  : {}),
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 16 }}
              >
                <div
                  style={{
                    padding: 8,
                    background: "#fee2e2",
                    borderRadius: 9999,
                    color: "#dc2626",
                    marginTop: 4,
                  }}
                >
                  <AlertTriangle style={{ height: 20, width: 20 }} />
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <h3
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#0f172a",
                      }}
                    >
                      {violation.licensePlate}
                    </h3>
                    {getViolationBadge(violation.type)}
                  </div>
                  <p style={{ color: "#475569", fontWeight: 500 }}>
                    {violation.description}
                  </p>
                  <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                    Speed: {violation.speed} km/h
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  fontSize: 14,
                  color: "#64748b",
                  minWidth: 150,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock style={{ height: 16, width: 16 }} />
                  {new Date(violation.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin style={{ height: 16, width: 16 }} />
                  Colombo, LK
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  {new Date(violation.timestamp).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ViolationsFeed;
