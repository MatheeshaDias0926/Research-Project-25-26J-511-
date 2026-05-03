import React, { useEffect, useState, useRef } from 'react';
import { getCrashes, updateCrashStatus, deleteMultipleCrashes } from '../../services/crashService';
import { Card, CardContent } from '../../components/ui/Card';
import { AlertTriangle, Clock, CheckCircle, MapPin, Activity, ChevronDown, Flame, Loader, Check, Ban, Search, Filter, XCircle, Map as MapIcon, Navigation, Locate, Trash2, CheckSquare, Square } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const severityConfig = {
  critical: { bg: "#fee2e2", text: "#dc2626" },
  high: { bg: "#ffedd5", text: "#ea580c" },
  medium: { bg: "#fef9c3", text: "#ca8a04" },
  low: { bg: "#dbeafe", text: "#2563eb" },
};

const statusConfig = {
  active: { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626", label: "Active", icon: Flame },
  in_progress: { bg: "#ffedd5", text: "#ea580c", dot: "#ea580c", label: "In Progress", icon: Loader },
  resolved: { bg: "#dcfce7", text: "#16a34a", dot: "#16a34a", label: "Resolved", icon: Check },
  false_positive: { bg: "#f1f5f9", text: "#64748b", dot: "#64748b", label: "False Positive", icon: Ban },
};

const StatusDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = statusConfig[value] || statusConfig.active;
  const CurrentIcon = current.icon;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 10,
          border: `1.5px solid ${open ? current.text : "var(--border-primary)"}`,
          background: current.bg, cursor: "pointer",
          fontSize: 13, fontWeight: 700, color: current.text,
          outline: "none", transition: "all 0.2s",
          boxShadow: open ? `0 0 0 3px ${current.text}18` : "none",
          minWidth: 150,
        }}
      >
        <CurrentIcon style={{ height: 14, width: 14 }} />
        <span style={{ flex: 1, textAlign: "left" }}>{current.label}</span>
        <ChevronDown style={{ height: 14, width: 14, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "var(--bg-card)", borderRadius: 12,
          border: "1px solid var(--border-primary)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)",
          zIndex: 50, overflow: "hidden",
          animation: "dropdownFadeIn 0.15s ease-out",
          minWidth: 180,
        }}>
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = key === value;
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 14px", border: "none",
                  background: isSelected ? cfg.bg : "transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? cfg.text : "var(--text-body)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-muted)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: isSelected ? `${cfg.text}18` : "var(--bg-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isSelected ? cfg.text : "var(--text-muted)",
                }}>
                  <Icon style={{ height: 14, width: 14 }} />
                </div>
                <span style={{ flex: 1, textAlign: "left" }}>{cfg.label}</span>
                {isSelected && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const filterConfig = {
  all: { label: "All Crashes", icon: Filter, color: "#6366f1" },
  active: { label: "Active", icon: Flame, color: "#dc2626" },
  in_progress: { label: "In Progress", icon: Loader, color: "#ea580c" },
  resolved: { label: "Resolved", icon: Check, color: "#16a34a" },
  false_positive: { label: "False Positive", icon: Ban, color: "#64748b" },
};

// Fix Leaflet Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13);
  }, [center, map]);
  return null;
};

const CrashesPage = () => {
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [addressMap, setAddressMap] = useState({});
  const [policeStations, setPoliceStations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCrashes();
    fetchResponders();
    getUserLocation();
  }, [filter]);

  const fetchResponders = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };
      const [policeRes, hospitalRes] = await Promise.all([
        axios.get("/api/police-stations", config),
        axios.get("/api/hospitals", config)
      ]);
      setPoliceStations(policeRes.data.policeStations || []);
      setHospitals(hospitalRes.data.hospitals || []);
    } catch (err) {
      console.error("Error fetching responders:", err);
    }
  };

  // Reverse Geocoding Helper
  const fetchAddress = async (lat, lon) => {
    try {
      // Nominatim requires a user-agent
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: { 'User-Agent': 'SmartBus-Research-Project' }
      });
      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return "";
    const parts = addr.split(',');
    // Return first 3 parts for a cleaner look (e.g. Street, District, City)
    return parts.slice(0, 3).join(',').trim();
  };

  useEffect(() => {
    if (userLocation && !addressMap['user']) {
      fetchAddress(userLocation.lat, userLocation.lng).then(addr => {
        if (addr) setAddressMap(prev => ({ ...prev, 'user': addr }));
      });
    }
  }, [userLocation]);

  useEffect(() => {
    const fetchMissingAddresses = async () => {
      const newAddresses = { ...addressMap };
      let changed = false;

      for (const crash of crashes) {
        const lat = (crash.location?.lat ?? crash.location?.latitude);
        const lon = (crash.location?.lon ?? crash.location?.longitude);
        const isZero = (!lat || lat === 0) && (!lon || lon === 0);

        if (!isZero && !crash.location?.address && !addressMap[crash._id]) {
          const addr = await fetchAddress(lat, lon);
          if (addr) {
            newAddresses[crash._id] = addr;
            changed = true;
          }
        }
      }

      if (changed) setAddressMap(newAddresses);
    };

    if (crashes.length > 0) {
      fetchMissingAddresses();
    }
  }, [crashes]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const fetchCrashes = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await getCrashes(params);
      setCrashes(data.crashes || []);
    } catch (error) {
      console.error('Failed to fetch crashes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (crashId, newStatus) => {
    try {
      await updateCrashStatus(crashId, { status: newStatus });
      await fetchCrashes();
    } catch (error) {
      console.error('Failed to update crash status:', error);
      alert('Failed to update crash status');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} crash records?`)) return;
    
    setIsDeleting(true);
    try {
      await deleteMultipleCrashes(selectedIds);
      setSelectedIds([]);
      await fetchCrashes();
    } catch (error) {
      console.error('Failed to delete crashes:', error);
      alert('Failed to delete crashes');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = crashes.filter(c =>
    (c.bus_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.location?.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = crashes.filter(c => c.status === 'active').length;
  const inProgressCount = crashes.filter(c => c.status === 'in_progress').length;
  const resolvedCount = crashes.filter(c => c.status === 'resolved').length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border-primary)", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Loading crash data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <style>{`@keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 10, background: "linear-gradient(135deg, #dc2626, #ef4444)", borderRadius: 12 }}>
            <AlertTriangle style={{ height: 24, width: 24, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Crash Management</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>Monitor and manage crash incidents</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 12,
                background: "#fee2e2", color: "#dc2626",
                border: "1px solid #fecaca",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(220,38,38,0.1)"
              }}
            >
              <Trash2 size={18} />
              {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </button>
          )}
          <button 
            onClick={() => setShowMap(!showMap)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 12,
              background: showMap ? "var(--bg-surface)" : "var(--color-primary-600)",
              color: showMap ? "var(--text-primary)" : "#fff",
              border: "1px solid var(--border-light)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: showMap ? "none" : "0 4px 12px rgba(37,99,235,0.2)"
            }}
          >
            {showMap ? <XCircle size={18} /> : <MapIcon size={18} />}
            {showMap ? "Hide Map" : "Show Map View"}
          </button>
        </div>
      </div>

      {showMap && (
        <Card style={{ overflow: "hidden", border: "1px solid var(--border-light)", height: 400, position: "relative" }} className="animate-fade-in">
          <MapContainer 
            center={userLocation ? [userLocation.lat, userLocation.lng] : [7.8731, 80.7718]} 
            zoom={userLocation ? 13 : 8} 
            style={{ height: "100%", width: "100%", zIndex: 1 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {userLocation && <RecenterMap center={[userLocation.lat, userLocation.lng]} />}
            
            {/* User Marker */}
            {userLocation && (
              <Marker 
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59,130,246,0.6); position: relative;">
                          <div style="position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px; border-radius: 50%; border: 2px solid #3b82f6; animation: pulse 2s infinite;"></div>
                        </div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                })}
              >
                <Popup>
                  <div style={{ fontWeight: 600 }}>Your Location (Laptop)</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Used for calculating proximity</div>
                </Popup>
              </Marker>
            )}

            {/* Crash Markers */}
            {crashes.map(crash => {
              const lat = (crash.location?.lat ?? crash.location?.latitude);
              const lon = (crash.location?.lon ?? crash.location?.longitude);
              
              // FALLBACK: If 0,0, use user location if available
              const displayLat = lat;
              const displayLon = lon;

              if (!displayLat || !displayLon) return null;

              const sev = severityConfig[crash.severity] || severityConfig.medium;
              
              return (
                <Marker 
                  key={crash._id} 
                  position={[displayLat, displayLon]}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${sev.text}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                          </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                  })}
                >
                  <Popup>
                    <div style={{ minWidth: 180, fontFamily: "var(--font-sans)" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: sev.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={16} /> {crash.severity?.toUpperCase()} CRASH
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>
                        <strong>Bus:</strong> {crash.bus_id || crash.busId}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {new Date(crash.timestamp).toLocaleString()}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {(!lat && !lon) ? "Location unknown" : "Actual GPS location"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Activity size={12} /> {crash.max_acceleration?.toFixed(2) || 0} m/s²</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          
          <div style={{ 
            position: "absolute", bottom: 12, left: 12, zIndex: 1000, 
            background: "rgba(255,255,255,0.9)", padding: "6px 12px", 
            borderRadius: 8, fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
            border: "1px solid var(--border-light)", backdropFilter: "blur(4px)"
          }}>
            {userLocation ? "📍 Device Location Active" : "📡 Detecting Location..."}
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {[
          { label: "Total Crashes", value: crashes.length, color: "#6366f1", bgGrad: "linear-gradient(135deg, #eef2ff, #e0e7ff)", borderColor: "#c7d2fe", icon: AlertTriangle, iconBg: "#6366f1" },
          { label: "Active", value: activeCount, color: "#dc2626", bgGrad: "linear-gradient(135deg, #fef2f2, #fee2e2)", borderColor: "#fecaca", icon: Flame, iconBg: "#dc2626" },
          { label: "In Progress", value: inProgressCount, color: "#ea580c", bgGrad: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderColor: "#fed7aa", icon: Clock, iconBg: "#ea580c" },
          { label: "Resolved", value: resolvedCount, color: "#16a34a", bgGrad: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderColor: "#bbf7d0", icon: CheckCircle, iconBg: "#16a34a" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} style={{ background: s.bgGrad, border: `1px solid ${s.borderColor}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
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

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(filterConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                border: isActive ? `1.5px solid ${cfg.color}` : "1.5px solid var(--border-primary)",
                background: isActive ? `${cfg.color}12` : "var(--bg-card)",
                color: isActive ? cfg.color : "var(--text-secondary)",
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.color = cfg.color; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
            >
              <Icon style={{ height: 14, width: 14 }} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Search + Table */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {filter === 'all' ? 'All Crashes' : filterConfig[filter]?.label || 'Crashes'}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{filtered.length} records</span>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 16, width: 16, color: "var(--text-muted)" }} />
              <input
                type="text" placeholder="Search by bus ID..." value={search} onChange={e => setSearch(e.target.value)}
                style={{
                  width: 240, padding: "10px 14px", paddingLeft: 36, borderRadius: 10,
                  border: "1.5px solid var(--border-primary)", fontSize: 14,
                  color: "var(--text-primary)", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                  background: "var(--bg-card)", boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "#dc2626"; e.target.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border-primary)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>
        </div>
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <button 
                      onClick={toggleSelectAll}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex", alignItems: "center" }}
                    >
                      {selectedIds.length === filtered.length && filtered.length > 0 ? <CheckSquare size={20} color="#dc2626" /> : <Square size={20} />}
                    </button>
                  </th>
                  {["Bus ID", "Timestamp", "Location", "Severity", "Status", "Acceleration", "Actions"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((crash) => {
                  const sev = severityConfig[crash.severity] || severityConfig.medium;
                  const stat = statusConfig[crash.status] || statusConfig.active;
                  const isActive = crash.status === "active";
                  return (
                    <tr key={crash._id} data-active={isActive ? "true" : undefined} style={{ background: selectedIds.includes(crash._id) ? "var(--bg-muted)" : "inherit" }}>
                      <td>
                        <button 
                          onClick={() => toggleSelect(crash._id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: selectedIds.includes(crash._id) ? "#dc2626" : "var(--text-muted)", padding: 0, display: "flex", alignItems: "center" }}
                        >
                          {selectedIds.includes(crash._id) ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: isActive ? "linear-gradient(135deg, #fef2f2, #fee2e2)" : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <AlertTriangle style={{ height: 16, width: 16, color: isActive ? "#dc2626" : "#64748b" }} />
                          </div>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{crash.bus_id || crash.busId || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <Clock style={{ height: 14, width: 14, flexShrink: 0 }} />
                          {new Date(crash.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", maxWidth: 250 }}>
                          <MapPin style={{ height: 14, width: 14, flexShrink: 0, color: "#3b82f6" }} />
                          <span style={{ 
                            fontSize: 13, 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            fontWeight: 500
                          }}>
                            {(() => {
                              const lat = (crash.location?.lat ?? crash.location?.latitude);
                              const lon = (crash.location?.lon ?? crash.location?.longitude);
                              
                              if (!lat && !lon) {
                                return "📍 Location unknown";
                              }
                              
                              return crash.location?.address || formatAddress(addressMap[crash._id]) || (lat ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '—');
                            })()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: sev.bg, color: sev.text, letterSpacing: "0.03em",
                        }}>
                          {crash.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isActive && (
                            <span style={{
                              width: 8, height: 8, borderRadius: "50%", background: stat.dot,
                              boxShadow: `0 0 0 3px ${stat.dot}30`,
                              animation: "pulse 1.5s ease-in-out infinite",
                            }} />
                          )}
                          <span style={{
                            padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: stat.bg, color: stat.text, letterSpacing: "0.03em",
                          }}>
                            {crash.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <Activity style={{ height: 14, width: 14, flexShrink: 0 }} />
                          {crash.max_acceleration?.toFixed(2) || '—'} m/s²
                        </div>
                      </td>
                      <td>
                        <StatusDropdown
                          value={crash.status}
                          onChange={(newStatus) => handleStatusChange(crash._id, newStatus)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: "center" }}>
                      <AlertTriangle style={{ height: 40, width: 40, color: "var(--border-primary)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>{search ? 'No crashes match your search' : 'No crashes found'}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Crashes will appear here when detected by the system</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrashesPage;
