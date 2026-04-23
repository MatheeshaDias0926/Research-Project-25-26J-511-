import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../api/axios";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import {
  Play, Square, AlertTriangle, ShieldCheck, MapPin, Gauge, Users, Clock,
  Trash2, Navigation, Route, Satellite, Smartphone, Zap,
} from "lucide-react";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const createBusIcon = (riskScore) => {
  let color = "#22c55e";
  if (riskScore > 0.7) color = "#dc2626";
  else if (riskScore > 0.5) color = "#f97316";
  else if (riskScore > 0.3) color = "#eab308";
  return L.divIcon({
    className: "custom-bus-icon",
    html: `<div style="background:${color};width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.35);font-size:20px;">🚌</div>`,
    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22],
  });
};

const createPointIcon = (color, label) => L.divIcon({
  className: "custom-point-icon",
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;font-weight:800;color:white;">${label}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

// Auto-follow bus on map
const MapController = ({ busPos, shouldFollow }) => {
  const map = useMap();
  useEffect(() => {
    if (shouldFollow && busPos) map.panTo(busPos, { animate: true, duration: 0.5 });
  }, [busPos, shouldFollow]);
  return null;
};

// Click handler for route start/end points
const RouteClickHandler = ({ onMapClick, isSettingPoint }) => {
  useMapEvents({
    click(e) {
      if (isSettingPoint) onMapClick(e.latlng);
    },
  });
  return null;
};

const TestRunInterface = () => {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState("");
  const [busData, setBusData] = useState(null);
  const [manualOccupancy, setManualOccupancy] = useState("");
  const [speedMultiplier, setSpeedMultiplierInput] = useState("");
  const [isTestActive, setIsTestActive] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [followBus, setFollowBus] = useState(true);

  // Route drawing
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [settingPoint, setSettingPoint] = useState(null); // "start" | "end" | null
  const [routeLoading, setRouteLoading] = useState(false);

  // Bus trail
  const [busTrail, setBusTrail] = useState([]);

  const audioContextRef = useRef(null);
  const statusPollRef = useRef(null);
  const warningsPollRef = useRef(null);
  const prevRiskRef = useRef(0);

  // Fetch buses
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await api.get("/test-run/buses");
        setBuses(res.data);
        if (res.data.length > 0) setSelectedBus(res.data[0].licensePlate);
      } catch (err) { console.error("Failed to load buses", err); }
    };
    fetchBuses();
    const initAudio = () => {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      document.removeEventListener("click", initAudio);
    };
    document.addEventListener("click", initAudio);
    return () => {
      document.removeEventListener("click", initAudio);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      if (warningsPollRef.current) clearInterval(warningsPollRef.current);
    };
  }, []);

  const playCriticalBeep = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  };

  const fetchBusStatus = useCallback(async () => {
    if (!selectedBus) return;
    try {
      const res = await api.get(`/test-run/status/${selectedBus}`);
      const newData = res.data;
      if (newData.status?.riskScore > 0.7 && prevRiskRef.current <= 0.7) playCriticalBeep();
      prevRiskRef.current = newData.status?.riskScore || 0;
      setBusData(newData);
      // Add to trail
      if (newData.status?.gps?.lat && newData.status.gps.lat !== 0) {
        setBusTrail(prev => {
          const last = prev[prev.length - 1];
          const newPt = [newData.status.gps.lat, newData.status.gps.lon];
          if (last && last[0] === newPt[0] && last[1] === newPt[1]) return prev;
          return [...prev.slice(-500), newPt]; // Keep last 500 points
        });
      }
    } catch (err) { console.error("Status fetch failed", err); }
  }, [selectedBus]);

  const fetchWarnings = useCallback(async () => {
    if (!selectedBus) return;
    try {
      const res = await api.get(`/test-run/warnings/${selectedBus}?minutes=60`);
      setWarnings(res.data.warnings || []);
    } catch (err) { console.error("Warnings fetch failed", err); }
  }, [selectedBus]);

  const toggleTestRun = () => {
    if (!selectedBus) return alert("Select a bus first");
    if (isTestActive) {
      setIsTestActive(false);
      clearInterval(statusPollRef.current);
      clearInterval(warningsPollRef.current);
      setBusData(null);
      setBusTrail([]);
    } else {
      setIsTestActive(true);
      setBusTrail([]);
      fetchBusStatus();
      fetchWarnings();
      statusPollRef.current = setInterval(fetchBusStatus, 1000);
      warningsPollRef.current = setInterval(fetchWarnings, 5000);
    }
  };

  // OSRM route fetching
  const fetchRoute = async (start, end) => {
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await axios.get(url);
      if (res.data.routes && res.data.routes.length > 0) {
        const coords = res.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        setRoutePath(coords);
      }
    } catch (err) {
      console.error("OSRM route fetch failed", err);
      alert("Failed to fetch route. Try again.");
    } finally { setRouteLoading(false); }
  };

  const handleMapClick = (latlng) => {
    if (settingPoint === "start") {
      setRouteStart(latlng);
      setSettingPoint(null);
      if (routeEnd) fetchRoute(latlng, routeEnd);
    } else if (settingPoint === "end") {
      setRouteEnd(latlng);
      setSettingPoint(null);
      if (routeStart) fetchRoute(routeStart, latlng);
    }
  };

  const clearRoute = () => {
    setRouteStart(null); setRouteEnd(null); setRoutePath([]); setSettingPoint(null);
  };

  const handleSetOccupancy = async () => {
    if (!selectedBus) return;
    try {
      const val = manualOccupancy.trim() === "" ? null : parseInt(manualOccupancy);
      await api.post("/test-run/set-occupancy", { licensePlate: selectedBus, occupancy: val });
      fetchBusStatus();
    } catch (err) { alert("Failed to set occupancy"); }
  };

  const handleSetSpeedMultiplier = async () => {
    if (!selectedBus) return;
    try {
      const val = speedMultiplier.trim() === "" ? null : parseFloat(speedMultiplier);
      await api.post("/test-run/set-speed-multiplier", { licensePlate: selectedBus, multiplier: val });
      fetchBusStatus();
    } catch (err) { alert("Failed to set speed multiplier"); }
  };

  const getRiskColor = (s) => { if (!s) return "#22c55e"; if (s > 0.7) return "#dc2626"; if (s > 0.5) return "#f97316"; if (s > 0.3) return "#eab308"; return "#22c55e"; };
  const getRiskLabel = (s) => { if (!s || s <= 0.3) return "SAFE"; if (s <= 0.5) return "CAUTION"; if (s <= 0.7) return "WARNING"; return "CRITICAL"; };

  const riskScore = busData?.status?.riskScore || 0;
  const isCritical = riskScore > 0.7;
  const busPos = busData?.status?.gps?.lat && busData.status.gps.lat !== 0
    ? [busData.status.gps.lat, busData.status.gps.lon] : null;
  const gpsSource = busData?.status?.gpsSource || "none";

  const getGpsSourceDisplay = () => {
    if (gpsSource === "esp32_neo6m" || gpsSource === "esp32") return { icon: "🛰️", label: "ESP32 GPS", color: "#22c55e" };
    if (gpsSource === "phone") return { icon: "📱", label: "Overland GPS", color: "#3b82f6" };
    return { icon: "❌", label: "No GPS", color: "#94a3b8" };
  };

  const gpsInfo = getGpsSourceDisplay();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", position: "relative" }}>
      {isCritical && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, border: "12px solid #dc2626", pointerEvents: "none", zIndex: 9999, animation: "pulse-border 1s infinite" }} />
      )}
      <style>{`@keyframes pulse-border { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Play style={{ color: isTestActive ? "#dc2626" : "#22c55e" }} />
            Research Demonstration: Test Run
          </h2>
          <p style={{ color: "#64748b", fontSize: 13 }}>Live GPS tracking via Overland, route planning, real-time rollover predictions</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={selectedBus} onChange={e => setSelectedBus(e.target.value)} disabled={isTestActive}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", minWidth: 150 }}>
            {buses.map(b => <option key={b._id} value={b.licensePlate}>{b.licensePlate} (Route: {b.routeId})</option>)}
          </select>
          <Button onClick={toggleTestRun} style={{ background: isTestActive ? "#ef4444" : "#10b981", display: "flex", alignItems: "center", gap: 8 }}>
            {isTestActive ? <><Square size={16}/> Stop</> : <><Play size={16}/> Start Test Run</>}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, flex: 1, minHeight: 550 }}>

        {/* LEFT: MAP */}
        <Card style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CardHeader style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <CardTitle style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} /> Live Map
              </CardTitle>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Button variant={settingPoint === "start" ? "primary" : "outline"} size="sm"
                  onClick={() => setSettingPoint(settingPoint === "start" ? null : "start")}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <Navigation size={12} /> {settingPoint === "start" ? "Click map..." : "Set Start"}
                </Button>
                <Button variant={settingPoint === "end" ? "primary" : "outline"} size="sm"
                  onClick={() => setSettingPoint(settingPoint === "end" ? null : "end")}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <Route size={12} /> {settingPoint === "end" ? "Click map..." : "Set End"}
                </Button>
                <Button variant="outline" size="sm" onClick={clearRoute} disabled={!routeStart && !routeEnd}
                  style={{ display: "flex", alignItems: "center", gap: 4, color: "#ef4444", borderColor: "#fca5a5", fontSize: 12 }}>
                  <Trash2 size={12} /> Clear
                </Button>
                <Button variant={followBus ? "primary" : "outline"} size="sm" onClick={() => setFollowBus(!followBus)}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <Satellite size={12} /> {followBus ? "Following" : "Follow"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <div style={{ flex: 1, position: "relative" }}>
            <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ width: "100%", height: "100%" }}>
              <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" subdomains={["mt0", "mt1", "mt2", "mt3"]} />
              <MapController busPos={busPos} shouldFollow={followBus && isTestActive} />
              <RouteClickHandler onMapClick={handleMapClick} isSettingPoint={!!settingPoint} />

              {/* Route polyline */}
              {routePath.length > 1 && <Polyline positions={routePath} color="#3b82f6" weight={5} opacity={0.7} dashArray="10 6" />}

              {/* Start/End markers */}
              {routeStart && <Marker position={routeStart} icon={createPointIcon("#22c55e", "S")}><Popup>Start Point</Popup></Marker>}
              {routeEnd && <Marker position={routeEnd} icon={createPointIcon("#ef4444", "E")}><Popup>End Point</Popup></Marker>}

              {/* Bus trail */}
              {busTrail.length > 1 && <Polyline positions={busTrail} color="#8b5cf6" weight={3} opacity={0.6} />}

              {/* Live Bus Marker */}
              {busPos && (
                <Marker position={busPos} icon={createBusIcon(riskScore)}>
                  <Popup>
                    <strong>{selectedBus}</strong><br/>
                    Speed: {busData?.status?.speed?.toFixed(1) || 0} km/h<br/>
                    Risk: {riskScore.toFixed(3)}<br/>
                    Source: {gpsInfo.label}
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Route loading overlay */}
            {routeLoading && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1000,
                background: "rgba(255,255,255,0.9)", padding: "12px 24px", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                fontSize: 14, fontWeight: 600, color: "#3b82f6" }}>
                Drawing route...
              </div>
            )}

            {/* Telemetry overlay */}
            <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 1000, background: "rgba(255,255,255,0.95)",
              padding: "10px 14px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", maxWidth: 280 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>Telemetry</div>
              {busData?.status ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{gpsInfo.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: gpsInfo.color }}>{gpsInfo.label}</span>
                  </div>
                  {busPos && (
                    <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                      {busPos[0].toFixed(5)}, {busPos[1].toFixed(5)}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Polling: 1s | Trail: {busTrail.length} pts</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Waiting for data...</div>
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT: DASHBOARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

          {/* Risk Gauge */}
          <Card style={{ background: isCritical ? "#fef2f2" : "#fff", border: isCritical ? "2px solid #ef4444" : "1px solid #e2e8f0", transition: "all 0.3s" }}>
            <CardContent style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Rollover Risk</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: getRiskColor(riskScore), lineHeight: 1 }}>{riskScore.toFixed(3)}</div>
              <div style={{ display: "inline-block", marginTop: 10, padding: "5px 14px", borderRadius: 20, background: getRiskColor(riskScore), color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
                {getRiskLabel(riskScore)}
              </div>
              {busData?.status?.distToCurve > 0 && (
                <div style={{ marginTop: 14, padding: 10, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>CURVE AHEAD</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    {busData.status.distToCurve.toFixed(0)} <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>m</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Card>
              <CardContent style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: "#eff6ff", borderRadius: 8, color: "#3b82f6" }}><Gauge size={20}/></div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Speed</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{busData?.status?.speed?.toFixed(1) || "0.0"} <span style={{ fontSize: 11, color: "#94a3b8" }}>km/h</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: busData?.status?.footboardStatus ? "#fef2f2" : "#f0fdf4", borderRadius: 8, color: busData?.status?.footboardStatus ? "#ef4444" : "#22c55e" }}>
                  {busData?.status?.footboardStatus ? <AlertTriangle size={20}/> : <ShieldCheck size={20}/>}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Footboard</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: busData?.status?.footboardStatus ? "#ef4444" : "#22c55e" }}>
                    {busData?.status?.footboardStatus ? "VIOLATION" : "CLEAR"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Occupancy Override */}
          <Card>
            <CardHeader style={{ padding: "12px 16px 6px" }}>
              <CardTitle style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Users size={14}/> Passenger Load</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "0 16px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "6px 10px", background: "#f8fafc", borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Current:</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  {busData?.status?.currentOccupancy || 0} / {busData?.capacity || 55}
                  {busData?.manualOccupancyActive && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 6, background: "#fef2f2", padding: "1px 5px", borderRadius: 3 }}>OVERRIDE</span>}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Input type="number" placeholder="Manual count" value={manualOccupancy} onChange={e => setManualOccupancy(e.target.value)} style={{ flex: 1 }} />
                <Button onClick={handleSetOccupancy} size="sm">Set</Button>
              </div>
            </CardContent>
          </Card>

          {/* Speed Multiplier */}
          <Card style={{ border: busData?.speedMultiplierActive ? "2px solid #f97316" : "1px solid #e2e8f0" }}>
            <CardHeader style={{ padding: "12px 16px 6px" }}>
              <CardTitle style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={14} /> Speed Multiplier
                {busData?.speedMultiplierActive && <span style={{ fontSize: 10, color: "#f97316", background: "#fff7ed", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>{busData.speedMultiplier}×</span>}
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "0 16px 14px" }}>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Amplify GPS speed for ML model. Drive at 30 km/h with 2× = ML sees 60 km/h.</p>
              <div style={{ display: "flex", gap: 6 }}>
                <select value={speedMultiplier} onChange={e => setSpeedMultiplierInput(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
                  <option value="">Off (1×)</option>
                  <option value="1.5">1.5× Speed</option>
                  <option value="2">2× Speed</option>
                  <option value="3">3× Speed</option>
                  <option value="4">4× Speed</option>
                </select>
                <Button onClick={handleSetSpeedMultiplier} size="sm">Apply</Button>
              </div>
            </CardContent>
          </Card>

          {/* GPS Source Card */}
          <Card>
            <CardContent style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ padding: 8, background: gpsSource === "phone" ? "#eff6ff" : gpsSource.includes("esp32") ? "#f0fdf4" : "#f1f5f9", borderRadius: 8 }}>
                  {gpsSource === "phone" ? <Smartphone size={20} color="#3b82f6" /> : <Satellite size={20} color={gpsSource.includes("esp32") ? "#22c55e" : "#94a3b8"} />}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>GPS Source</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: gpsInfo.color }}>{gpsInfo.icon} {gpsInfo.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Log */}
          <Card style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <CardHeader style={{ padding: "12px 16px 6px" }}>
              <CardTitle style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Clock size={14}/> Warning History ({warnings.length})</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "0 12px 12px", overflowY: "auto", maxHeight: 260 }}>
              {warnings.length === 0 ? (
                <div style={{ textAlign: "center", padding: 16, color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>No critical events yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ padding: 8, background: w.riskScore > 0.7 ? "#fef2f2" : "#fff7ed", borderLeft: `3px solid ${getRiskColor(w.riskScore)}`, borderRadius: "0 6px 6px 0", fontSize: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <strong style={{ color: getRiskColor(w.riskScore) }}>{w.riskLevel}</strong>
                        <span style={{ color: "#64748b" }}>{new Date(w.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: "#334155" }}>
                        Risk: <strong>{w.riskScore.toFixed(3)}</strong> | {w.speed}km/h | Curve: {w.distToCurve?.toFixed(0) || 0}m
                      </div>
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {w.footboard && <span style={{ fontSize: 9, background: "#ef4444", color: "white", padding: "1px 5px", borderRadius: 3 }}>Footboard</span>}
                        {w.occupancy > (busData?.capacity || 55) && <span style={{ fontSize: 9, background: "#f97316", color: "white", padding: "1px 5px", borderRadius: 3 }}>Overcrowded</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestRunInterface;
