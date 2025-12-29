import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Bus, AlertTriangle, CheckCircle, Wrench, UserPlus } from "lucide-react";

const AuthorityDashboard = () => {
  const [stats, setStats] = useState({
    activeBuses: 0,
    conductors: 0,
    totalViolations: 0,
    pendingMaintenance: 0,
    systemStatus: "Healthy",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd have a specific analytics endpoint.
    // Here we'll just fetch list of buses to count them and mock the rest or fetch maintenance.
    const fetchData = async () => {
      try {
        const busesRes = await api.get("/bus");
        const statsRes = await api.get("/auth/stats");
        // const maintenanceRes = await api.get("/maintenance"); // if implemented
        setStats({
          activeBuses: busesRes.data.length,
          conductors: statsRes.data.conductors,
          totalViolations: statsRes.data.totalViolations,
          pendingMaintenance: statsRes.data.pendingMaintenance,
          systemStatus: "Healthy",
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        System Overview
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
        }}
      >
        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Active Buses
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.activeBuses}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#dbeafe",
                borderRadius: 9999,
                color: "#2563eb",
              }}
            >
              <Bus style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Total Conductors
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.conductors}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#f0f9ff",
                borderRadius: 9999,
                color: "#0284c7",
              }}
            >
              <UserPlus style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Violations (24h)
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.totalViolations}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#fee2e2",
                borderRadius: 9999,
                color: "#dc2626",
              }}
            >
              <AlertTriangle style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Maintenance
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {stats.pendingMaintenance}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#ffedd5",
                borderRadius: 9999,
                color: "#ea580c",
              }}
            >
              <Wrench style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                System Status
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>
                {stats.systemStatus}
              </p>
            </div>
            <div
              style={{
                padding: 12,
                background: "#bbf7d0",
                borderRadius: 9999,
                color: "#22c55e",
              }}
            >
              <CheckCircle style={{ height: 24, width: 24 }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>
          Quick Actions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          <a href="/authority/conductors" style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <CardContent
                style={{
                  padding: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    Manage Conductors
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Register & Assign Buses
                  </p>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#f1f5f9",
                    borderRadius: 9999,
                    color: "#475569",
                  }}
                >
                  <UserPlus style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/authority/safety" style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <CardContent
                style={{
                  padding: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    Safety Check
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Run Physics Simulation
                  </p>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: "#f1f5f9",
                    borderRadius: 9999,
                    color: "#475569",
                  }}
                >
                  <AlertTriangle style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      </div>

      {/* Could add a chart or recent activity list here later */}
    </div >
  );
};

export default AuthorityDashboard;
