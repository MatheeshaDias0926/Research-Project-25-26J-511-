import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { AlertOctagon, RefreshCw } from "lucide-react";
import Button from "../../components/ui/Button";

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getSeverityBadge = (type) => {
  const severities = {
    sleepiness: "critical",
    drowsiness: "high",
    mobile_phone: "high",
    yawning: "medium",
    no_face: "medium",
    driving_limit: "medium",
    footboard: "high",
    overcrowding: "high",
    "traffic_light": "critical",
    "double_line": "critical",
  };
  const sev = severities[type] || "medium";
  return (
    <Badge
      variant={
        sev === "critical"
          ? "danger"
          : sev === "high"
          ? "warning"
          : "default"
      }
    >
      {type ? type.replace(/_/g, " ").toUpperCase() : "UNKNOWN"}
    </Badge>
  );
};

const ViolationsTab = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");

  const violationCategories = [
    { value: "all", label: "All Violations" },
    { value: "sleepiness", label: "Sleepiness" },
    { value: "drowsiness", label: "Drowsiness" },
    { value: "yawning", label: "Yawning" },
    { value: "mobile_phone", label: "Mobile Phone" },
    { value: "driving_limit", label: "Driving Limit" },
    { value: "no_face", label: "No Face Detected" },
    { value: "footboard", label: "Footboard Riding" },
    { value: "overcrowding", label: "Overcrowding" },
    { value: "traffic_light", label: "Traffic Light" },
    { value: "double_line", label: "Double Line" },
  ];

  const fetchViolations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/bus/analytics/all-violations?limit=200");
      setViolations(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch violations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const filteredViolations = filterCategory === "all" 
    ? violations 
    : violations.filter(v => v.violationType === filterCategory);

  return (
    <div className="space-y-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>Driver & Fleet Violations</h2>
          <p style={{ color: "var(--text-muted)" }}>Recent safety incidents and compliance issues</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ 
              padding: "8px 12px", 
              borderRadius: "var(--radius-md)", 
              border: "1px solid var(--border-light)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              outline: "none"
            }}
          >
            {violationCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <Button onClick={fetchViolations} disabled={loading} variant="outline" className="gap-2">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: "var(--color-danger-50)", color: "var(--color-danger-600)", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="text-red-500" size={20} />
            Violation Log (Last 200 items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>Time</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>Driver</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>Bus</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>Violation Type</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>Speed</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.875rem" }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map((v) => (
                  <tr key={v._id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {formatDateTime(v.timestamp || v.createdAt)}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {v.driverRef?.name || "Unknown"}
                      {v.driverRef?.licenseNumber && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{v.driverRef.licenseNumber}</div>}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {v.busId?.licensePlate || "N/A"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {getSeverityBadge(v.violationType)}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {v.speed ? v.speed + " km/h" : "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.875rem" }}>
                      {v.gps?.lat && v.gps?.lon ? `${v.gps.lat.toFixed(4)}, ${v.gps.lon.toFixed(4)}` : "Unknown"}
                    </td>
                  </tr>
                ))}
                {filteredViolations.length === 0 && !loading && !error && (
                  <tr>
                    <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                      {violations.length > 0 ? "No violations match the selected filter." : "No violations found."}
                    </td>
                  </tr>
                )}
                {loading && violations.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                      Loading violations...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViolationsTab;