import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Cpu, Plus, Trash2, Edit, Wifi, WifiOff } from "lucide-react";

const EdgeDeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [form, setForm] = useState({
    deviceId: "",
    name: "",
    type: "passenger_counter",
    firmwareVersion: "1.0.0",
  });
  const [error, setError] = useState("");

  const fetchDevices = async () => {
    try {
      const res = await api.get("/edge-devices");
      setDevices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingDevice) {
        await api.put(`/edge-devices/${editingDevice._id}`, form);
      } else {
        await api.post("/edge-devices", form);
      }
      setShowForm(false);
      setEditingDevice(null);
      setForm({ deviceId: "", name: "", type: "passenger_counter", firmwareVersion: "1.0.0" });
      fetchDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save device");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this edge device?")) return;
    try {
      await api.delete(`/edge-devices/${id}`);
      fetchDevices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setForm({
      deviceId: device.deviceId,
      name: device.name,
      type: device.type,
      firmwareVersion: device.firmwareVersion,
    });
    setShowForm(true);
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Cpu size={28} /> Edge Device Management
        </h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingDevice(null); setForm({ deviceId: "", name: "", type: "passenger_counter", firmwareVersion: "1.0.0" }); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          <Plus size={18} /> Add Device
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, marginBottom: 24, border: "1px solid #e2e8f0" }}>
          <h3 style={{ marginBottom: 16, fontWeight: 600 }}>{editingDevice ? "Edit Device" : "Register New Edge Device"}</h3>
          {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Device ID</label>
              <input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} required disabled={!!editingDevice} placeholder="e.g. ESP32-001" style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Bus Counter Unit 1" style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                <option value="passenger_counter">Passenger Counter</option>
                <option value="gps_tracker">GPS Tracker</option>
                <option value="camera">Camera</option>
                <option value="speed_sensor">Speed Sensor</option>
                <option value="multi_sensor">Multi Sensor</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Firmware Version</label>
              <input value={form.firmwareVersion} onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })} placeholder="1.0.0" style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button type="submit" style={{ padding: "10px 24px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              {editingDevice ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingDevice(null); }} style={{ padding: "10px 24px", background: "#e2e8f0", color: "#334155", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {devices.map((device) => (
          <div key={device._id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: 16 }}>{device.name}</h3>
                <p style={{ fontSize: 13, color: "#64748b" }}>ID: {device.deviceId}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(device)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7" }}>
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(device._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: device.status === "active" ? "#dcfce7" : "#fee2e2", color: device.status === "active" ? "#166534" : "#991b1b" }}>
                {device.status === "active" ? <Wifi size={12} style={{ display: "inline", marginRight: 4 }} /> : <WifiOff size={12} style={{ display: "inline", marginRight: 4 }} />}
                {device.status}
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: "#f0f9ff", color: "#0369a1" }}>
                {device.type.replace(/_/g, " ")}
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, background: "#faf5ff", color: "#7c3aed" }}>
                v{device.firmwareVersion}
              </span>
            </div>
            {device.assignedBus && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>
                Assigned to: <strong>{device.assignedBus.licensePlate}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
          <Cpu size={48} style={{ margin: "0 auto 16px" }} />
          <p>No edge devices registered yet</p>
        </div>
      )}
    </div>
  );
};

export default EdgeDeviceManagement;
