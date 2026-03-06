import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  Bus, MapPin, Wrench, AlertTriangle, RefreshCw, TrendingUp,
  LayoutDashboard, User, Clock,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo(position, map.getZoom()); }, [position, map]);
  return null;
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
];

const tabStyle = (active) => ({
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  color: active ? "#0284c7" : "#64748b",
  borderBottom: active ? "2px solid #0284c7" : "2px solid transparent",
  background: "none",
  border: "none",
  borderBottomWidth: 2,
  borderBottomStyle: "solid",
  borderBottomColor: active ? "#0284c7" : "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const inputStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%",
};
const selectStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%",
};
const thStyle = { padding: 12, fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 };
const tdStyle = { padding: 12, fontSize: 14 };

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
const OverviewTab = ({ user }) => {
  const [myBus, setMyBus] = useState(null);
  const [violations, setViolations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [driverInfo, setDriverInfo] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user?.assignedBus?._id) return;
    setLoading(true);
    try {
      const busId = user.assignedBus._id;
      const statusRes = await api.get(`/bus/${busId}/status`);
      const busData = { ...statusRes.data.bus, currentStatus: statusRes.data.currentStatus };
      setMyBus(busData);

      // Get assignment details with driver info
      try {
        const assignRes = await api.get(`/assignments/${busId}`);
        if (assignRes.data.assignedDriver) {
          setDriverInfo(assignRes.data.assignedDriver);
        }
      } catch (e) { console.error("Assignment fetch error:", e); }

      if (busData.currentStatus?.gps) {
        const { lat, lon } = busData.currentStatus.gps;
        try {
          const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const addr = geoRes.data.address;
          setLocationName(addr.city || addr.town || addr.village || addr.suburb || "Unknown");
        } catch (e) { console.error("Geocoding failed", e); }
      }

      const violationRes = await api.get(`/bus/${busId}/violations?limit=5`);
      setViolations(violationRes.data.violations);

      const logsRes = await api.get(`/bus/${busId}/logs?limit=20`);
      const chartData = logsRes.data.logs.reverse().map(log => ({
        time: new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        occupancy: log.currentOccupancy,
        speed: log.speed,
      }));
      setLogs(chartData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const busLocation = myBus?.currentStatus?.gps
    ? [myBus.currentStatus.gps.lat, myBus.currentStatus.gps.lon]
    : [6.9271, 79.8612];
  const hasLocationData = !!myBus?.currentStatus?.gps;

  if (!user?.assignedBus) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Bus style={{ height: 48, width: 48, margin: "0 auto 16px", color: "#94a3b8" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#334155" }}>No Bus Assigned</h2>
        <p style={{ color: "#64748b" }}>Please contact the authority to assign a bus to your account.</p>
      </div>
    );
  }

  if (loading && !myBus) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#64748b" }}>Real-time overview of your assigned bus.</p>
        <Button variant="outline" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 6, color: "#2563eb", borderColor: "#bfdbfe", background: "#eff6ff" }}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Main Bus Card */}
      <Card style={{ background: "#0f172a", color: "#fff" }}>
        <CardContent style={{ padding: 32, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 24 }}>
              <Bus style={{ height: 48, width: 48, color: "#fff" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 12 }}>
                {myBus?.licensePlate || user.assignedBus.licensePlate}
                {locationName && (
                  <span style={{ fontSize: 18, fontWeight: 400, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={16} /> {locationName}
                  </span>
                )}
              </h2>
              <p style={{ color: "#94a3b8", fontSize: 18 }}>Route {myBus?.routeId || user.assignedBus.routeId}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
              <p style={{ fontSize: 14, color: "#94a3b8" }}>Speed</p>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{myBus?.currentStatus?.speed || 0} km/h</p>
            </div>
            <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
              <p style={{ fontSize: 14, color: "#94a3b8" }}>Passengers</p>
              <p style={{ fontSize: 20, fontWeight: 700 }}>
                {myBus?.currentStatus?.currentOccupancy || 0} <span style={{ fontSize: 14, color: "#94a3b8" }}>/ {myBus?.capacity || 55}</span>
              </p>
            </div>
            <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
              <p style={{ fontSize: 14, color: "#94a3b8" }}>Status</p>
              <Badge variant={myBus?.currentStatus ? "success" : "secondary"}>
                {myBus?.currentStatus ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Assigned Driver Details */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={20} color="#2563eb" /> Assigned Driver
            </h3>
            {driverInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Name</span>
                  <span style={{ fontWeight: 600 }}>{driverInfo.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>License</span>
                  <span>{driverInfo.licenseNumber}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Contact</span>
                  <span>{driverInfo.contactNumber || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Status</span>
                  <Badge variant={driverInfo.status === "active" ? "success" : "secondary"}>{driverInfo.status}</Badge>
                </div>
              </div>
            ) : (
              <p style={{ color: "#94a3b8" }}>No driver assigned to this bus.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={20} color="#f59e42" /> Recent Alerts
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {violations.length === 0 ? (
                <div style={{ padding: 12, background: "#f0fdf4", color: "#15803d", borderRadius: 8, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ height: 8, width: 8, borderRadius: 9999, background: "#22c55e" }} />
                  No active violations or alerts.
                </div>
              ) : violations.map(v => (
                <div key={v._id} style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 14 }}>{v.violationType}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(v.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#64748b" }}>Speed: {v.speed || 0} km/h</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px" }}>
          <h3 style={{ fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={20} color="#2563eb" /> Live Location
          </h3>
        </div>
        <div style={{ height: 350 }}>
          <MapContainer center={busLocation} zoom={15} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" maxZoom={20} subdomains={["mt0", "mt1", "mt2", "mt3"]} />
            {hasLocationData && <Marker position={busLocation} />}
            <RecenterMap position={busLocation} />
          </MapContainer>
        </div>
        <div style={{ padding: 12, background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#64748b" }}>Updated: {lastUpdated.toLocaleTimeString()}</span>
          <Badge variant="success">Signal: Strong</Badge>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE TAB
// ═══════════════════════════════════════════════════════════════
const MaintenanceTab = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ issue: "", description: "", priority: "medium" });
  const [message, setMessage] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/maintenance/my");
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.assignedBus?._id) {
      alert("No bus assigned to your account.");
      return;
    }
    try {
      await api.post("/maintenance", {
        busId: user.assignedBus._id,
        issue: form.issue,
        description: form.description,
        priority: form.priority,
      });
      setForm({ issue: "", description: "", priority: "medium" });
      setIsAdding(false);
      setMessage("Maintenance request submitted");
      setTimeout(() => setMessage(""), 3000);
      fetchLogs();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const statusColor = (s) => s === "resolved" ? "success" : s === "in-progress" ? "warning" : "secondary";
  const priorityColor = (p) => p === "critical" ? "#ef4444" : p === "high" ? "#f59e0b" : p === "medium" ? "#3b82f6" : "#94a3b8";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#64748b" }}>Request maintenance and track status.</p>
        <Button onClick={() => setIsAdding(!isAdding)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Wrench size={16} /> {isAdding ? "Cancel" : "Request Maintenance"}
        </Button>
      </div>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8 }}>{message}</div>}

      {isAdding && (
        <Card style={{ border: "1px solid #bae6fd", background: "#f0f9ff" }}>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Issue *</label>
                <input style={inputStyle} value={form.issue} onChange={e => setForm(p => ({ ...p, issue: e.target.value }))} placeholder="e.g. Engine overheating" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Additional details..." />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Priority</label>
                <select style={selectStyle} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <Button type="submit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32 }}>Loading history...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No maintenance requests yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Bus</th>
                    <th style={thStyle}>Issue</th>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{new Date(log.createdAt).toLocaleDateString()}</td>
                      <td style={tdStyle}>{log.busId?.licensePlate || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{log.issue}</td>
                      <td style={tdStyle}>
                        <span style={{ color: priorityColor(log.priority), fontWeight: 600, fontSize: 13 }}>{log.priority}</span>
                      </td>
                      <td style={tdStyle}>
                        <Badge variant={statusColor(log.status)}>{log.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN CONDUCTOR PANEL
// ═══════════════════════════════════════════════════════════════
const ConductorPanel = () => {
  const { user } = useAuth();
  const location = useLocation();
  const activeTab = location.pathname === "/conductor/maintenance" ? "maintenance" : "overview";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>Conductor Panel</h1>

      <div>
        {activeTab === "overview" ? <OverviewTab user={user} /> : <MaintenanceTab user={user} />}
      </div>
    </div>
  );
};

export default ConductorPanel;
