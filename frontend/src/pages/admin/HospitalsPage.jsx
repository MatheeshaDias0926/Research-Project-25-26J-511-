import React, { useEffect, useState } from 'react';
import { getHospitals, createHospital, updateHospital, deleteHospital } from '../../services/adminService';
import { Card, CardContent } from '../../components/ui/Card';
import { Hospital, Plus, Pencil, Trash2, Phone, MapPin, X, CheckCircle, XCircle, Search, Ambulance, BedDouble, HeartPulse } from 'lucide-react';

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border-light)",
  fontSize: 14, color: "var(--text-primary)", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
  background: "var(--bg-surface)", boxSizing: "border-box",
};

const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" };

const focusHandler = {
  onFocus: e => { e.target.style.borderColor = "#dc2626"; e.target.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.1)"; },
  onBlur: e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; },
};

const typeColors = {
  government: { bg: "#dbeafe", text: "#1e40af" },
  private: { bg: "#fae8ff", text: "#7c3aed" },
  teaching: { bg: "#fef9c3", text: "#a16207" },
};

const HospitalsPage = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', hospital_code: '', type: 'government', district: '', province: '', address: '',
    phone: '', email: '', latitude: '', longitude: '', emergency_hotline: '', ambulance_count: 0,
    bed_capacity: '', has_trauma_unit: false, has_icu: false, contact_person: '', status: 'active'
  });

  useEffect(() => { fetchHospitals(); }, []);

  const fetchHospitals = async () => {
    try {
      const data = await getHospitals();
      setHospitals(data.hospitals || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const hospitalData = {
        ...formData,
        location: { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) },
        ambulance_count: parseInt(formData.ambulance_count),
        bed_capacity: formData.bed_capacity ? parseInt(formData.bed_capacity) : undefined
      };
      delete hospitalData.latitude;
      delete hospitalData.longitude;
      if (editing) {
        await updateHospital(editing._id, hospitalData);
      } else {
        await createHospital(hospitalData);
      }
      setShowModal(false);
      resetForm();
      fetchHospitals();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this hospital?')) {
      try {
        await deleteHospital(id);
        fetchHospitals();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (hospital) => {
    setEditing(hospital);
    setFormData({
      name: hospital.name, hospital_code: hospital.hospital_code, type: hospital.type,
      district: hospital.district, province: hospital.province, address: hospital.address,
      phone: hospital.phone, email: hospital.email || '', latitude: hospital.location?.latitude || '',
      longitude: hospital.location?.longitude || '', emergency_hotline: hospital.emergency_hotline,
      ambulance_count: hospital.ambulance_count || 0, bed_capacity: hospital.bed_capacity || '',
      has_trauma_unit: hospital.has_trauma_unit, has_icu: hospital.has_icu,
      contact_person: hospital.contact_person || '', status: hospital.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', hospital_code: '', type: 'government', district: '', province: '', address: '', phone: '', email: '', latitude: '', longitude: '', emergency_hotline: '', ambulance_count: 0, bed_capacity: '', has_trauma_unit: false, has_icu: false, contact_person: '', status: 'active' });
    setEditing(null);
  };

  const filtered = hospitals.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.district?.toLowerCase().includes(search.toLowerCase()) ||
    h.hospital_code?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = hospitals.filter(h => h.status === 'active').length;
  const totalAmbulances = hospitals.reduce((sum, h) => sum + (h.ambulance_count || 0), 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border-light)", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading hospitals...</p>
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
          <div style={{ padding: 10, background: "linear-gradient(135deg, #dc2626, #ef4444)", borderRadius: 12 }}>
            <Hospital style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Hospitals</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>Manage registered hospitals and medical facilities</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
          background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff", border: "none",
          fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(220,38,38,0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(220,38,38,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(220,38,38,0.3)"; }}
        >
          <Plus style={{ height: 18, width: 18 }} /> Add Hospital
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {[
          { label: "Total Hospitals", value: hospitals.length, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: Hospital, iconBg: "#dc2626" },
          { label: "Active", value: activeCount, color: "#16a34a", bgGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#bbf7d0", icon: CheckCircle, iconBg: "#16a34a" },
          { label: "Ambulances", value: totalAmbulances, color: "#2563eb", bgGrad: "linear-gradient(135deg, #eff6ff, #dbeafe)", borderColor: "#bfdbfe", icon: HeartPulse, iconBg: "#2563eb" },
          { label: "Inactive", value: hospitals.length - activeCount, color: "#ea580c", bgGrad: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderColor: "#fed7aa", icon: XCircle, iconBg: "#ea580c" },
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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>All Hospitals</h2>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 16, width: 16, color: "var(--text-muted)" }} />
            <input
              type="text" placeholder="Search hospitals..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 260, paddingLeft: 36, borderRadius: 10 }}
              onFocus={e => { e.target.style.borderColor = "#dc2626"; e.target.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border-light)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Hospital Name", "Code", "Type", "District", "Emergency Hotline", "Ambulances", "Status", "Actions"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  const tc = typeColors[h.type] || typeColors.government;
                  return (
                    <tr key={h._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #fef2f2, #fee2e2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Hospital style={{ height: 16, width: 16, color: "#dc2626" }} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: 14 }}>{h.name}</p>
                            {h.contact_person && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Contact: {h.contact_person}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg-muted)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13 }}>{h.hospital_code}</span>
                      </td>
                      <td>
                        <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: tc.bg, color: tc.text, textTransform: "capitalize" }}>{h.type}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <MapPin style={{ height: 14, width: 14, flexShrink: 0 }} />{h.district}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <Phone style={{ height: 14, width: 14, flexShrink: 0 }} />{h.emergency_hotline}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "#2563eb", fontSize: 15 }}>{h.ambulance_count || 0}</span>
                      </td>
                      <td>
                        <span style={{
                          padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: "0.03em",
                          background: h.status === 'active' ? "#dcfce7" : "#fee2e2",
                          color: h.status === 'active' ? "#16a34a" : "#dc2626",
                        }}>{h.status?.toUpperCase()}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleEdit(h)} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
                            background: "var(--bg-surface)", border: "1.5px solid var(--border-light)", color: "var(--text-secondary)", fontSize: 13,
                            fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.color = "#dc2626"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-label)"; }}
                          >
                            <Pencil style={{ height: 14, width: 14 }} /> Edit
                          </button>
                          <button onClick={() => handleDelete(h._id)} style={{
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
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 48, textAlign: "center" }}>
                      <Hospital style={{ height: 40, width: 40, color: "var(--border-light)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>{search ? 'No hospitals match your search' : 'No hospitals registered'}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Click "Add Hospital" to get started</p>
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
            background: "var(--bg-surface)", borderRadius: 20, width: "90%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 25px 60px rgba(0,0,0,0.25)", animation: "modalIn 0.25s ease-out",
          }}>
            <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: "linear-gradient(135deg, #dc2626, #ef4444)", borderRadius: 10 }}>
                  <Hospital style={{ height: 18, width: 18, color: "#fff" }} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{editing ? 'Edit Hospital' : 'Add Hospital'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{
                background: "var(--bg-muted)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", color: "var(--text-secondary)",
              }}><X style={{ height: 18, width: 18 }} /></button>
            </div>
            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Hospital Name *</label><input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required {...focusHandler} /></div>
                <div><label style={labelStyle}>Hospital Code *</label><input type="text" style={inputStyle} value={formData.hospital_code} onChange={e => setFormData({ ...formData, hospital_code: e.target.value })} required {...focusHandler} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Type *</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required style={{ ...inputStyle, cursor: "pointer" }} {...focusHandler}>
                    <option value="government">Government</option>
                    <option value="private">Private</option>
                    <option value="teaching">Teaching</option>
                  </select>
                </div>
                <div><label style={labelStyle}>District *</label><input type="text" style={inputStyle} value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} required {...focusHandler} /></div>
                <div><label style={labelStyle}>Province *</label><input type="text" style={inputStyle} value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} required {...focusHandler} /></div>
              </div>
              <div><label style={labelStyle}>Address *</label><input type="text" style={inputStyle} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required {...focusHandler} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Phone *</label><input type="tel" style={inputStyle} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required {...focusHandler} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} {...focusHandler} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Latitude *</label><input type="number" step="any" style={inputStyle} value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} required {...focusHandler} /></div>
                <div><label style={labelStyle}>Longitude *</label><input type="number" step="any" style={inputStyle} value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} required {...focusHandler} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div><label style={labelStyle}>Emergency Hotline *</label><input type="tel" style={inputStyle} value={formData.emergency_hotline} onChange={e => setFormData({ ...formData, emergency_hotline: e.target.value })} required {...focusHandler} /></div>
                <div><label style={labelStyle}>Ambulance Count</label><input type="number" style={inputStyle} value={formData.ambulance_count} onChange={e => setFormData({ ...formData, ambulance_count: e.target.value })} {...focusHandler} /></div>
                <div><label style={labelStyle}>Bed Capacity</label><input type="number" style={inputStyle} value={formData.bed_capacity} onChange={e => setFormData({ ...formData, bed_capacity: e.target.value })} {...focusHandler} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border-light)", background: formData.has_trauma_unit ? "#f0fdf4" : "var(--bg-surface)", cursor: "pointer", transition: "all 0.15s" }}
                  onClick={() => setFormData({ ...formData, has_trauma_unit: !formData.has_trauma_unit })}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: formData.has_trauma_unit ? "none" : "2px solid var(--border-light)", background: formData.has_trauma_unit ? "#16a34a" : "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {formData.has_trauma_unit && <CheckCircle style={{ height: 14, width: 14, color: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Trauma Unit</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border-light)", background: formData.has_icu ? "#f0fdf4" : "var(--bg-surface)", cursor: "pointer", transition: "all 0.15s" }}
                  onClick={() => setFormData({ ...formData, has_icu: !formData.has_icu })}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: formData.has_icu ? "none" : "2px solid var(--border-light)", background: formData.has_icu ? "#16a34a" : "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {formData.has_icu && <CheckCircle style={{ height: 14, width: 14, color: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Has ICU</span>
                </div>
                <div>
                  <label style={labelStyle}>Status *</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} required style={{ ...inputStyle, cursor: "pointer" }} {...focusHandler}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Contact Person</label><input type="text" style={inputStyle} value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} {...focusHandler} /></div>
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
                  background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff", border: "none",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(220,38,38,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >{editing ? 'Update Hospital' : 'Create Hospital'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalsPage;
