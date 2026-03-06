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
  Shield, Activity,
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
  const [piSession, setPiSession] = useState(null);
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

      // Fetch Pi verification session data
      try {
        const sessionRes = await api.get("/edge-devices/driver-sessions");
        setPiSession(sessionRes.data);
      } catch (err) {
        console.error("Pi session fetch error:", err);
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

      {/* Pi Verification & Session Info */}
      {piSession && (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={20} color="#2563eb" /> Face Verification Status
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
              <div style={{ ...cardBoxStyle, borderLeft: "4px solid #0284c7", padding: 16 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Verified Driving</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{formatMinutes(piSession.todayDrivingMinutes)}</p>
              </div>
              <div style={{ ...cardBoxStyle, borderLeft: "4px solid #22c55e", padding: 16 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Resting Time</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{formatMinutes(piSession.todayRestingMinutes)}</p>
              </div>
              <div style={{ ...cardBoxStyle, borderLeft: "4px solid #8b5cf6", padding: 16 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Sessions Today</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{piSession.todaySessionCount || 0}</p>
              </div>
              <div style={{ ...cardBoxStyle, borderLeft: piSession.todayDrowsinessEvents > 0 ? "4px solid #ef4444" : "4px solid #94a3b8", padding: 16 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Drowsiness Alerts</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: piSession.todayDrowsinessEvents > 0 ? "#ef4444" : "inherit" }}>
                  {piSession.todayDrowsinessEvents || 0}
                </p>
              </div>
            </div>

            {/* Current Session */}
            {piSession.currentSession ? (
              <div style={{ background: piSession.currentSession.verified ? "#f0fdf4" : "#fffbeb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={16} color="#22c55e" /> Active Session
                  </span>
                  <Badge variant={piSession.currentSession.verified ? "success" : "error"}>
                    {piSession.currentSession.verified ? "Face Verified" : "Unverified"}
                  </Badge>
                </div>
                {piSession.currentSession.confidence != null && (
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Confidence: <strong>{(piSession.currentSession.confidence * 100).toFixed(0)}%</strong>
                    {piSession.currentSession.local ? " (On-device)" : " (Remote)"}
                  </p>
                )}
                {piSession.currentSession.alertnessLevel && (
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    Alertness: <Badge variant={piSession.currentSession.alertnessLevel === "ALERT" ? "success" : piSession.currentSession.alertnessLevel === "TIRED" ? "warning" : "error"}>
                      {piSession.currentSession.alertnessLevel} {piSession.currentSession.alertnessScore != null ? `(${piSession.currentSession.alertnessScore})` : ""}
                    </Badge>
                  </p>
                )}
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                  Since: {new Date(piSession.currentSession.sessionStart).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                No active Pi verification session
              </div>
            )}

            {/* Today's Sessions List */}
            {piSession.todaySessions?.length > 0 && (
              <div>
                <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "#64748b" }}>Today's Sessions</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {piSession.todaySessions.map(s => (
                    <div key={s._id} style={{
                      padding: 12, borderRadius: 8, background: "#f8fafc",
                      borderLeft: `3px solid ${s.verified ? "#22c55e" : "#f59e0b"}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {new Date(s.sessionStart).toLocaleTimeString()}
                          {s.sessionEnd && ` — ${new Date(s.sessionEnd).toLocaleTimeString()}`}
                        </span>
                        {s.confidence != null && (
                          <span style={{ fontSize: 12, color: "#64748b", marginLeft: 12 }}>
                            {(s.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {s.drowsinessEvents?.length > 0 && (
                          <span style={{ fontSize: 12, color: "#ef4444" }}>{s.drowsinessEvents.length} alerts</span>
                        )}
                        <Badge variant={s.verified ? "success" : "error"} style={{ fontSize: 11 }}>
                          {s.verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
  const [drowsinessEvents, setDrowsinessEvents] = useState([]);
  const [alertFilter, setAlertFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await api.get("/auth/profile");
      const busId = profile.data.assignedBus?._id || profile.data.assignedBus;

      const promises = [];
      if (busId) {
        promises.push(api.get(`/bus/${busId}/violations?limit=100`).catch(() => ({ data: { violations: [] } })));
      } else {
        promises.push(Promise.resolve({ data: { violations: [] } }));
      }
      promises.push(api.get("/edge-devices/drowsiness-log").catch(() => ({ data: [] })));

      const [violRes, drowsyRes] = await Promise.all(promises);
      setViolations(violRes.data.violations || []);
      setDrowsinessEvents(drowsyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getViolationIcon = (type) => {
    switch (type) {
      case "drowsiness": return { icon: "😴", label: "Drowsiness Detection", color: "#f59e0b" };
      case "yawning": return { icon: "🥱", label: "Yawning Detection", color: "#f97316" };
      case "sleepiness": return { icon: "💤", label: "Sleepiness Alert", color: "#ef4444" };
      case "no_face": return { icon: "👤", label: "Driver Not Visible", color: "#94a3b8" };
      case "mobile_phone": return { icon: "📱", label: "Mobile Phone Usage", color: "#dc2626" };
      case "footboard": return { icon: "🚪", label: "Footboard Violation", color: "#ef4444" };
      case "overcrowding": return { icon: "👥", label: "Overcrowding", color: "#f97316" };
      default: return { icon: "⚠️", label: type, color: "#64748b" };
    }
  };

  // Merge violations + drowsiness events into a unified timeline
  const allAlerts = [
    ...violations.map(v => ({
      _id: v._id,
      type: v.violationType,
      timestamp: v.createdAt,
      source: "violation",
      speed: v.speed,
      gps: v.gps,
      occupancy: v.occupancyAtViolation,
    })),
    ...drowsinessEvents.map(e => ({
      _id: e._id,
      type: e.type,
      timestamp: e.timestamp,
      source: "pi",
      ear: e.ear,
      mar: e.mar,
      alertnessScore: e.alertnessScore,
      deviceId: e.deviceId,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredAlerts = alertFilter === "all" ? allAlerts
    : alertFilter === "pi" ? allAlerts.filter(a => a.source === "pi")
    : allAlerts.filter(a => a.source === "violation");

  const piCount = allAlerts.filter(a => a.source === "pi").length;
  const violCount = allAlerts.filter(a => a.source === "violation").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#64748b" }}>Violations, drowsiness, and yawning events from Pi monitoring.</p>
        <button onClick={fetchData} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {[
          { key: "all", label: `All (${allAlerts.length})` },
          { key: "pi", label: `Pi Alerts (${piCount})` },
          { key: "violation", label: `Violations (${violCount})` },
        ].map(t => (
          <button key={t.key} onClick={() => setAlertFilter(t.key)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: alertFilter === t.key ? 600 : 400,
            color: alertFilter === t.key ? "#0284c7" : "#64748b",
            borderBottom: alertFilter === t.key ? "2px solid #0284c7" : "2px solid transparent",
            background: "none", border: "none", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>Loading alert log...</div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#166534" }}>No Alerts</h3>
            <p style={{ color: "#64748b" }}>Great driving! No alerts recorded.</p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAlerts.map(a => {
            const info = getViolationIcon(a.type);
            return (
              <Card key={a._id} style={{ borderLeft: `4px solid ${info.color}` }}>
                <CardContent style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 28 }}>{info.icon}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <p style={{ fontWeight: 600, fontSize: 15, color: info.color }}>{info.label}</p>
                        <Badge variant={a.source === "pi" ? "secondary" : "warning"} style={{ fontSize: 10 }}>
                          {a.source === "pi" ? "Pi Device" : "System"}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 13, color: "#64748b" }}>
                        {a.source === "pi" ? (
                          <>
                            {a.ear != null && `EAR: ${a.ear.toFixed(3)}`}
                            {a.mar != null && ` | MAR: ${a.mar.toFixed(3)}`}
                            {a.alertnessScore != null && ` | Alertness: ${a.alertnessScore}`}
                          </>
                        ) : (
                          <>
                            Speed: {a.speed || 0} km/h
                            {a.gps && a.gps.lat ? ` | GPS: ${a.gps.lat.toFixed(4)}, ${a.gps.lon.toFixed(4)}` : ""}
                            {a.occupancy ? ` | Occupancy: ${a.occupancy}` : ""}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, color: "#64748b" }}>{new Date(a.timestamp).toLocaleDateString()}</p>
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(a.timestamp).toLocaleTimeString()}</p>
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
