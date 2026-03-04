import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  Card,
  CardContent,
} from "../components/ui/Card";
import { Bus, AlertTriangle, CheckCircle, Clock, Route, Users, ChevronRight, Gauge } from "lucide-react";

const severityConfig = {
  critical: { bg: "#fee2e2", text: "#dc2626" },
  high: { bg: "#ffedd5", text: "#ea580c" },
  medium: { bg: "#fef9c3", text: "#ca8a04" },
  low: { bg: "#dbeafe", text: "#2563eb" },
};

const statusConfig = {
  active: { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626" },
  responded: { bg: "#ffedd5", text: "#ea580c", dot: "#ea580c" },
  resolved: { bg: "#dcfce7", text: "#16a34a", dot: "#16a34a" },
};

const BusOwnerDashboard = () => {
  const [buses, setBuses] = useState([]);
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [busRes, crashRes] = await Promise.all([
          api.get("/bus"),
          api.get("/crashes"),
        ]);
        setBuses(busRes.data.buses || (Array.isArray(busRes.data) ? busRes.data : []));
        const crashData = crashRes.data.crashes || crashRes.data.data || (Array.isArray(crashRes.data) ? crashRes.data : []);
        setCrashes(crashData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, border: "3px solid var(--border-secondary)", borderTopColor: "#2563eb",
            borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading fleet data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const activeCrashes = crashes.filter((c) => c.status === "active");

  const stats = [
    { label: "Total Fleet", value: buses.length, color: "#2563eb", bgGrad: "linear-gradient(135deg, #eff6ff, #dbeafe)", borderColor: "#bfdbfe", icon: Bus, iconBg: "#2563eb" },
    { label: "Active Crashes", value: activeCrashes.length, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: AlertTriangle, iconBg: "#dc2626" },
    { label: "Total Incidents", value: crashes.length, color: "#ea580c", bgGrad: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderColor: "#fed7aa", icon: Gauge, iconBg: "#ea580c" },
    { label: "System Status", value: "Online", color: "#16a34a", bgGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#bbf7d0", icon: CheckCircle, iconBg: "#16a34a", isText: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ padding: 10, background: "linear-gradient(135deg, #2563eb, #3b82f6)", borderRadius: 12 }}>
            <Bus style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              My Fleet
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>
              Fleet management and crash incident overview
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} style={{ background: s.bgGrad, border: `1px solid ${s.borderColor}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
            >
              <CardContent style={{ padding: 22, paddingTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontSize: s.isText ? 22 : 36, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                </div>
                <div style={{ padding: 14, background: s.iconBg, borderRadius: 14, color: "#fff", boxShadow: `0 4px 14px ${s.iconBg}40` }}>
                  <Icon style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fleet Overview */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Fleet Overview</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{buses.length} buses registered</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {buses.map((bus) => {
            const busHasCrash = crashes.some(c => (c.bus_id === bus.bus_id || c.bus_id === bus.bus_number) && c.status === "active");
            return (
              <Card key={bus._id} style={{
                transition: "transform 0.2s, box-shadow 0.2s",
                borderLeft: busHasCrash ? "4px solid #dc2626" : "4px solid #2563eb",
                cursor: "default",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
              >
                <CardContent style={{ padding: 22, paddingTop: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                        {bus.bus_number || bus.licensePlate || bus.vehicle_number}
                      </p>
                      {busHasCrash && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fee2e2",
                          padding: "2px 8px", borderRadius: 6, marginTop: 4, display: "inline-block",
                        }}>CRASH ACTIVE</span>
                      )}
                    </div>
                    <div style={{
                      padding: 10,
                      background: busHasCrash ? "linear-gradient(135deg, #dc2626, #ef4444)" : "linear-gradient(135deg, #2563eb, #3b82f6)",
                      borderRadius: 12, color: "#fff",
                    }}>
                      <Bus style={{ height: 20, width: 20 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Route style={{ height: 14, width: 14, color: "var(--text-muted)" }} />
                      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
                        Route: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{bus.route || bus.routeId || "N/A"}</span>
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Users style={{ height: 14, width: 14, color: "var(--text-muted)" }} />
                      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
                        Capacity: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{bus.no_of_seats || bus.capacity || "N/A"} seats</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {buses.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 48 }}>
              <Bus style={{ height: 40, width: 40, color: "var(--border-input)", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>No buses registered</p>
            </div>
          )}
        </div>
      </div>

      {/* Crash History */}
      {crashes.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Crash History</h2>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Last {Math.min(crashes.length, 10)} incidents</span>
          </div>
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {["Bus", "Time", "Severity", "Status", ""].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crashes.slice(0, 10).map((crash, idx) => {
                    const sev = severityConfig[crash.severity] || severityConfig.medium;
                    const stat = statusConfig[crash.status] || statusConfig.active;
                    const isActive = crash.status === "active";
                    return (
                      <tr key={crash._id} data-active={isActive ? "true" : undefined}>
                        <td>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {crash.bus_id || crash.busId?.licensePlate || "N/A"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                            <Clock style={{ height: 14, width: 14, flexShrink: 0 }} />
                            {new Date(crash.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: sev.bg, color: sev.text, letterSpacing: "0.03em",
                          }}>
                            {crash.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isActive && (
                              <span style={{
                                width: 8, height: 8, borderRadius: "50%", background: stat.dot,
                                boxShadow: `0 0 0 3px ${stat.dot}30`,
                                animation: "pulse 1.5s ease-in-out infinite",
                              }} />
                            )}
                            <span style={{
                              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: stat.bg, color: stat.text, letterSpacing: "0.03em",
                            }}>
                              {crash.status?.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <ChevronRight style={{ height: 16, width: 16, color: "var(--text-faint)" }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusOwnerDashboard;
