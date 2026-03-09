import React, { useEffect, useState } from 'react';
import { getPoliceStations, createPoliceStation, updatePoliceStation, deletePoliceStation } from '../../services/adminService';
import { Card, CardContent } from '../../components/ui/Card';
import { Building2, Plus, Pencil, Trash2, Phone, MapPin, Shield, X, CheckCircle, XCircle, Search } from 'lucide-react';

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border-light)",
  fontSize: 14, color: "var(--text-primary)", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
  background: "var(--bg-surface)", boxSizing: "border-box",
};

const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" };

const PoliceStationsPage = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', station_code: '', district: '', province: '', address: '',
    phone: '', email: '', latitude: '', longitude: '', officer_in_charge: '',
    contact_person: '', emergency_hotline: '', status: 'active'
  });

  useEffect(() => { fetchStations(); }, []);

  const fetchStations = async () => {
    try {
      const data = await getPoliceStations();
      setStations(data.policeStations || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const stationData = {
        ...formData,
        location: { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) }
      };
      delete stationData.latitude;
      delete stationData.longitude;
      if (editing) {
        await updatePoliceStation(editing._id, stationData);
      } else {
        await createPoliceStation(stationData);
      }
      setShowModal(false);
      resetForm();
      fetchStations();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this police station?')) {
      try {
        await deletePoliceStation(id);
        fetchStations();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (station) => {
    setEditing(station);
    setFormData({
      name: station.name, station_code: station.station_code, district: station.district,
      province: station.province, address: station.address, phone: station.phone,
      email: station.email || '', latitude: station.location?.latitude || '',
      longitude: station.location?.longitude || '', officer_in_charge: station.officer_in_charge || '',
      contact_person: station.contact_person || '', emergency_hotline: station.emergency_hotline || '',
      status: station.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', station_code: '', district: '', province: '', address: '', phone: '', email: '', latitude: '', longitude: '', officer_in_charge: '', contact_person: '', emergency_hotline: '', status: 'active' });
    setEditing(null);
  };

  const filtered = stations.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.district?.toLowerCase().includes(search.toLowerCase()) ||
    s.station_code?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = stations.filter(s => s.status === 'active').length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border-light)", borderTopColor: "#1e40af", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading police stations...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 10, background: "linear-gradient(135deg, #1e40af, #3b82f6)", borderRadius: 12 }}>
            <Building2 style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Police Stations</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>Manage registered police stations</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
          background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "#fff", border: "none",
          fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.3)"; }}
        >
          <Plus style={{ height: 18, width: 18 }} /> Add Station
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          { label: "Total Stations", value: stations.length, color: "#2563eb", bgGrad: "linear-gradient(135deg, #eff6ff, #dbeafe)", borderColor: "#bfdbfe", icon: Building2, iconBg: "#2563eb" },
          { label: "Active", value: activeCount, color: "#16a34a", bgGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#bbf7d0", icon: CheckCircle, iconBg: "#16a34a" },
          { label: "Inactive", value: stations.length - activeCount, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: XCircle, iconBg: "#dc2626" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} style={{ background: s.bgGrad, border: `1px solid ${s.borderColor}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              <CardContent style={{ padding: 22, paddingTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                </div>
                <div style={{ padding: 14, background: s.iconBg, borderRadius: 14, color: "#fff", boxShadow: `0 4px 14px ${s.iconBg}40` }}>
                  <Icon style={{ height: 24, width: 24 }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + Table */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>All Stations</h2>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 16, width: 16, color: "var(--text-muted)" }} />
            <input
              type="text" placeholder="Search stations..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 260, paddingLeft: 36, borderRadius: 10 }}
              onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Station Name", "Code", "District", "Phone", "Emergency Hotline", "Status", "Actions"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #eff6ff, #dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Shield style={{ height: 16, width: 16, color: "#2563eb" }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: 14 }}>{s.name}</p>
                          {s.officer_in_charge && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>OIC: {s.officer_in_charge}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg-muted)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13 }}>{s.station_code}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                        <MapPin style={{ height: 14, width: 14, flexShrink: 0 }} />{s.district}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                        <Phone style={{ height: 14, width: 14, flexShrink: 0 }} />{s.phone}
                      </div>
                    </td>
                    <td>{s.emergency_hotline || '—'}</td>
                    <td>
                      <span style={{
                        padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: "0.03em",
                        background: s.status === 'active' ? "#dcfce7" : "#fee2e2",
                        color: s.status === 'active' ? "#16a34a" : "#dc2626",
                      }}>{s.status?.toUpperCase()}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleEdit(s)} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
                          background: "var(--bg-surface)", border: "1.5px solid var(--border-light)", color: "var(--text-secondary)", fontSize: 13,
                          fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#2563eb"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          <Pencil style={{ height: 14, width: 14 }} /> Edit
                        </button>
                        <button onClick={() => handleDelete(s._id)} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
                          background: "var(--bg-surface)", border: "1.5px solid #fecaca", color: "#dc2626", fontSize: 13,
                          fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)"; }}
                        >
                          <Trash2 style={{ height: 14, width: 14 }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: "center" }}>
                      <Building2 style={{ height: 40, width: 40, color: "var(--border-light)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>{search ? 'No stations match your search' : 'No police stations registered'}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Click "Add Station" to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}
        >
          <div style={{
            background: "var(--bg-surface)", borderRadius: 20, width: "90%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 25px 60px rgba(0,0,0,0.25)", animation: "modalIn 0.25s ease-out",
          }}>
            <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: "linear-gradient(135deg, #1e40af, #3b82f6)", borderRadius: 10 }}>
                  <Building2 style={{ height: 18, width: 18, color: "#fff" }} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{editing ? 'Edit Police Station' : 'Add Police Station'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{
                background: "var(--bg-muted)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", color: "var(--text-secondary)",
              }}><X style={{ height: 18, width: 18 }} /></button>
            </div>
            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Station Name *</label><input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
                <div><label style={labelStyle}>Station Code *</label><input type="text" style={inputStyle} value={formData.station_code} onChange={e => setFormData({ ...formData, station_code: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>District *</label><input type="text" style={inputStyle} value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
                <div><label style={labelStyle}>Province *</label><input type="text" style={inputStyle} value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
              </div>
              <div><label style={labelStyle}>Address *</label><input type="text" style={inputStyle} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Phone *</label><input type="tel" style={inputStyle} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Latitude *</label><input type="number" step="any" style={inputStyle} value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
                <div><label style={labelStyle}>Longitude *</label><input type="number" step="any" style={inputStyle} value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} required onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Officer in Charge</label><input type="text" style={inputStyle} value={formData.officer_in_charge} onChange={e => setFormData({ ...formData, officer_in_charge: e.target.value })} onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
                <div><label style={labelStyle}>Contact Person</label><input type="text" style={inputStyle} value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Emergency Hotline</label><input type="tel" style={inputStyle} value={formData.emergency_hotline} onChange={e => setFormData({ ...formData, emergency_hotline: e.target.value })} onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }} /></div>
                <div>
                  <label style={labelStyle}>Status *</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} required style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border-light)", marginTop: 4 }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{
                  padding: "10px 24px", borderRadius: 10, background: "var(--bg-muted)", border: "none", color: "var(--text-secondary)",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--border-light)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-muted)"; }}
                >Cancel</button>
                <button type="submit" style={{
                  padding: "10px 28px", borderRadius: 10,
                  background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "#fff", border: "none",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >{editing ? 'Update Station' : 'Create Station'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceStationsPage;
