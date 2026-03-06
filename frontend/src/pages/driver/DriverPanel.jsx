import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  Bus, MapPin, Wrench, AlertTriangle, RefreshCw,
  LayoutDashboard, User, Clock, Timer, Siren, FileWarning, Eye,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

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
  { key: "alerts", label: "Alert Log", icon: FileWarning },
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

const cardBoxStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const inputStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%",
};
const selectStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%",
};
const thStyle = { padding: 12, fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 };
const tdStyle = { padding: 12, fontSize: 14 };

const formatMinutes = (min) => {
  if (!min) return "0h 0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
const OverviewTab = ({ user }) => {
  const [busInfo, setBusInfo] = useState(null);
  const [busStatus, setBusStatus] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [violations, setViolations] = useState([]);
  const [conductorInfo, setConductorInfo] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await api.get("/auth/profile");
      const profile = profileRes.data;

      if (profile.assignedBus) {
        const busId = profile.assignedBus._id || profile.assignedBus;
        try {
          const [assignRes, statusRes] = await Promise.all([
            api.get(`/assignments/${busId}`),
            api.get(`/bus/${busId}/status`).catch(() => null),
          ]);
          setBusInfo(assignRes.data);
          if (assignRes.data.assignedConductor) {
            setConductorInfo(assignRes.data.assignedConductor);
          }
          if (statusRes?.data) {
            setBusStatus(statusRes.data.currentStatus);
            if (statusRes.data.currentStatus?.gps) {
              const { lat, lon } = statusRes.data.currentStatus.gps;
              try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const addr = geoRes.data.address;
                setLocationName(addr.city || addr.town || addr.village || addr.suburb || "Unknown");
              } catch (e) { /* */ }
            }
          }

          // Fetch violations
          const violRes = await api.get(`/bus/${busId}/violations?limit=5`).catch(() => ({ data: { violations: [] } }));
          setViolations(violRes.data.violations || []);
        } catch (err) {
          console.error("Bus info fetch error:", err);
        }
      }

      if (profile.driverProfile) {
        try {
          const [attendRes, coolRes] = await Promise.all([
            api.get(`/attendance/today/${profile.driverProfile}`),
            api.get(`/attendance/cooldown/${profile.driverProfile}`),
          ]);
          setAttendance(attendRes.data);
          setCooldown(coolRes.data);
        } catch (err) {
          console.error("Attendance fetch error:", err);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const busLocation = busStatus?.gps
    ? [busStatus.gps.lat, busStatus.gps.lon]
    : [6.9271, 79.8612];
  const hasLocation = !!busStatus?.gps;

  if (loading && !busInfo) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="outline" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 6, color: "#2563eb", borderColor: "#bfdbfe", background: "#eff6ff" }}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={{ ...cardBoxStyle, borderLeft: "4px solid #0284c7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Today's Driving</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{formatMinutes(attendance?.totalDrivingMinutes)}</p>
            </div>
            <Clock size={32} color="#0284c7" />
          </div>
        </div>

        <div style={{ ...cardBoxStyle, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Continuous Driving</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{formatMinutes(attendance?.continuousDrivingMinutes)}</p>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Max: 5h before cooldown</p>
            </div>
            <Timer size={32} color="#f59e0b" />
          </div>
          <div style={{ marginTop: 12, background: "#f1f5f9", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, ((attendance?.continuousDrivingMinutes || 0) / 300) * 100)}%`,
              height: "100%",
              background: (attendance?.continuousDrivingMinutes || 0) >= 240 ? "#ef4444" : "#f59e0b",
              borderRadius: 4,
            }} />
          </div>
        </div>

        <div style={{ ...cardBoxStyle, borderLeft: cooldown?.inCooldown ? "4px solid #ef4444" : "4px solid #22c55e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Status</p>
              {cooldown?.inCooldown ? (
                <>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>COOLDOWN</p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>{cooldown.remainingMinutes} min remaining</p>
                </>
              ) : (
                <p style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>ACTIVE</p>
              )}
            </div>
            <AlertTriangle size={32} color={cooldown?.inCooldown ? "#ef4444" : "#22c55e"} />
          </div>
        </div>

        <div style={{ ...cardBoxStyle, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Face Check-ins</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{attendance?.checkIns?.length || 0}</p>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Verified every 5 min</p>
            </div>
            <Siren size={32} color="#8b5cf6" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Assigned Bus */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Bus size={20} color="#2563eb" /> Assigned Bus
            </h3>
            {busInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>License Plate</span>
                  <span style={{ fontWeight: 600 }}>{busInfo.licensePlate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Route</span>
                  <span>{busInfo.routeId}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Status</span>
                  <Badge variant={busInfo.status === "active" ? "success" : "secondary"}>{busInfo.status || "active"}</Badge>
                </div>
              </div>
            ) : (
              <p style={{ color: "#94a3b8" }}>No bus assigned. Contact admin.</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Conductor */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={20} color="#2563eb" /> Assigned Conductor
            </h3>
            {conductorInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Name</span>
                  <span style={{ fontWeight: 600 }}>{conductorInfo.fullName || conductorInfo.username}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Contact</span>
                  <span>{conductorInfo.contactNumber || "—"}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: "#94a3b8" }}>No conductor assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardContent style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={20} color="#f59e42" /> Recent Alerts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {violations.length === 0 ? (
              <div style={{ padding: 12, background: "#f0fdf4", color: "#15803d", borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
                No active violations or alerts.
              </div>
            ) : violations.map(v => (
              <div key={v._id} style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 14 }}>{v.violationType}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 13, color: "#64748b" }}>Speed: {v.speed || 0} km/h</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px" }}>
          <h3 style={{ fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={20} color="#2563eb" /> Bus Live Location
            {locationName && <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b" }}>— {locationName}</span>}
          </h3>
        </div>
        <div style={{ height: 300 }}>
          <MapContainer center={busLocation} zoom={15} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" maxZoom={20} subdomains={["mt0", "mt1", "mt2", "mt3"]} />
            {hasLocation && <Marker position={busLocation} />}
            <RecenterMap position={busLocation} />
          </MapContainer>
        </div>
        <div style={{ padding: 12, background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#64748b" }}>Updated: {lastUpdated.toLocaleTimeString()}</span>
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
    const profile = await api.get("/auth/profile");
    const busId = profile.data.assignedBus?._id || profile.data.assignedBus;
    if (!busId) {
      alert("No bus assigned to your account.");
      return;
    }
    try {
      await api.post("/maintenance", {
        busId,
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
                <input style={inputStyle} value={form.issue} onChange={e => setForm(p => ({ ...p, issue: e.target.value }))} placeholder="e.g. Brake issue" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
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
            <div style={{ textAlign: "center", padding: 32 }}>Loading...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No maintenance requests.</div>
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
                      <td style={tdStyle}><span style={{ color: priorityColor(log.priority), fontWeight: 600 }}>{log.priority}</span></td>
                      <td style={tdStyle}><Badge variant={statusColor(log.status)}>{log.status}</Badge></td>
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
// ALERT LOG TAB
// ═══════════════════════════════════════════════════════════════
const AlertLogTab = ({ user }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await api.get("/auth/profile");
      const busId = profile.data.assignedBus?._id || profile.data.assignedBus;
      if (busId) {
        const res = await api.get(`/bus/${busId}/violations?limit=100`);
        setViolations(res.data.violations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  const getViolationIcon = (type) => {
    switch (type) {
      case "drowsiness": return { icon: "😴", label: "Drowsiness Detection", color: "#f59e0b" };
      case "sleepiness": return { icon: "💤", label: "Sleepiness Alert", color: "#ef4444" };
      case "mobile_phone": return { icon: "📱", label: "Mobile Phone Usage", color: "#dc2626" };
      case "footboard": return { icon: "🚪", label: "Footboard Violation", color: "#ef4444" };
      case "overcrowding": return { icon: "👥", label: "Overcrowding", color: "#f97316" };
      default: return { icon: "⚠️", label: type, color: "#64748b" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#64748b" }}>Violations including drowsiness, sleepiness, mobile phone usage while driving.</p>
        <button onClick={fetchViolations} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>Loading alert log...</div>
      ) : violations.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#166534" }}>No Violations</h3>
            <p style={{ color: "#64748b" }}>Great driving! No violations recorded.</p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {violations.map(v => {
            const info = getViolationIcon(v.violationType);
            return (
              <Card key={v._id} style={{
                borderLeft: `4px solid ${info.color}`,
              }}>
                <CardContent style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 28 }}>{info.icon}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, color: info.color }}>{info.label}</p>
                      <p style={{ fontSize: 13, color: "#64748b" }}>
                        Speed: {v.speed || 0} km/h
                        {v.gps && ` | GPS: ${v.gps.lat?.toFixed(4)}, ${v.gps.lon?.toFixed(4)}`}
                        {v.occupancyAtViolation && ` | Occupancy: ${v.occupancyAtViolation}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, color: "#64748b" }}>{new Date(v.createdAt).toLocaleDateString()}</p>
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(v.createdAt).toLocaleTimeString()}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN DRIVER PANEL
// ═══════════════════════════════════════════════════════════════
const DriverPanel = () => {
  const { user } = useAuth();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === "/driver/maintenance") return "maintenance";
    if (location.pathname === "/driver/alerts") return "alerts";
    return "overview";
  };

  const activeTab = getActiveTab();

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab user={user} />;
      case "maintenance": return <MaintenanceTab user={user} />;
      case "alerts": return <AlertLogTab user={user} />;
      default: return <OverviewTab user={user} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>Driver Panel</h1>

      <div>{renderTab()}</div>
    </div>
  );
};

export default DriverPanel;
