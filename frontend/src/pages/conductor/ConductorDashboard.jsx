import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Wrench, AlertTriangle, RefreshCw } from "lucide-react";

const ConductorDashboard = () => {
  const { user } = useAuth();
  const [myBus, setMyBus] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    if (!user?.assignedBus?._id) return;

    setLoading(true);
    try {
      const busId = user.assignedBus._id;

      // 1. Fetch latest Bus Status
      const statusRes = await api.get(`/bus/${busId}/status`);
      setMyBus(statusRes.data.bus);
      // Note: statusRes.data.currentStatus contains the updated status object including location

      // 2. Fetch Violations (Alerts)
      const violationRes = await api.get(`/bus/${busId}/violations?limit=5`);
      setViolations(violationRes.data.violations);

      setLastUpdated(new Date());

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user?.assignedBus) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Bus style={{ height: 48, width: 48, margin: "0 auto 16px", color: "#94a3b8" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#334155" }}>No Bus Assigned</h2>
        <p style={{ color: "#64748b" }}>Please contact the authority to assign a bus to your account.</p>
      </div>
    );
  }

  if (loading && !myBus) return <div style={{ padding: 40, textAlign: "center" }}>Loading dashboard...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>My Bus Dashboard</h1>
          <p style={{ color: "#64748b" }}>Real-time overview of your vehicle status.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="outline" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RefreshCw size={16} /> Refresh
          </Button>
          <Link to="/conductor/maintenance">
            <Button variant="secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Wrench style={{ height: 16, width: 16 }} /> Report Issue
            </Button>
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Main Bus Card */}
        <Card style={{ gridColumn: "span 2", background: "#0f172a", color: "#fff" }}>
          <CardContent style={{ padding: 32, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 24 }}>
                <Bus style={{ height: 48, width: 48, color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {myBus?.licensePlate || user.assignedBus.licensePlate}
                </h2>
                <p style={{ color: "#94a3b8", fontSize: 18 }}>
                  Route {myBus?.routeId || user.assignedBus.routeId}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Capacity</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{myBus?.capacity || 55}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Alerts / Violations */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle style={{ height: 20, width: 20, color: "#f59e42" }} />
              Recent Alerts
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {violations.length === 0 ? (
                <div style={{ padding: 12, background: "#f0fdf4", color: "#15803d", borderRadius: 8, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ height: 8, width: 8, borderRadius: 9999, background: "#22c55e" }}></div>
                  No active violations or alerts.
                </div>
              ) : (
                violations.map((v) => (
                  <div key={v._id} style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 14 }}>{v.violationType}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(v.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#64748b" }}>
                      Occurred at location. Speed: {v.speed ? `${v.speed} km/h` : 'N/A'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Status */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin style={{ height: 20, width: 20, color: "#2563eb" }} />
              Location Status
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <span style={{ color: "#64748b" }}>Last Update</span>
                <span style={{ fontWeight: 500 }}>{lastUpdated.toLocaleTimeString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <span style={{ color: "#64748b" }}>Data Connection</span>
                <Badge variant="success">Active</Badge>
              </div>

              {/* If we had specific lat/long, we could show a mini static map here */}
              <div style={{ marginTop: 8, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", animation: "pulse 2s infinite" }}></div>
                Tracking system is operational.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConductorDashboard;
