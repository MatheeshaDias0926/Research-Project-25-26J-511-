import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Wrench, AlertTriangle } from "lucide-react";

const ConductorDashboard = () => {
  const [myBus, setMyBus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch the bus assigned to the logged-in conductor.
    // Since our backend doesn't explicitly link user->bus in the User model without extra query,
    // we'll simulate fetching the "first active bus" or a specific one for demo.
    const fetchBus = async () => {
      try {
        const response = await api.get("/bus");
        if (response.data.length > 0) {
          setMyBus(response.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch bus", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBus();
  }, []);

  if (loading) return <div>Loading assigned bus...</div>;

  if (!myBus)
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Bus
          style={{
            height: 48,
            width: 48,
            margin: "0 auto 16px",
            color: "#94a3b8",
          }}
        />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#334155" }}>
          No Bus Assigned
        </h2>
        <p style={{ color: "#64748b" }}>
          Please contact the authority to assign a bus.
        </p>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
            My Bus
          </h1>
          <p style={{ color: "#64748b" }}>
            Manage your assigned vehicle for today.
          </p>
        </div>
        <Link to="/conductor/maintenance">
          <Button
            variant="secondary"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Wrench style={{ height: 16, width: 16 }} /> Report Issue
          </Button>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <Card
          style={{ gridColumn: "span 2", background: "#0f172a", color: "#fff" }}
        >
          <CardContent
            style={{
              padding: 32,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  padding: 16,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 24,
                }}
              >
                <Bus style={{ height: 48, width: 48, color: "#fff" }} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {myBus.licensePlate}
                </h2>
                <p style={{ color: "#94a3b8", fontSize: 18 }}>
                  Route {myBus.routeId}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 24px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              >
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Status</p>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    textTransform: "capitalize",
                    color: "#4ade80",
                  }}
                >
                  {myBus.currentStatus}
                </p>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 24px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              >
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Capacity</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>
                  {myBus.capacity}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle
                style={{ height: 20, width: 20, color: "#f59e42" }}
              />{" "}
              Current Alerts
            </h3>
            {/* Mock alerts since we don't have a direct "alerts" field on bus object without fetching violations */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  padding: 12,
                  background: "#f0fdf4",
                  color: "#15803d",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: 9999,
                    background: "#22c55e",
                  }}
                ></div>
                No active violations.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3
              style={{
                fontWeight: 600,
                fontSize: 18,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MapPin style={{ height: 20, width: 20, color: "#2563eb" }} />{" "}
              Location Status
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "#64748b" }}>Last Update</span>
                <span style={{ fontWeight: 500 }}>Just now</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "#64748b" }}>GPS Signal</span>
                <Badge variant="success">Strong</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConductorDashboard;
