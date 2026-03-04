import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  Card,
  CardContent,
} from "../components/ui/Card";
import { Hospital, AlertTriangle, Clock, Activity, MapPin, ChevronRight, Heart } from "lucide-react";

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

const HospitalDashboard = () => {
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCrashes = async () => {
      try {
        const res = await api.get("/crashes");
        const data = res.data.crashes || res.data.data || (Array.isArray(res.data) ? res.data : []);
        setCrashes(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (error) {
        console.error("Failed to load crash alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCrashes();
    const interval = setInterval(fetchCrashes, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, border: "3px solid var(--border-secondary)", borderTopColor: "#dc2626",
            borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading emergency data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const critical = crashes.filter((c) => c.severity === "critical");
  const high = crashes.filter((c) => c.severity === "high");
  const medium = crashes.filter((c) => c.severity === "medium");
  const active = crashes.filter((c) => c.status === "active");

  const stats = [
    { label: "Critical Cases", value: critical.length, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: AlertTriangle, iconBg: "#dc2626" },
    { label: "High Severity", value: high.length, color: "#ea580c", bgGrad: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderColor: "#fed7aa", icon: Activity, iconBg: "#ea580c" },
    { label: "Medium Cases", value: medium.length, color: "#ca8a04", bgGrad: "linear-gradient(135deg, #fefce8, #fef9c3)", borderColor: "#fde68a", icon: Heart, iconBg: "#ca8a04" },
    { label: "Active Now", value: active.length, color: "#7c3aed", bgGrad: "linear-gradient(135deg, #f5f3ff, #ede9fe)", borderColor: "#ddd6fe", icon: Hospital, iconBg: "#7c3aed" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ padding: 10, background: "linear-gradient(135deg, #dc2626, #ef4444)", borderRadius: 12 }}>
            <Hospital style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              Hospital Emergency Intake
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>
              Monitor incoming crash victims and triage priorities
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
                  <p style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                </div>
                <div style={{ padding: 14, background: s.iconBg, borderRadius: 14, color: "#fff", boxShadow: `0 4px 14px ${s.iconBg}40` }}>
                  <Icon style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Triage Priority Banner */}
      {critical.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #dc2626, #991b1b)",
          borderRadius: 14,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          boxShadow: "0 4px 20px rgba(220, 38, 38, 0.3)",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#fff",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.05em", margin: 0 }}>
            {critical.length} CRITICAL CASE{critical.length > 1 ? "S" : ""} — IMMEDIATE MEDICAL ATTENTION REQUIRED
          </p>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#fff",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }`}</style>
        </div>
      )}

      {/* Incoming Alerts Table */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Incoming Alerts</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{crashes.length} total records</span>
        </div>
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Bus", "Time", "Location", "Severity", "Status", ""].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crashes.map((crash, idx) => {
                  const sev = severityConfig[crash.severity] || severityConfig.medium;
                  const stat = statusConfig[crash.status] || statusConfig.active;
                  const isCritical = crash.severity === "critical";
                  const isActive = crash.status === "active";
                  return (
                    <tr
                      key={crash._id}
                      data-active={isActive ? "true" : undefined}
                      data-critical={isCritical ? "true" : undefined}
                    >
                      <td>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <MapPin style={{ height: 14, width: 14, flexShrink: 0 }} />
                          {crash.location?.address || (crash.location ? `${crash.location.latitude || crash.location.lat}, ${crash.location.longitude || crash.location.lon}` : "N/A")}
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
                {crashes.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: "center" }}>
                      <Hospital style={{ height: 40, width: 40, color: "var(--border-input)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>No emergency alerts at this time</p>
                      <p style={{ color: "var(--text-faint)", fontSize: 13 }}>System monitoring active</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
