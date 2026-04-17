import { useState, useEffect, useRef } from "react";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Play, Square, AlertTriangle, ShieldCheck, MapPin, Gauge, Users, Clock, Trash2, Crosshair } from "lucide-react";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Risk-based bus icons
const createBusIcon = (riskScore) => {
  let color = "#22c55e"; // green
  if (riskScore > 0.7) color = "#dc2626"; // red
  else if (riskScore > 0.5) color = "#f97316"; // orange
  else if (riskScore > 0.3) color = "#eab308"; // yellow

  return L.divIcon({
    className: "custom-bus-icon",
    html: `<div style="
      background: ${color};
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.9);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 18px;
    ">🚌</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

// Component to handle map clicks for drawing route
const RouteDrawer = ({ routePoints, setRoutePoints, isDrawing }) => {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setRoutePoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
};

const TestRunInterface = () => {
  // State
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState("");
  const [busData, setBusData] = useState(null);
  const [manualOccupancy, setManualOccupancy] = useState("");
  const [isTestActive, setIsTestActive] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [routePoints, setRoutePoints] = useState([]);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]);

  // Audio Context for critical alerts
  const audioContextRef = useRef(null);

  // Poll intervals
  const statusPollRef = useRef(null);
  const warningsPollRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await api.get("/test-run/buses");
        setBuses(res.data);
        if (res.data.length > 0) setSelectedBus(res.data[0].licensePlate);
      } catch (err) {
        console.error("Failed to load buses for test run", err);
      }
    };
    fetchBuses();

    // Initialize Web Audio API on first interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);

    return () => {
      document.removeEventListener('click', initAudio);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      if (warningsPollRef.current) clearInterval(warningsPollRef.current);
    };
  }, []);

  // Play beep sound for critical alerts
  const playCriticalBeep = () => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    osc.type = "square";
    osc.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioContextRef.current.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    osc.start();
    osc.stop(audioContextRef.current.currentTime + 0.3);
  };

  // Start / Stop Test Run
  const toggleTestRun = () => {
    if (!selectedBus) return alert("Select a bus first");

    if (isTestActive) {
      // STOP
      setIsTestActive(false);
      clearInterval(statusPollRef.current);
      clearInterval(warningsPollRef.current);
      setBusData(null);
    } else {
      // START
      setIsTestActive(true);
      fetchBusStatus();
      fetchWarnings();
      statusPollRef.current = setInterval(fetchBusStatus, 1000); // 1s poll rate
      warningsPollRef.current = setInterval(fetchWarnings, 5000); // 5s poll rate for history
    }
  };

  // Fetch Bus Status
  const fetchBusStatus = async () => {
    if (!selectedBus) return;
    try {
      const res = await api.get(`/test-run/status/${selectedBus}`);
      const newData = res.data;
      
      // Check for critical transition
      if (newData.status?.riskScore > 0.7 && (!busData || busData.status?.riskScore <= 0.7)) {
        playCriticalBeep();
      }
      
      setBusData(newData);
      
      // Auto-center map on first GPS fix or if we were far away
      if (newData.status?.gps?.lat && newData.status?.gps?.lon) {
         // Optionally track bus on map (can be annoying if user is panning, so maybe only on first load)
      }
    } catch (err) {
      console.error("Failed to fetch bus status", err);
    }
  };

  // Fetch Warnings
  const fetchWarnings = async () => {
    if (!selectedBus) return;
    try {
      const res = await api.get(`/test-run/warnings/${selectedBus}?minutes=60`);
      setWarnings(res.data.warnings || []);
    } catch (err) {
      console.error("Failed to fetch warnings", err);
    }
  };

  // Set Manual Occupancy
  const handleSetOccupancy = async () => {
    if (!selectedBus) return;
    try {
      const val = manualOccupancy.trim() === "" ? null : parseInt(manualOccupancy);
      await api.post("/test-run/set-occupancy", {
        licensePlate: selectedBus,
        occupancy: val
      });
      alert(val === null ? "Manual override cleared" : `Manual occupancy set to ${val}`);
      fetchBusStatus();
    } catch (err) {
      alert("Failed to set occupancy");
    }
  };

  // UI Helpers
  const getRiskColor = (score) => {
    if (!score) return "#22c55e";
    if (score > 0.7) return "#dc2626";
    if (score > 0.5) return "#f97316";
    if (score > 0.3) return "#eab308";
    return "#22c55e";
  };
  
  const getRiskLabel = (score) => {
    if (!score || score <= 0.3) return "SAFE";
    if (score <= 0.5) return "CAUTION";
    if (score <= 0.7) return "WARNING";
    return "CRITICAL";
  };

  const riskScore = busData?.status?.riskScore || 0;
  const isCritical = riskScore > 0.7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%", position: "relative" }}>
      
      {/* CRITICAL OVERLAY FLASH */}
      {isCritical && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          border: "12px solid #dc2626", pointerEvents: "none", zIndex: 9999,
          animation: "pulse-border 1s infinite"
        }} />
      )}
      <style>
        {`@keyframes pulse-border { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }`}
      </style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Play style={{ color: isTestActive ? "#dc2626" : "#22c55e" }} />
            Research Demonstration: Test Run
          </h2>
          <p style={{ color: "#64748b" }}>Live hardware tracking, route planning, and real-time rollover predictions.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select 
            value={selectedBus} 
            onChange={e => setSelectedBus(e.target.value)}
            disabled={isTestActive}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", minWidth: 150 }}
          >
            {buses.map(b => (
              <option key={b._id} value={b.licensePlate}>{b.licensePlate} (Route: {b.routeId})</option>
            ))}
          </select>
          <Button 
            onClick={toggleTestRun} 
            style={{ 
              background: isTestActive ? "#ef4444" : "#10b981", 
              display: "flex", alignItems: "center", gap: 8 
            }}
          >
            {isTestActive ? <><Square size={16}/> Stop Demo</> : <><Play size={16}/> Start Test Run</>}
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20, flex: 1, minHeight: 600 }}>
        
        {/* LEFT: MAP & ROUTE */}
        <Card style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CardHeader style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={18} /> Test Route Map
              </CardTitle>
              <div style={{ display: "flex", gap: 8 }}>
                <Button 
                  variant={isDrawingRoute ? "primary" : "outline"} 
                  size="sm"
                  onClick={() => setIsDrawingRoute(!isDrawingRoute)}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Crosshair size={14} /> {isDrawingRoute ? "Drawing..." : "Draw Route"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRoutePoints([])}
                  disabled={routePoints.length === 0}
                  style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", borderColor: "#fca5a5" }}
                >
                  <Trash2 size={14} /> Clear Route
                </Button>
              </div>
            </div>
          </CardHeader>
          <div style={{ flex: 1, position: "relative" }}>
            <MapContainer center={mapCenter} zoom={13} style={{ width: "100%", height: "100%" }}>
              <TileLayer
                url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
                subdomains={["mt0", "mt1", "mt2", "mt3"]}
              />
              <RouteDrawer routePoints={routePoints} setRoutePoints={setRoutePoints} isDrawing={isDrawingRoute} />
              
              {/* Drawn Route Polyline */}
              {routePoints.length > 1 && (
                <Polyline positions={routePoints} color="#3b82f6" weight={5} opacity={0.7} />
              )}
              {routePoints.map((pt, i) => (
                <Marker key={i} position={pt} icon={L.divIcon({ className: "custom-div-icon", html: `<div style="background:#3b82f6;width:10px;height:10px;border-radius:50%;border:2px solid white;"></div>`, iconSize:[10,10], iconAnchor:[5,5] })} />
              ))}

              {/* Live Bus Marker */}
              {busData?.status?.gps && busData.status.gps.lat !== 0 && (
                <Marker 
                  position={[busData.status.gps.lat, busData.status.gps.lon]} 
                  icon={createBusIcon(riskScore)}
                >
                  <Popup>
                    <strong>{selectedBus}</strong><br/>
                    Speed: {busData.status.speed} km/h<br/>
                    Risk: {riskScore.toFixed(3)}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
            
            {/* Overlay Info Box */}
            <div style={{ position: "absolute", bottom: 20, left: 20, zIndex: 1000, background: "rgba(255,255,255,0.95)", padding: "12px 16px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", backdropFilter: "blur(4px)", border: "1px solid #e2e8f0" }}>
               <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Telemetry Source</div>
               {busData?.status ? (
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                   <div>
                     <span style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>GPS Data</span>
                     <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                       {busData.status.gpsSource === "esp32_neo6m" ? "✅ ESP32 NEO-6M" : busData.status.gpsSource === "phone" ? "📱 Mobile Phone" : "❌ None"}
                     </span>
                   </div>
                   <div>
                     <span style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>Updates</span>
                     <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Every 1 sec</span>
                   </div>
                 </div>
               ) : (
                 <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>Waiting for telemetry...</div>
               )}
            </div>
          </div>
        </Card>

        {/* RIGHT: DASHBOARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Main Risk Gauge */}
          <Card style={{ background: isCritical ? "#fef2f2" : "#fff", border: isCritical ? "2px solid #ef4444" : "1px solid #e2e8f0", transition: "all 0.3s" }}>
            <CardContent style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Rollover Risk Prediction</div>
              
              <div style={{ fontSize: 48, fontWeight: 800, color: getRiskColor(riskScore), lineHeight: 1 }}>
                {riskScore.toFixed(3)}
              </div>
              
              <div style={{ 
                display: "inline-block", marginTop: 12, padding: "6px 16px", borderRadius: 20, 
                background: getRiskColor(riskScore), color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 1 
              }}>
                {getRiskLabel(riskScore)}
              </div>

              {busData?.status?.distToCurve > 0 && (
                <div style={{ marginTop: 20, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>CURVE AHEAD IN</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                    {busData.status.distToCurve.toFixed(0)} <span style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>meters</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <CardContent style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ pading: 10, background: "#eff6ff", borderRadius: 8, color: "#3b82f6" }}><Gauge size={24}/></div>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Live Speed</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{busData?.status?.speed?.toFixed(1) || "0.0"} <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>km/h</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ pading: 10, background: busData?.status?.footboardStatus ? "#fef2f2" : "#f0fdf4", borderRadius: 8, color: busData?.status?.footboardStatus ? "#ef4444" : "#22c55e" }}>
                  {busData?.status?.footboardStatus ? <AlertTriangle size={24}/> : <ShieldCheck size={24}/>}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Footboard</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: busData?.status?.footboardStatus ? "#ef4444" : "#22c55e" }}>
                    {busData?.status?.footboardStatus ? "VIOLATION" : "CLEAR"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Occupancy Override */}
          <Card>
             <CardHeader style={{ padding: "16px 20px 8px" }}>
               <CardTitle style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Users size={16}/> Passenger Load Simulator</CardTitle>
             </CardHeader>
             <CardContent style={{ padding: "0 20px 20px" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                 <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Current Readings:</span>
                 <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                   {busData?.status?.currentOccupancy || 0} / {busData?.capacity || 55}
                   {busData?.manualOccupancyActive && <span style={{ fontSize: 11, color: "#ef4444", marginLeft: 8, background: "#fef2f2", padding: "2px 6px", borderRadius: 4 }}>OVERRIDE</span>}
                 </span>
               </div>
               <div style={{ display: "flex", gap: 8 }}>
                 <Input 
                   type="number" 
                   placeholder="Manual count" 
                   value={manualOccupancy} 
                   onChange={e => setManualOccupancy(e.target.value)}
                   style={{ flex: 1 }}
                 />
                 <Button onClick={handleSetOccupancy}>Set Override</Button>
               </div>
               <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>If blank, system uses live IR sensor data from ESP32.</p>
             </CardContent>
          </Card>

          {/* Warning Log */}
          <Card style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <CardHeader style={{ padding: "16px 20px 8px" }}>
              <CardTitle style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Clock size={16}/> Warning History</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "0 16px 16px", overflowY: "auto", maxHeight: 300 }}>
              {warnings.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>No critical events recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {warnings.map((w, i) => (
                    <div key={i} style={{ padding: 10, background: w.riskScore > 0.7 ? "#fef2f2" : "#fff7ed", borderLeft: `4px solid ${getRiskColor(w.riskScore)}`, borderRadius: "0 6px 6px 0", fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <strong style={{ color: getRiskColor(w.riskScore) }}>{w.riskLevel} ALERT</strong>
                        <span style={{ color: "#64748b" }}>{new Date(w.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: "#334155" }}>
                        Score: <strong>{w.riskScore.toFixed(3)}</strong> | Speed: {w.speed}km/h | Curve: {w.distToCurve.toFixed(0)}m
                        
                        {/* Show specific violations if they occurred during this log */}
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                           {w.footboard && <span style={{ fontSize: 10, background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: 4 }}>Footboard Violation</span>}
                           {w.occupancy > (busData?.capacity || 55) && <span style={{ fontSize: 10, background: "#f97316", color: "white", padding: "2px 6px", borderRadius: 4 }}>Overcrowded ({w.occupancy}/{busData?.capacity || 55})</span>}
                        </div>
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
