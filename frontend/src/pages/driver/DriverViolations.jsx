import { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { FileWarning, Clock, Bus } from "lucide-react";

const DriverViolations = () => {
  const { user } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        // Get driver's assigned bus, then fetch violations
        const profileRes = await api.get("/auth/profile");
        const busData = profileRes.data.assignedBus;

        if (busData) {
          const busId = typeof busData === "object" ? busData._id : busData;
          const res = await api.get(`/bus/${busId}/violations`);
          setViolations(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, []);

  const getViolationColor = (type) => {
    switch (type) {
      case "speed": return { bg: "#fee2e2", color: "#991b1b" };
      case "overcrowding": return { bg: "#fef9c3", color: "#854d0e" };
      case "route_deviation": return { bg: "#faf5ff", color: "#7c3aed" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
        <FileWarning size={28} /> My Violations
      </h1>

      {violations.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {violations.map((v, i) => {
            const vc = getViolationColor(v.type);
            return (
              <div key={v._id || i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: vc.bg, color: vc.color, textTransform: "capitalize" }}>
                        {v.type || "violation"}
                      </span>
                      {v.severity && (
                        <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: v.severity === "high" ? "#fee2e2" : "#fef9c3", color: v.severity === "high" ? "#991b1b" : "#854d0e" }}>
                          {v.severity}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, color: "#334155" }}>{v.description || v.message || "Violation recorded"}</p>
                    {v.details && <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{JSON.stringify(v.details)}</p>}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    <Clock size={14} />
                    {new Date(v.createdAt || v.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <FileWarning size={48} style={{ margin: "0 auto 12px" }} />
          <p>No violations recorded</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Keep driving safely!</p>
        </div>
      )}
    </div>
  );
};

export default DriverViolations;
