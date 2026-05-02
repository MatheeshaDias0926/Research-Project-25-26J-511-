import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCrashes } from '../../services/adminService';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '../../components/ui/Card';
import { 
  ChevronLeft, MapPin, Navigation, Activity, 
  AlertCircle, Shield, HeartPulse, Clock, Bus 
} from 'lucide-react';

const CrashDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crash, setCrash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCrashDetails();
  }, [id]);

  const fetchCrashDetails = async () => {
    try {
      const data = await getCrashes();
      const found = data.crashes.find(c => c._id === id);
      setCrash(found);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    if (!crash) return;
    const lat = crash.location.lat || crash.location.latitude;
    const lon = crash.location.lon || crash.location.longitude;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading incident details...</div>;
  if (!crash) return <div style={{ padding: 40, textAlign: 'center' }}>Incident not found.</div>;

  const lat = crash.location.lat !== undefined ? crash.location.lat : (crash.location.latitude !== undefined ? crash.location.latitude : 0);
  const lon = crash.location.lon !== undefined ? crash.location.lon : (crash.location.longitude !== undefined ? crash.location.longitude : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ padding: 8, borderRadius: 10, background: "var(--bg-surface)", border: "1.5px solid var(--border-light)", cursor: "pointer" }}
          >
            <ChevronLeft style={{ height: 20, width: 20 }} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Incident Details</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>Crash ID: {crash._id}</p>
          </div>
        </div>
        <button 
          onClick={handleNavigate}
          style={{ 
            display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12,
            background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff", border: "none",
            fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.4)"
          }}
        >
          <Navigation style={{ height: 18, width: 18 }} /> Get Directions
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}>
        {/* Map and Main Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card style={{ height: 450, overflow: "hidden", borderRadius: 20 }}>
            <MapContainer center={[lat, lon]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[lat, lon]} icon={L.divIcon({
                className: 'custom-icon',
                html: `<div style="background-color: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
              })}>
                <Popup>{crash.location.address || 'Crash Site'}</Popup>
              </Marker>
            </MapContainer>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity style={{ color: "#2563eb" }} /> Impact Metrics
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Max Acceleration</span>
                    <span style={{ fontWeight: 700 }}>{crash.max_acceleration?.toFixed(2) || '—'} m/s²</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Reconstruction Error</span>
                    <span style={{ fontWeight: 700 }}>{crash.reconstruction_error?.toFixed(4) || '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin style={{ color: "#16a34a" }} /> Location Details
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
                  {crash.location.address || "Fetching address..."}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
                  Coordinates: {lat.toFixed(6)}, {lon.toFixed(6)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)", border: "1px solid #fecaca" }}>
            <CardContent style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 8, background: "#dc2626", borderRadius: 10 }}>
                  <AlertCircle style={{ color: "#fff", height: 20, width: 20 }} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{crash.severity.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: 14, color: "#991b1b", margin: 0 }}>
                High-intensity impact detected. Immediate response required.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Bus style={{ color: "var(--text-secondary)" }} />
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Bus ID</p>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{crash.bus_id}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Clock style={{ color: "var(--text-secondary)" }} />
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Timestamp</p>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{new Date(crash.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
             <button style={{ 
               width: "100%", padding: "14px", borderRadius: 12, border: "none", 
               background: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer" 
             }}>Confirm Arrival</button>
             <button style={{ 
               width: "100%", padding: "14px", borderRadius: 12, border: "1.5px solid var(--border-light)", 
               background: "var(--bg-surface)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" 
             }}>Request Additional Support</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrashDetailsPage;
