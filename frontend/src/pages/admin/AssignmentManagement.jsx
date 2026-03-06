import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link2, Bus, UserPlus, User, Cpu, ArrowRight } from "lucide-react";

const AssignmentManagement = () => {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [edgeDevices, setEdgeDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Assignment form state
  const [driverAssign, setDriverAssign] = useState({ busId: "", driverId: "" });
  const [conductorAssign, setConductorAssign] = useState({ busId: "", conductorId: "" });
  const [deviceAssign, setDeviceAssign] = useState({ busId: "", edgeDeviceId: "" });

  const fetchAll = async () => {
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
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const showMessage = (msg) => {
    setMessage(msg);
    setError("");
    setTimeout(() => setMessage(""), 3000);
  };

  const showError = (msg) => {
    setError(msg);
    setMessage("");
    setTimeout(() => setError(""), 3000);
  };

  const handleAssignDriver = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assignments/driver", driverAssign);
      showMessage("Driver assigned successfully");
      setDriverAssign({ busId: "", driverId: "" });
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to assign driver");
    }
  };

  const handleAssignConductor = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assignments/conductor", conductorAssign);
      showMessage("Conductor assigned successfully");
      setConductorAssign({ busId: "", conductorId: "" });
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to assign conductor");
    }
  };

  const handleAssignDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assignments/edge-device", deviceAssign);
      showMessage("Edge device assigned successfully");
      setDeviceAssign({ busId: "", edgeDeviceId: "" });
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to assign device");
    }
  };

  const handleUnassign = async (busId, type) => {
    if (!confirm(`Unassign ${type} from this bus?`)) return;
    try {
      await api.delete(`/assignments/${busId}/${type}`);
      showMessage(`${type} unassigned successfully`);
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to unassign");
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  const selectStyle = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 };
  const btnPrimary = { padding: "10px 20px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={28} /> Bus Assignments
      </h1>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      {/* Assignment Forms */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 32 }}>
        {/* Assign Driver */}
        <form onSubmit={handleAssignDriver} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <UserPlus size={18} /> Assign Driver
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select value={driverAssign.busId} onChange={(e) => setDriverAssign({ ...driverAssign, busId: e.target.value })} required style={selectStyle}>
              <option value="">Select Bus</option>
              {buses.map((b) => <option key={b._id} value={b._id}>{b.licensePlate} - {b.routeId}</option>)}
            </select>
            <select value={driverAssign.driverId} onChange={(e) => setDriverAssign({ ...driverAssign, driverId: e.target.value })} required style={selectStyle}>
              <option value="">Select Driver</option>
              {drivers.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.licenseNumber})</option>)}
            </select>
            <button type="submit" style={btnPrimary}>Assign Driver</button>
          </div>
        </form>

        {/* Assign Conductor */}
        <form onSubmit={handleAssignConductor} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <User size={18} /> Assign Conductor
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select value={conductorAssign.busId} onChange={(e) => setConductorAssign({ ...conductorAssign, busId: e.target.value })} required style={selectStyle}>
              <option value="">Select Bus</option>
              {buses.map((b) => <option key={b._id} value={b._id}>{b.licensePlate} - {b.routeId}</option>)}
            </select>
            <select value={conductorAssign.conductorId} onChange={(e) => setConductorAssign({ ...conductorAssign, conductorId: e.target.value })} required style={selectStyle}>
              <option value="">Select Conductor</option>
              {conductors.map((c) => <option key={c._id} value={c._id}>{c.username}</option>)}
            </select>
            <button type="submit" style={btnPrimary}>Assign Conductor</button>
          </div>
        </form>

        {/* Assign Edge Device */}
        <form onSubmit={handleAssignDevice} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Cpu size={18} /> Assign Edge Device
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select value={deviceAssign.busId} onChange={(e) => setDeviceAssign({ ...deviceAssign, busId: e.target.value })} required style={selectStyle}>
              <option value="">Select Bus</option>
              {buses.map((b) => <option key={b._id} value={b._id}>{b.licensePlate} - {b.routeId}</option>)}
            </select>
            <select value={deviceAssign.edgeDeviceId} onChange={(e) => setDeviceAssign({ ...deviceAssign, edgeDeviceId: e.target.value })} required style={selectStyle}>
              <option value="">Select Edge Device</option>
              {edgeDevices.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.deviceId})</option>)}
            </select>
            <button type="submit" style={btnPrimary}>Assign Device</button>
          </div>
        </form>
      </div>

      {/* Current Assignments Table */}
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Current Assignments</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Bus</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Route</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Driver</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Conductor</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Edge Device</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{bus.licensePlate}</td>
                <td style={{ padding: "12px 16px" }}>{bus.routeId}</td>
                <td style={{ padding: "12px 16px" }}>
                  {bus.assignedDriver ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {bus.assignedDriver.name}
                      <button onClick={() => handleUnassign(bus._id, "driver")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12, marginLeft: 4 }}>✕</button>
                    </span>
                  ) : <span style={{ color: "#94a3b8" }}>Not assigned</span>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {bus.assignedConductor ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {bus.assignedConductor.username}
                      <button onClick={() => handleUnassign(bus._id, "conductor")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12, marginLeft: 4 }}>✕</button>
                    </span>
                  ) : <span style={{ color: "#94a3b8" }}>Not assigned</span>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {bus.assignedEdgeDevice ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {bus.assignedEdgeDevice.name}
                      <button onClick={() => handleUnassign(bus._id, "edge-device")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12, marginLeft: 4 }}>✕</button>
                    </span>
                  ) : <span style={{ color: "#94a3b8" }}>Not assigned</span>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: bus.status === "active" ? "#dcfce7" : bus.status === "maintenance" ? "#fef9c3" : "#fee2e2", color: bus.status === "active" ? "#166534" : bus.status === "maintenance" ? "#854d0e" : "#991b1b" }}>
                    {bus.status || "active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentManagement;
