import { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { Siren, Send, Clock, CheckCircle } from "lucide-react";

const DriverSOS = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    busId: "",
    alertType: "emergency",
    description: "",
  });
  const [assignedBus, setAssignedBus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertsRes, profileRes] = await Promise.all([
          api.get("/sos/my"),
          api.get("/auth/profile"),
        ]);
        setAlerts(alertsRes.data);
        if (profileRes.data.assignedBus) {
          const busData = profileRes.data.assignedBus;
          setAssignedBus(typeof busData === "object" ? busData : { _id: busData });
          setForm(prev => ({ ...prev, busId: typeof busData === "object" ? busData._id : busData }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/sos", form);
      setMessage("SOS Alert sent successfully!");
      setShowForm(false);
      setForm(prev => ({ ...prev, alertType: "emergency", description: "" }));
      const alertsRes = await api.get("/sos/my");
      setAlerts(alertsRes.data);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send SOS");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return { bg: "#fee2e2", color: "#991b1b" };
      case "acknowledged": return { bg: "#fef9c3", color: "#854d0e" };
      case "resolved": return { bg: "#dcfce7", color: "#166534" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Siren size={28} /> SOS Alerts
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 15 }}
        >
          <Siren size={18} /> Send SOS
        </button>
      </div>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 24, borderRadius: 12, border: "2px solid #ef4444", marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, color: "#ef4444" }}>Send Emergency SOS</h3>
          {!assignedBus && (
            <div style={{ color: "#f59e0b", marginBottom: 12, fontSize: 14 }}>
              No bus assigned to you. Contact admin.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Alert Type</label>
              <select value={form.alertType} onChange={(e) => setForm({ ...form, alertType: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                <option value="emergency">Emergency</option>
                <option value="accident">Accident</option>
                <option value="breakdown">Breakdown</option>
                <option value="medical">Medical</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the situation..." style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" disabled={!assignedBus} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", background: assignedBus ? "#ef4444" : "#94a3b8", color: "#fff", border: "none", borderRadius: 8, cursor: assignedBus ? "pointer" : "not-allowed", fontWeight: 600 }}>
                <Send size={16} /> Send Alert
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "12px 24px", background: "#e2e8f0", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* My Alerts */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>My Alerts</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map((alert) => {
          const sc = getStatusColor(alert.status);
          return (
            <div key={alert._id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{alert.alertType}</span>
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: sc.bg, color: sc.color }}>{alert.status}</span>
                  </div>
                  {alert.description && <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{alert.description}</p>}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={14} />
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
          <CheckCircle size={48} style={{ margin: "0 auto 12px" }} />
          <p>No SOS alerts sent</p>
        </div>
      )}
    </div>
  );
};

export default DriverSOS;
