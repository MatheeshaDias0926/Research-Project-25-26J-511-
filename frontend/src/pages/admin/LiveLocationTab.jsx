import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import {
  Cpu,
  MapPin,
  Users,
  Gauge,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  AlertTriangle,
  Shield,
  Navigation,
  Radio,
  Eye,
  EyeOff,
} from "lucide-react";

// ── Leaflet icon fix ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const createDeviceIcon = (isOnline) =>
  L.divIcon({
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42],
    html: `<div style="
      width:42px;height:42px;display:flex;align-items:center;justify-content:center;
      background:${isOnline ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#94a3b8,#64748b)"};
      border-radius:50%;box-shadow:0 3px 12px ${isOnline ? "rgba(16,185,129,0.45)" : "rgba(100,116,139,0.3)"};
      border:3px solid #fff;
      ${isOnline ? "animation:devicePulse 2s infinite;" : ""}
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
      </svg>
    </div>`,
  });

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.flyTo(positions[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

const formatTime = (dateStr) => {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const sectionTitle = {
  fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 0,
};

// ── Stat mini-card ──
const StatMini = ({ icon: Icon, label, value, color, bg }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 18px", borderRadius: "var(--radius-lg)",
    background: bg, border: `1px solid ${color}22`,
    minWidth: 200, flex: 1,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: "var(--radius-md)",
      background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>{label}</p>
    </div>
  </div>
);

// ── Device info card (right panel) ──
const DeviceInfoCard = ({ dev, isSelected, onSelect }) => {
  const loc = dev.bus?.liveLocation;
  const hasLocation = loc?.lat != null && loc?.lon != null;

  return (
    <div
      onClick={() => onSelect(dev)}
      style={{
        padding: "16px 18px", borderRadius: "var(--radius-lg)",
        border: isSelected ? "2px solid var(--color-primary-500)" : "1px solid var(--border-light)",
        background: isSelected ? "var(--color-primary-50)" : "var(--bg-surface)",
        cursor: "pointer", transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 4px 16px rgba(37,99,235,0.12)" : "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: dev.isOnline ? "#10b981" : "#94a3b8",
            boxShadow: dev.isOnline ? "0 0 6px #10b981" : "none",
          }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{dev.bus.licensePlate}</span>
        </div>
        <span style={{
          padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
          background: dev.isOnline ? "#dcfce7" : "#f1f5f9",
          color: dev.isOnline ? "#166534" : "#64748b",
        }}>
          {dev.isOnline ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      {/* Grid info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
        <div style={{ color: "var(--text-muted)" }}>
          <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
          Location
        </div>
        <div style={{ fontWeight: 600, fontSize: 11 }}>
          {loc?.lat != null && loc?.lon != null
            ? `${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`
            : "No GPS"}
        </div>

        <div style={{ color: "var(--text-muted)" }}>
          <Users size={12} style={{ display: "inline", marginRight: 4 }} />
          Passengers
        </div>
        <div style={{ fontWeight: 600 }}>
          {dev.bus.currentOccupancy}/{dev.bus.capacity}
        </div>

        <div style={{ color: "var(--text-muted)" }}>
          <Gauge size={12} style={{ display: "inline", marginRight: 4 }} />
          Speed
        </div>
        <div style={{ fontWeight: 600 }}>{(dev.bus.speed || 0).toFixed(0)} km/h</div>

        <div style={{ color: "var(--text-muted)" }}>
          <User size={12} style={{ display: "inline", marginRight: 4 }} />
          Driver
        </div>
        <div style={{ fontWeight: 600, fontSize: 12 }}>
          {dev.activeSession?.driverName || "—"}
        </div>

        <div style={{ color: "var(--text-muted)" }}>
          <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
          GPS Updated
        </div>
        <div style={{ fontWeight: 600, fontSize: 12 }}>
          {formatTime(loc?.updatedAt || dev.lastPing)}
        </div>
      </div>

      {/* Device tag */}
      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: 10,
          fontWeight: 600, background: "#ede9fe", color: "#6d28d9",
        }}>
          <Cpu size={10} style={{ display: "inline", marginRight: 3 }} />
          {dev.deviceId}
        </span>
        {dev.bus.routeId && (
          <span style={{
            padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: 10,
            fontWeight: 600, background: "#e0f2fe", color: "#0369a1",
          }}>
            {dev.bus.routeId}
          </span>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const LiveLocationTab = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filter, setFilter] = useState("all"); // all | online | offline

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/edge-devices/live-locations");
      setDevices(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch live locations:", err);
      setError("Failed to load live locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = devices.filter((d) => {
    if (filter === "online") return d.isOnline;
    if (filter === "offline") return !d.isOnline;
    return true;
  });

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  const positions = filtered
    .filter((d) => d.isOnline && d.bus?.liveLocation?.lat != null && d.bus?.liveLocation?.lon != null)
    .map((d) => [d.bus.liveLocation.lat, d.bus.liveLocation.lon]);

  const defaultCenter = [7.8731, 80.7718]; // Sri Lanka

  if (loading) {
    return (
      <div style={{
        padding: 64, textAlign: "center", color: "var(--text-muted)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "4px solid var(--border-light)", borderTopColor: "var(--color-primary-500)",
          animation: "spin 1s linear infinite",
        }} />
        Loading live locations...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            padding: 10, borderRadius: "var(--radius-lg)",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Radio size={22} color="#fff" />
          </div>
          <div>
            <h2 style={sectionTitle}>Live Bus Locations</h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Real-time edge device tracking • Auto-refreshes every 10s
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            style={{
              background: "none", border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)", padding: "8px 14px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatMini icon={Cpu} label="Total Devices" value={devices.length} color="#6366f1" bg="#f5f3ff" />
        <StatMini icon={Wifi} label="Online" value={onlineCount} color="#10b981" bg="#ecfdf5" />
        <StatMini icon={WifiOff} label="Offline" value={offlineCount} color="#ef4444" bg="#fef2f2" />
        <StatMini icon={Users} label="Total Passengers" value={devices.reduce((s, d) => s + (d.bus?.currentOccupancy || 0), 0)} color="#0284c7" bg="#f0f9ff" />
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8 }}>
        {["all", "online", "offline"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 18px", borderRadius: "var(--radius-full)",
              border: filter === f ? "2px solid var(--color-primary-500)" : "1px solid var(--border-light)",
              background: filter === f ? "var(--color-primary-50)" : "var(--bg-surface)",
              color: filter === f ? "var(--color-primary-600)" : "var(--text-muted)",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              textTransform: "capitalize", transition: "all 0.15s ease",
            }}
          >
            {f} {f === "all" ? `(${devices.length})` : f === "online" ? `(${onlineCount})` : `(${offlineCount})`}
          </button>
        ))}
      </div>

      {/* Map + Device List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, minHeight: 560 }}>
        {/* Map */}
        <div style={{ borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--border-light)", position: "relative" }}>
          <MapContainer
            center={positions.length > 0 ? positions[0] : defaultCenter}
            zoom={positions.length > 0 ? 13 : 8}
            style={{ height: "100%", width: "100%", minHeight: 560, zIndex: 1 }}
          >
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
            />
            {positions.length > 0 && <FitBounds positions={positions} />}

            {filtered.filter((dev) => dev.isOnline).map((dev) => {
              const loc = dev.bus?.liveLocation;
              if (!loc?.lat || !loc?.lon) return null;
              const icon = createDeviceIcon(true);

              return (
                <Marker key={dev.deviceId} position={[loc.lat, loc.lon]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: 220, fontFamily: "var(--font-sans)" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <Cpu size={16} /> {dev.bus.licensePlate}
                        <span style={{
                          marginLeft: "auto", padding: "2px 8px", borderRadius: 20,
                          fontSize: 10, fontWeight: 700,
                          background: "#dcfce7", color: "#166534",
                        }}>
                          ONLINE
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 5 }}>
                        <span><strong>Device:</strong> {dev.deviceId}</span>
                        <span><strong>Route:</strong> {dev.bus.routeId}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Users size={12} /> {dev.bus.currentOccupancy}/{dev.bus.capacity} passengers
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Navigation size={12} /> {(dev.bus.speed || 0).toFixed(0)} km/h
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={12} /> {loc.lat?.toFixed(5)}, {loc.lon?.toFixed(5)}
                        </span>
                        {dev.activeSession?.driverName && (
                          <span><strong>Driver:</strong> {dev.activeSession.driverName}</span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> {formatTime(dev.lastPing)}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Overlay badge */}
          <div style={{
            position: "absolute", top: 12, right: 12, zIndex: 1000,
            background: "rgba(255,255,255,0.95)", borderRadius: 10,
            padding: "8px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: onlineCount > 0 ? "#10b981" : "#94a3b8" }} />
            {onlineCount} Device{onlineCount !== 1 ? "s" : ""} Online
          </div>
        </div>

        {/* Device List */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          overflowY: "auto", maxHeight: 560, paddingRight: 4,
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: 48, textAlign: "center", color: "var(--text-muted)",
              border: "1px dashed var(--border-light)", borderRadius: "var(--radius-lg)",
            }}>
              <WifiOff size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p>No edge devices {filter !== "all" ? filter : "found"}</p>
            </div>
          ) : (
            filtered.map((dev) => (
              <DeviceInfoCard
                key={dev.deviceId}
                dev={dev}
                isSelected={selectedDevice?.deviceId === dev.deviceId}
                onSelect={setSelectedDevice}
              />
            ))
          )}
        </div>
      </div>

      {/* Selected Device Detail */}
      {selectedDevice && (
        <Card style={{ border: "2px solid var(--color-primary-200)" }}>
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
              <Shield size={20} color="var(--color-primary-500)" />
              {selectedDevice.bus.licensePlate} — Device Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {/* Device Info */}
              <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "#f5f3ff", border: "1px solid #e9e5ff" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", marginBottom: 8 }}>Edge Device</p>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedDevice.deviceId}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{selectedDevice.deviceName}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Type: {selectedDevice.deviceType?.replace(/_/g, " ")}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>FW: v{selectedDevice.firmwareVersion}</p>
              </div>

              {/* Bus & Route */}
              <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", textTransform: "uppercase", marginBottom: 8 }}>Bus & Route</p>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedDevice.bus.licensePlate}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Route: {selectedDevice.bus.routeId}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Capacity: {selectedDevice.bus.capacity}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Status: {selectedDevice.bus.status}</p>
              </div>

              {/* Live Data */}
              <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#059669", textTransform: "uppercase", marginBottom: 8 }}>Live Data</p>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedDevice.bus.currentOccupancy} passengers</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Speed: {(selectedDevice.bus.speed || 0).toFixed(1)} km/h</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Risk Score: {(selectedDevice.bus.riskScore || 0).toFixed(2)}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Last Ping: {formatTime(selectedDevice.lastPing)}</p>
              </div>

              {/* Driver */}
              <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#c2410c", textTransform: "uppercase", marginBottom: 8 }}>Driver</p>
                {selectedDevice.activeSession?.driverName ? (
                  <>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedDevice.activeSession.driverName}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Verified: {selectedDevice.activeSession.verified ? "Yes" : "No"}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Confidence: {(selectedDevice.activeSession.confidence || 0).toFixed(1)}%</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      Alertness: <strong style={{
                        color: selectedDevice.activeSession.alertnessLevel === "ALERT" ? "#059669"
                          : selectedDevice.activeSession.alertnessLevel === "TIRED" ? "#d97706" : "#dc2626",
                      }}>{selectedDevice.activeSession.alertnessLevel || "—"}</strong>
                    </p>
                  </>
                ) : (
                  <p style={{ fontWeight: 500, fontSize: 13, color: "var(--text-muted)" }}>No active driver session</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes devicePulse {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          70% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>
    </div>
  );
};

export default LiveLocationTab;
