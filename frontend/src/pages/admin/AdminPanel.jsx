import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import {
  Bus, AlertTriangle, CheckCircle, Wrench, UserPlus, Users, Cpu,
  Plus, RefreshCw, Link2, ArrowRight, Edit, Trash2, Eye, Siren,
  LayoutDashboard, Shield, User, X, Camera, Scan, Upload, XCircle, VideoOff,
  Settings, Wifi, WifiOff, Play,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";

// ─── Tab Navigation ────────────────────────────────────────
const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "fleet", label: "Fleet Management", icon: Bus },
  { key: "assignments", label: "Bus Assignments", icon: Link2 },
  { key: "employees", label: "Employee Management", icon: Users },
  { key: "edge-devices", label: "Edge Device Management", icon: Cpu },
  { key: "sos", label: "SOS Alerts", icon: Siren },
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
  transition: "all 0.2s",
  whiteSpace: "nowrap",
});

const sectionTitle = { fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 16 };
const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const thStyle = { padding: 12, fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 600 };
const tdStyle = { padding: 12, fontSize: 14 };
const selectStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", minWidth: 180,
};
const inputStyle = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%",
};

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState({ violations: [], trends: [], occupancy: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, busesRes, driversRes, violRes, trendsRes, occRes] = await Promise.all([
          api.get("/auth/stats"),
          api.get("/bus"),
          api.get("/driver"),
          api.get("/bus/analytics/violations").catch(() => ({ data: [] })),
          api.get("/bus/analytics/trends").catch(() => ({ data: [] })),
          api.get("/bus/analytics/occupancy").catch(() => ({ data: [] })),
        ]);
        const s = statsRes.data;
        setStats({
          registeredBuses: s.buses || 0,
          activeBuses: busesRes.data.filter(b => b.status === "active").length,
          registeredDrivers: s.driverProfiles || driversRes.data.length,
          registeredConductors: s.conductors || 0,
          activeDrivers: driversRes.data.filter(d => d.status === "active").length,
          activeConductors: s.conductors || 0,
          violations24h: s.totalViolations || 0,
          registeredEdgeDevices: s.edgeDevices || 0,
          activeEdgeDevices: s.activeEdgeDevices || 0,
          maintenanceCount: s.pendingMaintenance || 0,
        });
        setAnalytics({
          violations: violRes.data || [],
          trends: trendsRes.data || [],
          occupancy: occRes.data || [],
        });
      } catch (err) {
        console.error("Failed to fetch overview data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 32 }}>Loading overview...</div>;
  if (!stats) return <div style={{ padding: 32, color: "#ef4444" }}>Failed to load stats.</div>;

  const statCards = [
    { label: "Registered Buses", value: stats.registeredBuses, icon: Bus, bg: "#dbeafe", color: "#2563eb" },
    { label: "Active Buses", value: stats.activeBuses, icon: Bus, bg: "#dcfce7", color: "#16a34a" },
    { label: "Registered Drivers", value: stats.registeredDrivers, icon: UserPlus, bg: "#fef3c7", color: "#d97706" },
    { label: "Registered Conductors", value: stats.registeredConductors, icon: Users, bg: "#e0e7ff", color: "#4f46e5" },
    { label: "Active Drivers", value: stats.activeDrivers, icon: UserPlus, bg: "#d1fae5", color: "#059669" },
    { label: "Active Conductors", value: stats.activeConductors, icon: Users, bg: "#ddd6fe", color: "#7c3aed" },
    { label: "Violations (24h)", value: stats.violations24h, icon: AlertTriangle, bg: "#fee2e2", color: "#dc2626" },
    { label: "Registered Edge Devices", value: stats.registeredEdgeDevices, icon: Cpu, bg: "#f0f9ff", color: "#0284c7" },
    { label: "Active Edge Devices", value: stats.activeEdgeDevices, icon: Cpu, bg: "#ccfbf1", color: "#0d9488" },
    { label: "Maintenance Pending", value: stats.maintenanceCount, icon: Wrench, bg: "#ffedd5", color: "#ea580c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
              <CardContent style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>{s.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{s.value}</p>
                </div>
                <div style={{ padding: 10, background: s.bg, borderRadius: 9999, color: s.color }}>
                  <Icon style={{ height: 20, width: 20 }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Violation Analytics */}
      <h2 style={sectionTitle}>Violation Analytics (Top Offenders)</h2>
      <Card>
        <CardContent style={{ padding: 24, height: 350 }}>
          {analytics.violations.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.violations} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="licensePlate" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" }} />
                <Legend />
                <Bar dataKey="footboard" name="Footboard" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                <Bar dataKey="overcrowding" name="Overcrowding" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
              No violation data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trends + Fleet Capacity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card>
          <CardHeader><CardTitle>Safety Trends (Last 7 Days)</CardTitle></CardHeader>
          <CardContent style={{ padding: 24, height: 350 }}>
            {analytics.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" }} />
                  <Legend />
                  <Area type="monotone" dataKey="footboard" stackId="1" stroke="#ef4444" fill="#fee2e2" name="Footboard" />
                  <Area type="monotone" dataKey="overcrowding" stackId="1" stroke="#f97316" fill="#ffedd5" name="Overcrowding" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>No trend data.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Real-time Fleet Capacity (Per Bus)</CardTitle></CardHeader>
          <CardContent style={{ padding: 24, height: 350 }}>
            {analytics.occupancy.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="category" dataKey="routeId" name="Route" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis type="number" dataKey="occupancyPct" name="Occupancy" unit="%" stroke="#64748b" domain={[0, "auto"]} />
                  <ZAxis type="number" range={[100, 300]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" }}>
                            <p style={{ fontWeight: 600 }}>{d.licensePlate}</p>
                            <p style={{ color: "#64748b", fontSize: 13 }}>Route: {d.routeId}</p>
                            <p style={{ color: d.occupancyPct > 100 ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                              {d.occupancyPct}% ({d.currentLoad}/{d.capacity})
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter name="Buses" data={analytics.occupancy} fill="#3b82f6">
                    {analytics.occupancy.map((entry, i) => (
                      <Cell key={i} fill={entry.occupancyPct > 120 ? "#ef4444" : entry.occupancyPct > 100 ? "#f59e0b" : entry.occupancyPct === 0 ? "#10b981" : "#3b82f6"} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>No active buses.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FLEET MANAGEMENT TAB
// ═══════════════════════════════════════════════════════════════
const FleetTab = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [form, setForm] = useState({ licensePlate: "", routeId: "", capacity: "" });

  const fetchBuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/bus");
      setBuses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { licensePlate: form.licensePlate, routeId: form.routeId, capacity: parseInt(form.capacity) };
      if (editingBus) {
        await api.put(`/bus/${editingBus._id}`, payload);
      } else {
        await api.post("/bus", payload);
      }
      setForm({ licensePlate: "", routeId: "", capacity: "" });
      setIsAdding(false);
      setEditingBus(null);
      fetchBuses();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const startEdit = (bus) => {
    setEditingBus(bus);
    setForm({ licensePlate: bus.licensePlate, routeId: bus.routeId, capacity: String(bus.capacity) });
    setIsAdding(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={sectionTitle}>Fleet Management</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => { setIsAdding(!isAdding); setEditingBus(null); setForm({ licensePlate: "", routeId: "", capacity: "" }); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> {isAdding ? "Cancel" : "Register New Bus"}
          </Button>
          <button onClick={fetchBuses} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {isAdding && (
        <Card style={{ border: "1px solid #bae6fd", background: "#f0f9ff" }}>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#334155", display: "block", marginBottom: 4 }}>License Plate</label>
                <input style={inputStyle} value={form.licensePlate} onChange={e => setForm(p => ({ ...p, licensePlate: e.target.value }))} placeholder="NP-XXXX" required />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#334155", display: "block", marginBottom: 4 }}>Route ID</label>
                <input style={inputStyle} value={form.routeId} onChange={e => setForm(p => ({ ...p, routeId: e.target.value }))} placeholder="ROUTE-XXX" required />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#334155", display: "block", marginBottom: 4 }}>Capacity</label>
                <input style={inputStyle} type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="50" required />
              </div>
              <Button type="submit">{editingBus ? "Update Bus" : "Create Bus"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32 }}>Loading fleet...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={thStyle}>License Plate</th>
                    <th style={thStyle}>Route</th>
                    <th style={thStyle}>Capacity</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Conductor</th>
                    <th style={thStyle}>Edge Device</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No buses in fleet.</td></tr>
                  ) : buses.map((bus) => (
                    <tr key={bus._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{bus.licensePlate}</td>
                      <td style={tdStyle}>{bus.routeId}</td>
                      <td style={tdStyle}>{bus.capacity}</td>
                      <td style={tdStyle}>
                        <Badge variant={bus.status === "active" ? "success" : bus.status === "maintenance" ? "warning" : "secondary"}>
                          {bus.status || "inactive"}
                        </Badge>
                      </td>
                      <td style={tdStyle}>{bus.assignedDriver?.name || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={tdStyle}>{bus.assignedConductor?.username || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={tdStyle}>{bus.assignedEdgeDevice?.name || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={tdStyle}>
                        <button onClick={() => startEdit(bus)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7", marginRight: 8 }}>
                          <Edit size={16} />
                        </button>
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
// BUS ASSIGNMENTS TAB
// ═══════════════════════════════════════════════════════════════
const AssignmentsTab = () => {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [edgeDevices, setEdgeDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [subTab, setSubTab] = useState("assign-driver");

  const [driverAssign, setDriverAssign] = useState({ busId: "", driverId: "" });
  const [conductorAssign, setConductorAssign] = useState({ busId: "", conductorId: "" });
  const [deviceAssign, setDeviceAssign] = useState({ busId: "", edgeDeviceId: "" });

  const fetchAll = useCallback(async () => {
    try {
      const [busRes, driverRes, conductorRes, deviceRes] = await Promise.all([
        api.get("/assignments"),
        api.get("/driver"),
        api.get("/auth/conductors"),
        api.get("/edge-devices"),
      ]);
      setBuses(busRes.data);
      setDrivers(driverRes.data);
      setConductors(conductorRes.data);
      setEdgeDevices(deviceRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showMsg = (m) => { setMessage(m); setError(""); setTimeout(() => setMessage(""), 3000); };
  const showErr = (m) => { setError(m); setMessage(""); setTimeout(() => setError(""), 3000); };

  const handleAssignDriver = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assignments/driver", driverAssign);
      showMsg("Driver assigned"); setDriverAssign({ busId: "", driverId: "" }); fetchAll();
    } catch (err) { showErr(err.response?.data?.message || "Failed"); }
  };
  const handleAssignConductor = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assignments/conductor", conductorAssign);
      showMsg("Conductor assigned"); setConductorAssign({ busId: "", conductorId: "" }); fetchAll();
    } catch (err) { showErr(err.response?.data?.message || "Failed"); }
  };
  const handleAssignDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assignments/edge-device", deviceAssign);
      showMsg("Edge device assigned"); setDeviceAssign({ busId: "", edgeDeviceId: "" }); fetchAll();
    } catch (err) { showErr(err.response?.data?.message || "Failed"); }
  };
  const handleUnassign = async (busId, type) => {
    if (!confirm(`Unassign ${type} from this bus?`)) return;
    try {
      await api.delete(`/assignments/${busId}/${type}`);
      showMsg(`${type} unassigned`); fetchAll();
    } catch (err) { showErr(err.response?.data?.message || "Failed"); }
  };

  const subTabs = [
    { key: "assign-driver", label: "Assign Driver" },
    { key: "assign-conductor", label: "Assign Conductor" },
    { key: "assign-device", label: "Assign Edge Device" },
    { key: "current", label: "Current Assignments" },
  ];

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={sectionTitle}>Bus Assignments</h2>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8 }}>{message}</div>}
      {error && <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{
            ...tabStyle(subTab === t.key), fontSize: 13, padding: "8px 16px",
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === "assign-driver" && (
        <Card>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleAssignDriver} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Select Bus</label>
                <select style={selectStyle} value={driverAssign.busId} onChange={e => setDriverAssign(p => ({ ...p, busId: e.target.value }))} required>
                  <option value="">-- Select Bus --</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.licensePlate} ({b.routeId})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Select Driver</label>
                <select style={selectStyle} value={driverAssign.driverId} onChange={e => setDriverAssign(p => ({ ...p, driverId: e.target.value }))} required>
                  <option value="">-- Select Driver --</option>
                  {drivers.map(d => <option key={d._id} value={d._id}>{d.name} ({d.licenseNumber})</option>)}
                </select>
              </div>
              <Button type="submit">Assign Driver</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {subTab === "assign-conductor" && (
        <Card>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleAssignConductor} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Select Bus</label>
                <select style={selectStyle} value={conductorAssign.busId} onChange={e => setConductorAssign(p => ({ ...p, busId: e.target.value }))} required>
                  <option value="">-- Select Bus --</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.licensePlate} ({b.routeId})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Select Conductor</label>
                <select style={selectStyle} value={conductorAssign.conductorId} onChange={e => setConductorAssign(p => ({ ...p, conductorId: e.target.value }))} required>
                  <option value="">-- Select Conductor --</option>
                  {conductors.map(c => <option key={c._id} value={c._id}>{c.fullName || c.username}</option>)}
                </select>
              </div>
              <Button type="submit">Assign Conductor</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {subTab === "assign-device" && (
        <Card>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleAssignDevice} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Select Bus</label>
                <select style={selectStyle} value={deviceAssign.busId} onChange={e => setDeviceAssign(p => ({ ...p, busId: e.target.value }))} required>
                  <option value="">-- Select Bus --</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.licensePlate} ({b.routeId})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Select Edge Device</label>
                <select style={selectStyle} value={deviceAssign.edgeDeviceId} onChange={e => setDeviceAssign(p => ({ ...p, edgeDeviceId: e.target.value }))} required>
                  <option value="">-- Select Device --</option>
                  {edgeDevices.map(d => <option key={d._id} value={d._id}>{d.name} ({d.deviceId})</option>)}
                </select>
              </div>
              <Button type="submit">Assign Device</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {subTab === "current" && (
        <Card>
          <CardContent style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={thStyle}>Bus</th>
                    <th style={thStyle}>Route</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Conductor</th>
                    <th style={thStyle}>Edge Device</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.map(bus => (
                    <tr key={bus._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{bus.licensePlate}</td>
                      <td style={tdStyle}>{bus.routeId}</td>
                      <td style={tdStyle}>
                        {bus.assignedDriver ? (
                          <span>{bus.assignedDriver.name} <button onClick={() => handleUnassign(bus._id, "driver")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", marginLeft: 4 }}><X size={14} /></button></span>
                        ) : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        {bus.assignedConductor ? (
                          <span>{bus.assignedConductor.fullName || bus.assignedConductor.username} <button onClick={() => handleUnassign(bus._id, "conductor")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", marginLeft: 4 }}><X size={14} /></button></span>
                        ) : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        {bus.assignedEdgeDevice ? (
                          <span>{bus.assignedEdgeDevice.name} <button onClick={() => handleUnassign(bus._id, "edge-device")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", marginLeft: 4 }}><X size={14} /></button></span>
                        ) : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td style={tdStyle}>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE MANAGEMENT TAB
// ═══════════════════════════════════════════════════════════════
const EmployeeTab = () => {
  const [subTab, setSubTab] = useState("register");
  const [employeeType, setEmployeeType] = useState("driver");
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    username: "", password: "", fullName: "", nic: "", licenceNumber: "", contactNumber: "", profileImage: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [driverRes, conductorRes] = await Promise.all([
        api.get("/auth/drivers"),
        api.get("/auth/conductors"),
      ]);
      setDrivers(driverRes.data);
      setConductors(conductorRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => {
    setForm({ username: "", password: "", fullName: "", nic: "", licenceNumber: "", contactNumber: "", profileImage: "" });
    setEditingUser(null);
  };

  const showMsg = (m) => { setMessage(m); setError(""); setTimeout(() => setMessage(""), 3000); };
  const showErr = (m) => { setError(m); setMessage(""); setTimeout(() => setError(""), 3000); };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/admin/create-user", {
        username: form.username,
        password: form.password,
        role: employeeType,
        fullName: form.fullName,
        nic: form.nic,
        licenceNumber: form.licenceNumber,
        contactNumber: form.contactNumber,
        profileImage: form.profileImage,
      });
      showMsg(`${employeeType} registered successfully`);
      resetForm();
      fetchAll();
    } catch (err) {
      showErr(err.response?.data?.message || "Registration failed");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/auth/users/${editingUser._id}`, {
        fullName: form.fullName,
        nic: form.nic,
        licenceNumber: form.licenceNumber,
        contactNumber: form.contactNumber,
        profileImage: form.profileImage,
      });
      showMsg("Employee updated successfully");
      resetForm();
      setSubTab("view");
      fetchAll();
    } catch (err) {
      showErr(err.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this employee?")) return;
    try {
      await api.delete(`/auth/users/${id}`);
      showMsg("Employee deleted");
      fetchAll();
    } catch (err) {
      showErr(err.response?.data?.message || "Delete failed");
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      fullName: user.fullName || "",
      nic: user.nic || "",
      licenceNumber: user.licenceNumber || "",
      contactNumber: user.contactNumber || "",
      profileImage: user.profileImage || "",
    });
    setSubTab("edit");
  };

  const subTabs = [
    { key: "register", label: "Register New Employee" },
    { key: "view", label: "View Employees" },
  ];
  if (editingUser) subTabs.push({ key: "edit", label: "Edit Employee" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={sectionTitle}>Employee Management</h2>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8 }}>{message}</div>}
      {error && <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); if (t.key === "register") resetForm(); }} style={{
            ...tabStyle(subTab === t.key), fontSize: 13, padding: "8px 16px",
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === "register" && (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, marginRight: 12 }}>Register as:</label>
              <label style={{ marginRight: 16, cursor: "pointer" }}>
                <input type="radio" name="empType" value="driver" checked={employeeType === "driver"} onChange={() => setEmployeeType("driver")} style={{ marginRight: 4 }} />
                Driver
              </label>
              <label style={{ cursor: "pointer" }}>
                <input type="radio" name="empType" value="conductor" checked={employeeType === "conductor"} onChange={() => setEmployeeType("conductor")} style={{ marginRight: 4 }} />
                Conductor
              </label>
            </div>
            <form onSubmit={handleRegister} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Username *</label>
                <input style={inputStyle} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Password *</label>
                <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Full Name *</label>
                <input style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>NIC *</label>
                <input style={inputStyle} value={form.nic} onChange={e => setForm(p => ({ ...p, nic: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Licence Number</label>
                <input style={inputStyle} value={form.licenceNumber} onChange={e => setForm(p => ({ ...p, licenceNumber: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Contact Number *</label>
                <input style={inputStyle} value={form.contactNumber} onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Profile Image URL</label>
                <input style={inputStyle} value={form.profileImage} onChange={e => setForm(p => ({ ...p, profileImage: e.target.value }))} placeholder="https://..." />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <Button type="submit">Register {employeeType}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {subTab === "edit" && editingUser && (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Editing: {editingUser.username} ({editingUser.role})</h3>
              <button onClick={() => { resetForm(); setSubTab("view"); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Full Name</label>
                <input style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>NIC</label>
                <input style={inputStyle} value={form.nic} onChange={e => setForm(p => ({ ...p, nic: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Licence Number</label>
                <input style={inputStyle} value={form.licenceNumber} onChange={e => setForm(p => ({ ...p, licenceNumber: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Contact Number</label>
                <input style={inputStyle} value={form.contactNumber} onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Profile Image URL</label>
                <input style={inputStyle} value={form.profileImage} onChange={e => setForm(p => ({ ...p, profileImage: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <Button type="submit">Update Employee</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {subTab === "view" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Drivers */}
          <Card>
            <CardHeader><CardTitle>Drivers ({drivers.length})</CardTitle></CardHeader>
            <CardContent style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={thStyle}>Photo</th>
                      <th style={thStyle}>Full Name</th>
                      <th style={thStyle}>Username</th>
                      <th style={thStyle}>NIC</th>
                      <th style={thStyle}>Licence</th>
                      <th style={thStyle}>Contact</th>
                      <th style={thStyle}>Assigned Bus</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No drivers registered.</td></tr>
                    ) : drivers.map(d => (
                      <tr key={d._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={tdStyle}>
                          {(d.profileImage || d.driverProfile?.photoUrl) ? (
                            <img src={d.profileImage || d.driverProfile?.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                          ) : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={16} color="#94a3b8" /></div>}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{d.fullName || d.driverProfile?.name || d.username}</td>
                        <td style={tdStyle}>{d.username}</td>
                        <td style={tdStyle}>{d.nic || "—"}</td>
                        <td style={tdStyle}>{d.licenceNumber || d.driverProfile?.licenseNumber || "—"}</td>
                        <td style={tdStyle}>{d.contactNumber || d.driverProfile?.contactNumber || "—"}</td>
                        <td style={tdStyle}>{d.assignedBus?.licensePlate || "—"}</td>
                        <td style={tdStyle}>
                          <button onClick={() => startEdit(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7", marginRight: 8 }}><Edit size={16} /></button>
                          <button onClick={() => handleDelete(d._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Conductors */}
          <Card>
            <CardHeader><CardTitle>Conductors ({conductors.length})</CardTitle></CardHeader>
            <CardContent style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={thStyle}>Photo</th>
                      <th style={thStyle}>Full Name</th>
                      <th style={thStyle}>Username</th>
                      <th style={thStyle}>NIC</th>
                      <th style={thStyle}>Licence</th>
                      <th style={thStyle}>Contact</th>
                      <th style={thStyle}>Assigned Bus</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conductors.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No conductors registered.</td></tr>
                    ) : conductors.map(c => (
                      <tr key={c._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={tdStyle}>
                          {c.profileImage ? (
                            <img src={c.profileImage} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                          ) : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={16} color="#94a3b8" /></div>}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{c.fullName || c.username}</td>
                        <td style={tdStyle}>{c.username}</td>
                        <td style={tdStyle}>{c.nic || "—"}</td>
                        <td style={tdStyle}>{c.licenceNumber || "—"}</td>
                        <td style={tdStyle}>{c.contactNumber || "—"}</td>
                        <td style={tdStyle}>{c.assignedBus?.licensePlate || "—"}</td>
                        <td style={tdStyle}>
                          <button onClick={() => startEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7", marginRight: 8 }}><Edit size={16} /></button>
                          <button onClick={() => handleDelete(c._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EDGE DEVICE MANAGEMENT TAB
// ═══════════════════════════════════════════════════════════════
const EdgeDeviceTab = () => {
  const [devices, setDevices] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [subTab, setSubTab] = useState("monitoring");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ deviceId: "", name: "", type: "multi_sensor" });
  const [message, setMessage] = useState("");
  const [configDevice, setConfigDevice] = useState(null);
  const [configForm, setConfigForm] = useState({});

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/edge-devices");
      setDevices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await api.get("/edge-devices/monitoring");
      setMonitoring(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchSessions = async (deviceId) => {
    try {
      const res = await api.get(`/edge-devices/sessions/${deviceId}`);
      setSessionHistory(res.data);
      setSelectedDevice(deviceId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualVerify = async (deviceId) => {
    try {
      await api.post(`/edge-devices/manual-verify/${deviceId}`);
      setMessage("Cache sync + verify command sent. Device will verify on next heartbeat (~60s).");
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const openConfigModal = (dev) => {
    setConfigDevice(dev);
    setConfigForm({
      verifyInterval: dev.config?.verifyInterval ?? 300,
      earThreshold: dev.config?.earThreshold ?? 0.25,
      marThreshold: dev.config?.marThreshold ?? 0.50,
      noFaceTimeout: dev.config?.noFaceTimeout ?? 30,
      drowsyFrames: dev.config?.drowsyFrames ?? 15,
      yawnFrames: dev.config?.yawnFrames ?? 10,
      restTimeout: dev.config?.restTimeout ?? 60,
      maxContinuousDriving: dev.config?.maxContinuousDriving ?? 240,
      maxDailyDriving: dev.config?.maxDailyDriving ?? 480,
      minRestDuration: dev.config?.minRestDuration ?? 15,
    });
  };

  const handleConfigSave = async () => {
    try {
      await api.put(`/edge-devices/config/${configDevice.deviceId}`, configForm);
      setMessage("Device configuration updated");
      setTimeout(() => setMessage(""), 3000);
      setConfigDevice(null);
      fetchDevices();
      fetchMonitoring();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 15000);
    return () => clearInterval(interval);
  }, [fetchDevices, fetchMonitoring]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/edge-devices", form);
      setForm({ deviceId: "", name: "", type: "multi_sensor" });
      setIsAdding(false);
      setMessage("Edge device registered");
      setTimeout(() => setMessage(""), 3000);
      fetchDevices();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this edge device?")) return;
    try {
      await api.delete(`/edge-devices/${id}`);
      fetchDevices();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={sectionTitle}>Edge Device Management</h2>
        <Button onClick={() => setIsAdding(!isAdding)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> {isAdding ? "Cancel" : "Register New Device"}
        </Button>
      </div>

      {/* Sub-tabs: Monitoring | All Devices */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {[
          { key: "monitoring", label: "Driver Monitoring" },
          { key: "devices", label: "All Devices" },
        ].map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); setSelectedDevice(null); }} style={{
            ...tabStyle(subTab === t.key), fontSize: 13, padding: "8px 16px",
          }}>{t.label}</button>
        ))}
      </div>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8 }}>{message}</div>}

      {isAdding && (
        <Card style={{ border: "1px solid #bae6fd", background: "#f0f9ff" }}>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Device ID</label>
                <input style={inputStyle} value={form.deviceId} onChange={e => setForm(p => ({ ...p, deviceId: e.target.value }))} placeholder="ESP32-XXX" required />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Name</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Sensor Unit A" required />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Type</label>
                <select style={selectStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="multi_sensor">Multi Sensor</option>
                  <option value="passenger_counter">Passenger Counter</option>
                  <option value="gps_tracker">GPS Tracker</option>
                  <option value="camera">Camera</option>
                  <option value="raspberry_pi">Raspberry Pi 5</option>
                </select>
              </div>
              <Button type="submit">Register Device</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── Driver Monitoring Sub-Tab ─── */}
      {subTab === "monitoring" && (
        <>
          {selectedDevice ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button onClick={() => setSelectedDevice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 14, textAlign: "left" }}>
                ← Back to Monitoring
              </button>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Session History — {selectedDevice}</h3>
              <Card>
                <CardContent style={{ padding: 0 }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={thStyle}>Driver</th>
                          <th style={thStyle}>Verified</th>
                          <th style={thStyle}>Confidence</th>
                          <th style={thStyle}>Start</th>
                          <th style={thStyle}>End</th>
                          <th style={thStyle}>Duration</th>
                          <th style={thStyle}>Alertness</th>
                          <th style={thStyle}>Drowsiness Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionHistory.length === 0 ? (
                          <tr><td colSpan="8" style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No sessions recorded.</td></tr>
                        ) : sessionHistory.map(s => (
                          <tr key={s._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{s.driverName || "Unknown"}</td>
                            <td style={tdStyle}>
                              <Badge variant={s.verified ? "success" : "error"}>
                                {s.verified ? "Verified" : "Unverified"}
                              </Badge>
                            </td>
                            <td style={tdStyle}>{s.confidence ? `${(s.confidence * 100).toFixed(0)}%` : "—"}</td>
                            <td style={tdStyle}>{new Date(s.sessionStart).toLocaleTimeString()}</td>
                            <td style={tdStyle}>{s.sessionEnd ? new Date(s.sessionEnd).toLocaleTimeString() : "Active"}</td>
                            <td style={tdStyle}>{s.drivingMinutes ? `${s.drivingMinutes}m` : "—"}</td>
                            <td style={tdStyle}>
                              {s.alertnessLevel && (
                                <Badge variant={s.alertnessLevel === "ALERT" ? "success" : s.alertnessLevel === "TIRED" ? "warning" : "error"}>
                                  {s.alertnessLevel} {s.alertnessScore != null ? `(${s.alertnessScore})` : ""}
                                </Badge>
                              )}
                            </td>
                            <td style={tdStyle}>{s.drowsinessEvents?.length || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={fetchMonitoring} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
              {monitoring.length === 0 ? (
                <Card>
                  <CardContent style={{ padding: 48, textAlign: "center" }}>
                    <Cpu size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "#64748b" }}>No Raspberry Pi Devices</h3>
                    <p style={{ color: "#94a3b8" }}>Register a Raspberry Pi device to enable driver monitoring.</p>
                  </CardContent>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                  {monitoring.map(dev => {
                    const cs = dev.currentSession;
                    const isOnline = dev.status === "active" && dev.lastPing && (Date.now() - new Date(dev.lastPing).getTime()) < 120000;
                    return (
                      <Card key={dev._id} style={{
                        borderLeft: `4px solid ${cs?.verified ? "#22c55e" : cs ? "#f59e0b" : "#94a3b8"}`,
                        cursor: "pointer",
                      }} onClick={() => fetchSessions(dev.deviceId)}>
                        <CardContent style={{ padding: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                              <h4 style={{ fontWeight: 600, fontSize: 16 }}>{dev.name}</h4>
                              <p style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{dev.deviceId}</p>
                            </div>
                            <Badge variant={isOnline ? "success" : "secondary"}>
                              {isOnline ? "Online" : "Offline"}
                            </Badge>
                          </div>

                          {dev.assignedBus && (
                            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                              Bus: <strong>{dev.assignedBus.licensePlate}</strong> — Route: {dev.assignedBus.routeId || "N/A"}
                            </div>
                          )}

                          {cs ? (
                            <div style={{ background: cs.verified ? "#f0fdf4" : "#fffbeb", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 15 }}>{cs.driverName || "Unknown Driver"}</span>
                                <Badge variant={cs.verified ? "success" : "error"}>
                                  {cs.verified ? "Verified" : "Unverified"}
                                </Badge>
                              </div>
                              {cs.driverId && <p style={{ fontSize: 12, color: "#64748b" }}>License: {cs.driverId}</p>}
                              {cs.confidence != null && (
                                <p style={{ fontSize: 12, color: "#64748b" }}>
                                  Face Confidence: <strong>{(cs.confidence * 100).toFixed(0)}%</strong>
                                  {cs.local ? " (On-device)" : " (Remote)"}
                                </p>
                              )}
                              {cs.alertnessLevel && (
                                <div style={{ marginTop: 6 }}>
                                  <Badge variant={cs.alertnessLevel === "ALERT" ? "success" : cs.alertnessLevel === "TIRED" ? "warning" : "error"}>
                                    Alertness: {cs.alertnessLevel} {cs.alertnessScore != null ? `(${cs.alertnessScore})` : ""}
                                  </Badge>
                                </div>
                              )}
                              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                                Since: {new Date(cs.sessionStart).toLocaleTimeString()}
                              </p>
                            </div>
                          ) : (
                            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                              No active driver session
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginTop: 8 }}>
                            <span>Sessions today: {dev.todaySessionCount || 0}</span>
                            <span>Drowsiness alerts: {dev.todayDrowsinessEvents || 0}</span>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                            <button onClick={(e) => { e.stopPropagation(); handleManualVerify(dev.deviceId); }} style={{
                              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                              padding: "6px 10px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff",
                              color: "#2563eb", fontSize: 12, fontWeight: 500, cursor: "pointer",
                            }}>
                              <Play size={12} /> Verify Now
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openConfigModal(dev); }} style={{
                              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                              padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc",
                              color: "#64748b", fontSize: 12, fontWeight: 500, cursor: "pointer",
                            }}>
                              <Settings size={12} /> Configure
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── All Devices Sub-Tab ─── */}
      {subTab === "devices" && (
        <Card>
          <CardContent style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 32 }}>Loading devices...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={thStyle}>Device ID</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Connection</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Firmware</th>
                      <th style={thStyle}>Assigned Bus</th>
                      <th style={thStyle}>Last Ping</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No edge devices registered.</td></tr>
                    ) : devices.map(d => {
                      const isOnline = d.status === "active" && d.lastPing && (Date.now() - new Date(d.lastPing).getTime()) < 120000;
                      return (
                        <tr key={d._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{d.deviceId}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{d.name}</td>
                          <td style={tdStyle}><Badge variant="secondary">{d.type}</Badge></td>
                          <td style={tdStyle}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {isOnline ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#94a3b8" />}
                              <Badge variant={isOnline ? "success" : "secondary"}>
                                {isOnline ? "Online" : "Offline"}
                              </Badge>
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <Badge variant={d.status === "active" ? "success" : d.status === "maintenance" ? "warning" : "secondary"}>
                              {d.status}
                            </Badge>
                          </td>
                          <td style={tdStyle}>{d.firmwareVersion}</td>
                          <td style={tdStyle}>{d.assignedBus?.licensePlate || "—"}</td>
                          <td style={tdStyle}>{d.lastPing ? new Date(d.lastPing).toLocaleString() : "Never"}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {d.type === "raspberry_pi" && (
                                <button onClick={() => openConfigModal(d)} title="Configure" style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb" }}><Settings size={16} /></button>
                              )}
                              <button onClick={() => handleDelete(d._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Config Modal ─── */}
      {configDevice && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999,
        }} onClick={() => setConfigDevice(null)}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 28, width: 480, maxWidth: "90vw",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                <Settings size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
                Configure — {configDevice.name}
              </h3>
              <button onClick={() => setConfigDevice(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Changes will be applied on the device's next heartbeat (within ~60s).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Face Verification Interval (seconds)</label>
                <input type="number" style={inputStyle} value={configForm.verifyInterval}
                  onChange={e => setConfigForm(p => ({ ...p, verifyInterval: Number(e.target.value) }))} />
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>How often the Pi re-verifies the driver (default: 300s = 5min)</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>EAR Threshold</label>
                  <input type="number" step="0.01" style={inputStyle} value={configForm.earThreshold}
                    onChange={e => setConfigForm(p => ({ ...p, earThreshold: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>MAR Threshold</label>
                  <input type="number" step="0.01" style={inputStyle} value={configForm.marThreshold}
                    onChange={e => setConfigForm(p => ({ ...p, marThreshold: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>No-Face Timeout (s)</label>
                  <input type="number" style={inputStyle} value={configForm.noFaceTimeout}
                    onChange={e => setConfigForm(p => ({ ...p, noFaceTimeout: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Drowsy Frames</label>
                  <input type="number" style={inputStyle} value={configForm.drowsyFrames}
                    onChange={e => setConfigForm(p => ({ ...p, drowsyFrames: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Yawn Frames</label>
                <input type="number" style={inputStyle} value={configForm.yawnFrames}
                  onChange={e => setConfigForm(p => ({ ...p, yawnFrames: Number(e.target.value) }))} />
              </div>

              {/* Driving Time Management */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 10 }}>Driving Time Rules</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Rest Timeout (seconds)</label>
                  <input type="number" style={inputStyle} value={configForm.restTimeout}
                    onChange={e => setConfigForm(p => ({ ...p, restTimeout: Number(e.target.value) }))} />
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>No-face duration to switch to resting</p>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Min Rest Duration (min)</label>
                  <input type="number" style={inputStyle} value={configForm.minRestDuration}
                    onChange={e => setConfigForm(p => ({ ...p, minRestDuration: Number(e.target.value) }))} />
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Minimum rest between driving periods</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Max Continuous Driving (min)</label>
                  <input type="number" style={inputStyle} value={configForm.maxContinuousDriving}
                    onChange={e => setConfigForm(p => ({ ...p, maxContinuousDriving: Number(e.target.value) }))} />
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Mandatory break after this duration</p>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Max Daily Driving (min)</label>
                  <input type="number" style={inputStyle} value={configForm.maxDailyDriving}
                    onChange={e => setConfigForm(p => ({ ...p, maxDailyDriving: Number(e.target.value) }))} />
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Total driving limit per day (e.g. 480 = 8h)</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <Button variant="outline" onClick={() => setConfigDevice(null)}>Cancel</Button>
              <Button onClick={handleConfigSave}>Save Configuration</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SOS ALERTS TAB
// ═══════════════════════════════════════════════════════════════
const SOSTab = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sos");
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/sos/${id}/acknowledge`);
      fetchAlerts();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.put(`/sos/${id}/resolve`);
      fetchAlerts();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.status === filter);

  const filterTabs = [
    { key: "all", label: `All (${alerts.length})` },
    { key: "active", label: `Active (${alerts.filter(a => a.status === "active").length})` },
    { key: "acknowledged", label: `Acknowledged (${alerts.filter(a => a.status === "acknowledged").length})` },
    { key: "resolved", label: `Resolved (${alerts.filter(a => a.status === "resolved").length})` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={sectionTitle}>SOS Alerts</h2>
        <button onClick={fetchAlerts} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{
            ...tabStyle(filter === t.key), fontSize: 13, padding: "8px 16px",
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: "center" }}>Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No alerts found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(alert => (
            <Card key={alert._id} style={{
              borderLeft: `4px solid ${alert.status === "active" ? "#ef4444" : alert.status === "acknowledged" ? "#f59e0b" : "#22c55e"}`,
            }}>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <Badge variant={alert.status === "active" ? "error" : alert.status === "acknowledged" ? "warning" : "success"}>
                        {alert.status}
                      </Badge>
                      <Badge variant="secondary">{alert.alertType}</Badge>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{new Date(alert.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>
                      Bus: {alert.busId?.licensePlate || "Unknown"} — Route: {alert.busId?.routeId || "N/A"}
                    </p>
                    {alert.description && <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{alert.description}</p>}
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                      Reported by: {alert.reportedBy?.username || "Unknown"}
                      {alert.gps && ` | GPS: ${alert.gps.lat?.toFixed(4)}, ${alert.gps.lon?.toFixed(4)}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {alert.status === "active" && (
                      <Button onClick={() => handleAcknowledge(alert._id)} style={{ fontSize: 12, padding: "6px 12px" }}>
                        Acknowledge
                      </Button>
                    )}
                    {(alert.status === "active" || alert.status === "acknowledged") && (
                      <Button onClick={() => handleResolve(alert._id)} style={{ fontSize: 12, padding: "6px 12px", background: "#22c55e" }}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FACE RECOGNITION TAB  (uses FaceMesh-overlay components)
// ═══════════════════════════════════════════════════════════════
import FaceRegistration from "../../components/face/FaceRegistration";
import FaceVerification from "../../components/face/FaceVerification";
import ReRegisterScan from "../../components/face/ReRegisterScan";

const FaceRecognitionTab = () => {
  const [drivers, setDrivers] = useState([]);
  const [mlStatus, setMlStatus] = useState(null);
  const [reloadingPickle, setReloadingPickle] = useState(false);

  // Re-register modal state
  const [reuploadDriver, setReuploadDriver] = useState(null);

  const fetchDrivers = useCallback(async () => {
    try { const res = await api.get("/driver"); setDrivers(res.data); } catch {}
  }, []);

  const fetchMlStatus = useCallback(async () => {
    try { const res = await api.get("/driver/face-db"); setMlStatus(res.data); } catch { setMlStatus(null); }
  }, []);

  useEffect(() => { fetchDrivers(); fetchMlStatus(); }, [fetchDrivers, fetchMlStatus]);

  const refreshAll = () => { fetchDrivers(); fetchMlStatus(); };

  const handleReloadPickle = async () => {
    setReloadingPickle(true);
    try { await api.post("/driver/face-reload"); await fetchMlStatus(); } catch {}
    setReloadingPickle(false);
  };

  const handleDeleteFaceData = async (driver) => {
    if (!confirm(`Remove all face encodings for "${driver.name}" from the pickle database?`)) return;
    try {
      const payload = {};
      if (driver.driver_id) payload.driverId = driver.driver_id;
      else payload.name = driver.name;
      await api.post("/driver/face-delete", payload);
      refreshAll();
    } catch {
      alert("Failed to delete face data");
    }
  };

  const registeredCount = drivers.filter(d => d.faceEncoding?.length > 0).length;
  const failedCount = drivers.filter(d => !d.faceEncoding || d.faceEncoding.length === 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={sectionTitle}><Camera size={22} /> Driver Face Recognition</h2>

      {/* Status Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
          <Users size={20} color="#0284c7" />
          <div><div style={{ fontSize: 24, fontWeight: 700 }}>{drivers.length}</div><div style={{ fontSize: 12, color: "#64748b" }}>Total Drivers</div></div>
        </div>
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
          <CheckCircle size={20} color="#16a34a" />
          <div><div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{registeredCount}</div><div style={{ fontSize: 12, color: "#64748b" }}>Face ID Active</div></div>
        </div>
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
          <XCircle size={20} color="#dc2626" />
          <div><div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>{failedCount}</div><div style={{ fontSize: 12, color: "#64748b" }}>Face ID Failed</div></div>
        </div>
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
          <Scan size={20} color="#7c3aed" />
          <div><div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>{mlStatus?.total_encodings ?? "—"}</div><div style={{ fontSize: 12, color: "#64748b" }}>ML Encodings</div></div>
        </div>
      </div>

      {/* ═══ Register + Verify (side by side) ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <FaceRegistration
          drivers={drivers}
          onComplete={refreshAll}
          cardStyle={cardStyle}
          inputStyle={inputStyle}
        />
        <FaceVerification cardStyle={cardStyle} />
      </div>

      {/* ═══ Registered Drivers Table ═══ */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} /> Registered Drivers — Face ID Status
          </h3>
          <button onClick={refreshAll}
            style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ borderBottom: "2px solid #e2e8f0" }}>
            <tr>
              <th style={thStyle}>Photo</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>License No.</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Face ID</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={tdStyle}>
                  {d.photoUrl ? (
                    <img src={d.photoUrl} alt={d.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={18} color="#94a3b8" />
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.name}</td>
                <td style={tdStyle}>{d.licenseNumber}</td>
                <td style={tdStyle}>{d.contactNumber || "—"}</td>
                <td style={tdStyle}>
                  {d.faceEncoding?.length > 0
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 600, fontSize: 13 }}><CheckCircle size={14} /> Active</span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#dc2626", fontWeight: 600, fontSize: 13 }}><XCircle size={14} /> Failed</span>}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setReuploadDriver(d)}
                    style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <Camera size={12} /> Re-register Face
                  </button>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>No drivers registered yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ Face Recognition Pickle Database ═══ */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Scan size={18} /> Face Recognition Model Database
          </h3>
          <button onClick={handleReloadPickle} disabled={reloadingPickle}
            style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: reloadingPickle ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, opacity: reloadingPickle ? 0.6 : 1 }}>
            <RefreshCw size={14} /> {reloadingPickle ? "Reloading..." : "Reload Pickle"}
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          Showing face encodings loaded from <strong>Face_Recognition.pickle</strong> (trained in Google Colab). Use "Reload Pickle" after replacing the file with a newly trained model.
        </p>
        {mlStatus ? (
          <>
            <div style={{ marginBottom: 12, padding: 10, background: "#f0f9ff", borderRadius: 8, fontSize: 14 }}>
              Total encodings in pickle: <strong>{mlStatus.total_encodings}</strong> | Unique identities: <strong>{mlStatus.drivers?.length ?? 0}</strong>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ borderBottom: "2px solid #e2e8f0" }}>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Driver ID</th>
                  <th style={thStyle}>Encodings</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(mlStatus.drivers || []).map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{d.name}</td>
                    <td style={tdStyle}>{d.driver_id || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>from Colab training</span>}</td>
                    <td style={tdStyle}>{d.encoding_count}</td>
                    <td style={tdStyle}>
                      <button onClick={() => handleDeleteFaceData(d)}
                        style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {(!mlStatus.drivers || mlStatus.drivers.length === 0) && (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>No faces in pickle database</td></tr>
                )}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
            ML face recognition service unavailable — make sure it is running on port 5001
          </div>
        )}
      </div>

      {/* ═══ Re-register Face Scan Modal ═══ */}
      {reuploadDriver && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setReuploadDriver(null)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 540, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Re-register Face — {reuploadDriver.name}</h3>
              <button onClick={() => setReuploadDriver(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <ReRegisterScan driver={reuploadDriver} onComplete={() => { setReuploadDriver(null); refreshAll(); }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════════
const AdminPanel = () => {
  const location = useLocation();
  const path = location.pathname;

  const getActiveTab = () => {
    if (path === "/admin/fleet") return "fleet";
    if (path === "/admin/assignments") return "assignments";
    if (path === "/admin/employees") return "employees";
    if (path === "/admin/edge-devices") return "edge-devices";
    if (path === "/admin/sos") return "sos";
    if (path === "/admin/face-recognition") return "face-recognition";
    return "overview";
  };

  const activeTab = getActiveTab();

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "fleet": return <FleetTab />;
      case "assignments": return <AssignmentsTab />;
      case "employees": return <EmployeeTab />;
      case "edge-devices": return <EdgeDeviceTab />;
      case "sos": return <SOSTab />;
      case "face-recognition": return <FaceRecognitionTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>Admin Panel</h1>

      {/* Tab Content */}
      <div>{renderTab()}</div>
    </div>
  );
};

export default AdminPanel;
