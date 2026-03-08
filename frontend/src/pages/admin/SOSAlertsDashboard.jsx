import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Siren, CheckCircle, AlertTriangle, Clock, Eye } from "lucide-react";

const SOSAlertsDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchAlerts = async () => {
    try {
      const params = {};
      if (filter !== "all") params.status = filter;
      const res = await api.get("/sos", { params });
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/sos/${id}/acknowledge`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.put(`/sos/${id}/resolve`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return { bg: "#fee2e2", color: "#991b1b" };
      case "acknowledged": return { bg: "#fef9c3", color: "#854d0e" };
      case "resolved": return { bg: "#dcfce7", color: "#166534" };
      default: return { bg: "#f1f5f9", color: "var(--text-secondary)" };
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case "emergency": return "🚨";
      case "accident": return "💥";
      case "breakdown": return "🔧";
      case "medical": return "🏥";
      case "security": return "🛡️";
      default: return "⚠️";
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  const activeCount = alerts.filter(a => a.status === "active").length;
  const acknowledgedCount = alerts.filter(a => a.status === "acknowledged").length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{
            padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, var(--color-danger-500), var(--color-danger-600))",
          }}>
            <Siren size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>
            SOS Alerts
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ padding: "6px 14px", borderRadius: 20, fontSize: "var(--text-sm)", fontWeight: 600, background: "var(--color-danger-100)", color: "#991b1b" }}>
            {activeCount} Active
          </span>
          <span style={{ padding: "6px 14px", borderRadius: 20, fontSize: "var(--text-sm)", fontWeight: 600, background: "#fef9c3", color: "#854d0e" }}>
            {acknowledgedCount} Acknowledged
          </span>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all", "active", "acknowledged", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13,
              background: filter === f ? "#0284c7" : "#f1f5f9",
              color: filter === f ? "#fff" : "#475569",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map((alert) => {
          const statusColors = getStatusColor(alert.status);
          return (
            <div key={alert._id} style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{getAlertTypeIcon(alert.alertType)}</span>
                    <h3 style={{ fontWeight: 600, fontSize: 16, textTransform: "capitalize" }}>{alert.alertType}</h3>
                    <span style={{ padding: "3px 10px", borderRadius: "var(--radius-lg)", fontSize: 12, fontWeight: 500, background: statusColors.bg, color: statusColors.color }}>
                      {alert.status}
                    </span>
                  </div>
                  {alert.description && <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 8 }}>{alert.description}</p>}
                  <div style={{ display: "flex", gap: 16, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    <span>Bus: <strong style={{ color: "var(--text-secondary)" }}>{alert.busId?.licensePlate || "N/A"}</strong></span>
                    <span>By: <strong style={{ color: "var(--text-secondary)" }}>{alert.reportedBy?.username || "N/A"}</strong> ({alert.reportedBy?.role})</span>
                    <span><Clock size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {alert.status === "active" && (
                    <button onClick={() => handleAcknowledge(alert._id)} style={{ padding: "8px 16px", background: "#fef9c3", color: "#854d0e", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 13 }}>
                      <Eye size={14} style={{ display: "inline", marginRight: 4 }} /> Acknowledge
                    </button>
                  )}
                  {alert.status !== "resolved" && (
                    <button onClick={() => handleResolve(alert._id)} style={{ padding: "8px 16px", background: "#dcfce7", color: "#166534", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 13 }}>
                      <CheckCircle size={14} style={{ display: "inline", marginRight: 4 }} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <Siren size={48} style={{ margin: "0 auto 16px" }} />
          <p>No SOS alerts {filter !== "all" ? `with status "${filter}"` : ""}</p>
        </div>
      )}
    </div>
  );
};

export default SOSAlertsDashboard;
