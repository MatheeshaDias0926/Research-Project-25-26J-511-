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
      default: return { bg: "#f1f5f9", color: "var(--text-secondary)" };
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: 24 }}>
        <div style={{
          padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))",
        }}>
          <FileWarning size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>
          My Violations
        </h1>
      </div>

      {violations.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {violations.map((v, i) => {
            const vc = getViolationColor(v.type);
            return (
              <div key={v._id || i} style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: "var(--radius-lg)", padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ padding: "3px 10px", borderRadius: "var(--radius-lg)", fontSize: 12, fontWeight: 500, background: vc.bg, color: vc.color, textTransform: "capitalize" }}>
                        {v.type || "violation"}
                      </span>
                      {v.severity && (
                        <span style={{ padding: "3px 10px", borderRadius: "var(--radius-lg)", fontSize: 12, fontWeight: 500, background: v.severity === "high" ? "#fee2e2" : "#fef9c3", color: v.severity === "high" ? "#991b1b" : "#854d0e" }}>
                          {v.severity}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{v.description || v.message || "Violation recorded"}</p>
                    {v.details && <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 4 }}>{JSON.stringify(v.details)}</p>}
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    <Clock size={14} />
                    {new Date(v.createdAt || v.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-light)" }}>
          <FileWarning size={48} style={{ margin: "0 auto 12px" }} />
          <p>No violations recorded</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Keep driving safely!</p>
        </div>
      )}
    </div>
  );
};

export default DriverViolations;
