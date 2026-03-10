import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import api from "../../api/axios";
import { Bus, MapPin, Navigation, Clock, Eye, EyeOff } from "lucide-react";

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom bus icon using SVG
const createBusIcon = (color = "#2563eb", isStale = false) =>
  L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `<div style="
      width:36px;height:36px;display:flex;align-items:center;justify-content:center;
      background:${isStale ? "#94a3b8" : color};border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid #fff;
      ${isStale ? "" : "animation:pulse 2s infinite;"}
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
        <circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
      </svg>
    </div>`,
  });

// Auto-recenter component
const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.flyTo(positions[0], 15);
    } else {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

/**
 * Reusable bus location map component.
 *
 * Props:
 *  - role: "admin" | "driver" | "conductor" | "passenger"
 *  - onToggleVisibility(busId, visible): callback for admin visibility toggle
 *  - height: CSS height string (default "500px")
 *  - refreshInterval: ms (default 15000)
 */
const BusLocationMap = ({ role = "passenger", onToggleVisibility, height = "500px", refreshInterval = 15000 }) => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get("/bus/locations");
      setBuses(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch bus locations:", err);
      setError("Failed to load bus locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchLocations, refreshInterval]);

  const positions = buses
    .filter((b) => b.liveLocation?.lat && b.liveLocation?.lon)
    .map((b) => [b.liveLocation.lat, b.liveLocation.lon]);

  const defaultCenter = [7.8731, 80.7718]; // Sri Lanka center

  const handleToggle = async (busId, currentVisible) => {
    try {
      await api.patch(`/bus/locations/${busId}/visibility`, { visible: !currentVisible });
      setBuses((prev) =>
        prev.map((b) =>
          b._id === busId ? { ...b, locationVisibleToPassengers: !currentVisible } : b
        )
      );
      if (onToggleVisibility) onToggleVisibility(busId, !currentVisible);
    } catch (err) {
      console.error("Toggle visibility failed:", err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const diff = Math.round((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-muted)", borderRadius: "var(--radius-lg)" }}>
        <span style={{ color: "var(--text-muted)" }}>Loading map...</span>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-light)" }}>
      {/* Map */}
      <div style={{ height, position: "relative" }}>
        <MapContainer
          center={positions.length > 0 ? positions[0] : defaultCenter}
          zoom={positions.length > 0 ? 13 : 8}
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          <TileLayer
            url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
          />
          {positions.length > 0 && <FitBounds positions={positions} />}

          {buses.map((bus) => {
            const loc = bus.liveLocation;
            if (!loc?.lat || !loc?.lon) return null;

            const isStale = loc.isStale;
            const icon = createBusIcon(
              isStale ? "#94a3b8" : "#2563eb",
              isStale
            );

            return (
              <Marker key={bus._id} position={[loc.lat, loc.lon]} icon={icon}>
                <Popup>
                  <div style={{ minWidth: 200, fontFamily: "var(--font-sans)" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Bus size={16} /> {bus.licensePlate}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span><strong>Route:</strong> {bus.routeId}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Navigation size={12} /> {loc.speed?.toFixed(0) || 0} km/h
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} /> {loc.lat?.toFixed(5)}, {loc.lon?.toFixed(5)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {formatTime(loc.updatedAt)}
                        {isStale && <span style={{ color: "#ef4444", fontWeight: 600, marginLeft: 4 }}>STALE</span>}
                      </span>
                      {bus.assignedDriver && (
                        <span><strong>Driver:</strong> {bus.assignedDriver.name}</span>
                      )}
                      {bus.assignedConductor && (
                        <span><strong>Conductor:</strong> {bus.assignedConductor.username}</span>
                      )}
                    </div>

                    {/* Admin visibility toggle */}
                    {(role === "admin" || role === "authority") && (
                      <button
                        onClick={() => handleToggle(bus._id, bus.locationVisibleToPassengers)}
                        style={{
                          marginTop: 10,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          border: "1px solid var(--border-light)",
                          borderRadius: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          justifyContent: "center",
                          background: bus.locationVisibleToPassengers ? "#f0fdf4" : "#fef2f2",
                          color: bus.locationVisibleToPassengers ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {bus.locationVisibleToPassengers ? <Eye size={14} /> : <EyeOff size={14} />}
                        {bus.locationVisibleToPassengers ? "Visible to Passengers" : "Hidden from Passengers"}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Bus count badge */}
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 1000,
          background: "rgba(255,255,255,0.95)", borderRadius: 8,
          padding: "8px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          <Bus size={16} color="#2563eb" />
          {buses.length} {buses.length === 1 ? "Bus" : "Buses"} Live
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px", background: "var(--bg-muted)",
        borderTop: "1px solid var(--border-light)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "var(--text-xs)", color: "var(--text-muted)",
      }}>
        <span>Auto-refreshes every {refreshInterval / 1000}s</span>
        <span>{lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : ""}</span>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
      `}</style>
    </div>
  );
};

export default BusLocationMap;
