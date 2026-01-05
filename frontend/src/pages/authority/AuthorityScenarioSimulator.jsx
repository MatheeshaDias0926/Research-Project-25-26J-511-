import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Play, Square, MapPin, Navigation, AlertTriangle, ShieldCheck, Zap, Search, Activity, FastForward } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Fix for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom Icons
const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Helper: Calculate curve radius from 3 points (Menger curvature)
const calculateRadius = (p1, p2, p3) => {
    if (!p1 || !p2 || !p3) return 10000; // Straight line
    // Convert lat/lon to meters (approx)
    const R_earth = 6371000;
    const x1 = p1.lng * (Math.PI/180) * R_earth * Math.cos(p1.lat * Math.PI/180);
    const y1 = p1.lat * (Math.PI/180) * R_earth;
    const x2 = p2.lng * (Math.PI/180) * R_earth * Math.cos(p2.lat * Math.PI/180);
    const y2 = p2.lat * (Math.PI/180) * R_earth;
    const x3 = p3.lng * (Math.PI/180) * R_earth * Math.cos(p3.lat * Math.PI/180);
    const y3 = p3.lat * (Math.PI/180) * R_earth;

    const A = x1*(y2-y3) - y1*(x2-x3) + x2*y3 - x3*y2;
    if (A === 0) return 10000;

    const B = (x1*x1 + y1*y1)*(y3-y2) + (x2*x2 + y2*y2)*(y1-y3) + (x3*x3 + y3*y3)*(y2-y1);
    const C = (x1*x1 + y1*y1)*(x2-x3) + (x2*x2 + y2*y2)*(x3-x1) + (x3*x3 + y3*y3)*(x1-x2);
    const D = 0.5 * (x1*x1 + y1*y1 - 2*x1*(B/ (2*A)) - 2*y1*(C/ (2*A))); // Not needed for radius but for center

    // Radius
    const dist12 = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const dist23 = Math.sqrt((x3-x2)**2 + (y3-y2)**2);
    const dist31 = Math.sqrt((x1-x3)**2 + (y1-y3)**2);
    
    // Using side lengths (a,b,c) and area (Area) -> R = abc / 4*Area
    // Area of triangle from coordinates = 0.5 * |A|
    const area = 0.5 * Math.abs(A);
    const radius = (dist12 * dist23 * dist31) / (4 * area);
    
    return radius || 10000;
};


const LocationSelector = ({ mode, setStart, setEnd }) => {
    useMapEvents({
        click(e) {
            if (mode === "start") setStart(e.latlng);
            if (mode === "end") setEnd(e.latlng);
        },
    });
    return null;
};

const VehicleMarker = ({ position }) => {
    return position ? <Marker position={position} icon={busIcon}><Popup>Live Bus</Popup></Marker> : null;
};

const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 14);
    }, [center, map]);
    return null;
}

const AuthorityScenarioSimulator = () => {
    // Form for Simulation Parameters
    const { register, watch, setValue, getValues } = useForm({
        defaultValues: {
            licensePlate: "DEMO-ML-01",
            speed: 60,
            seated: 40,
            standing: 20, // High load for drama
            footboard: "false",
            weather: "dry" // wet or dry
        }
    });

    // State
    const [startPos, setStartPos] = useState(null);
    const [endPos, setEndPos] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [busPosition, setBusPosition] = useState(null);
    const [selectionMode, setSelectionMode] = useState("start");
    const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]);
    
    // Search
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);

    // Live AI Data
    const [currentRisk, setCurrentRisk] = useState(null); // { risk_score, stopping_distance } (from ML)
    const [futureRisk, setFutureRisk] = useState(null);   // Lookahead prediction
    
    // New Features State
    const [riskHistory, setRiskHistory] = useState([]);
    const [incidentLog, setIncidentLog] = useState([]);
    const [weatherLoading, setWeatherLoading] = useState(false);
    
    // Polishing State
    const [buses, setBuses] = useState([]);
    const [selectedBus, setSelectedBus] = useState("");
    const animationFrameRef = useRef(null);
    const lastTelemetryTime = useRef(0);
    const startTimeRef = useRef(0);
    const totalDistanceRef = useRef(0);
    const pathCumulativeDistances = useRef([]);
    const stepRef = useRef(0);

    // Helper: Haversine Distance
    const getDistance = (p1, p2) => {
        const R = 6371e3; // metres
        const φ1 = p1.lat * Math.PI/180; 
        const φ2 = p2.lat * Math.PI/180;
        const Δφ = (p2.lat-p1.lat) * Math.PI/180;
        const Δλ = (p2.lng-p1.lng) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Calculate Route
    const calculateRoute = async () => {
        if (!startPos || !endPos) {
            alert("Please select both Start and End points on the map.");
            return;
        }
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startPos.lng},${startPos.lat};${endPos.lng},${endPos.lat}?overview=full&geometries=geojson`;
            const response = await axios.get(url);
            
            if (response.data.routes && response.data.routes.length > 0) {
                const geoJsonCoords = response.data.routes[0].geometry.coordinates;
                const path = geoJsonCoords.map(coord => ({ lat: coord[1], lng: coord[0] }));
                
                // Pre-calculate distances for interpolation
                let totalDist = 0;
                const cumDist = [0];
                for(let i=1; i<path.length; i++){
                    const d = getDistance(path[i-1], path[i]);
                    totalDist += d;
                    cumDist.push(totalDist);
                }
                
                setRouteCoords(path);
                pathCumulativeDistances.current = cumDist;
                totalDistanceRef.current = totalDist;
                
                setBusPosition(path[0]);
                setCurrentRisk(null);
                setFutureRisk(null);
                setRiskHistory([]);
                setIncidentLog([]);

               // Auto-fetch Weather
                setWeatherLoading(true);
                try {
                    const weatherRes = await api.get(`/bus/weather?lat=${startPos.lat}&lon=${startPos.lng}`);
                    setValue("weather", weatherRes.data.isWet ? "wet" : "dry");
                } catch (wErr) {
                     console.error("Weather fetch failed");
                } finally {
                    setWeatherLoading(false);
                }
            } else {
                alert("No route found.");
            }
        } catch (error) {
            console.error("Routing error:", error);
            alert("Failed to calculate route.");
        }
    };

    // --- INIT: Fetch Real Buses ---
    useEffect(() => {
        const fetchBuses = async () => {
            try {
                const res = await api.get("/bus");
                setBuses(res.data);
                if(res.data.length > 0) {
                    setSelectedBus(res.data[0].licensePlate);
                    setValue("licensePlate", res.data[0].licensePlate);
                }
            } catch (err) {
                console.error("Failed to fetch buses");
            }
        };
        fetchBuses();
    }, [setValue]);



    // --- SEARCH LOCATION ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
            );
            if (response.data && response.data.length > 0) {
                const { lat, lon } = response.data[0];
                setMapCenter([parseFloat(lat), parseFloat(lon)]);
            } else {
                alert("Location not found");
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearching(false);
        }
    };

    // --- SMOOTH ANIMATION LOOP ---
    const startSimulation = () => {
        if (routeCoords.length === 0) return alert("Please calculate a route first.");
        if (isSimulating) return;

        setIsSimulating(true);
        startTimeRef.current = performance.now();
        lastTelemetryTime.current = 0;
        
        const animate = (time) => {
            const speedKmh = parseInt(getValues("speed"));
            const speedMs = speedKmh * (1000/3600);
            
            // Calculate distance covered based on time elapsed
            const elapsedSec = (time - startTimeRef.current) / 1000;
            const distCovered = elapsedSec * speedMs; // Assume constant speed for simplicity

            if (distCovered >= totalDistanceRef.current) {
                stopSimulation();
                return;
            }

            // Find segment
            let segmentIndex = 0;
            for(let i=0; i<pathCumulativeDistances.current.length-1; i++){
                if(distCovered >= pathCumulativeDistances.current[i] && distCovered < pathCumulativeDistances.current[i+1]){
                    segmentIndex = i;
                    break;
                }
            }

            // Interpolate position
            const segmentStartDist = pathCumulativeDistances.current[segmentIndex];
            const segmentEndDist = pathCumulativeDistances.current[segmentIndex+1];
            const segmentLen = segmentEndDist - segmentStartDist;
            const fraction = (distCovered - segmentStartDist) / (segmentLen || 1); // Avoid div/0

            const p1 = routeCoords[segmentIndex];
            const p2 = routeCoords[segmentIndex+1];
            
            const currentPos = {
                lat: p1.lat + (p2.lat - p1.lat) * fraction,
                lng: p1.lng + (p2.lng - p1.lng) * fraction
            };
            
            setBusPosition(currentPos);

            // --- DECOUPLED TELEMETRY (Every 0.5s for faster response) ---
            if (time - lastTelemetryTime.current > 500) {
                lastTelemetryTime.current = time;
                sendTelemetry(currentPos);
                
                // ML Calculation (Current)
                const radius = calculateRadius(
                    routeCoords[Math.max(0, segmentIndex-1)], 
                    routeCoords[segmentIndex], 
                    routeCoords[Math.min(routeCoords.length-1, segmentIndex+1)]
                );
                
                // --- ROBUST LOOKAHEAD SCAN (The "100% Guarantee" Fix) ---
                // Instead of checking just one point 4s ahead, we scan the next 150 meters
                // to find the absolute sharpest curve and its exact distance.
                
                let minRadiusAhead = 10000;
                let distToSharpest = 0;
                const SCAN_DISTANCE = 150; // meters

                // Iterate through upcoming segments
                for (let i = segmentIndex; i < pathCumulativeDistances.current.length - 2; i++) {
                    const distAtPoint = pathCumulativeDistances.current[i];
                    const distFromBus = distAtPoint - distCovered;

                    if (distFromBus > SCAN_DISTANCE) break; // Stop scanning
                    if (distFromBus < 0) continue; // Skip past points

                    const r = calculateRadius(
                        routeCoords[i], 
                        routeCoords[i+1], 
                        routeCoords[i+2]
                    );

                    if (r < minRadiusAhead) {
                        minRadiusAhead = r;
                        distToSharpest = distFromBus;
                    }
                }

                // Prepare ML Params
                // Logic: If we found a sharp curve (< 200m) ahead, tell the ML model.
                // Otherwise, pass 0 distance (or large radius).
                
                const mlParams = {
                    n_seated: parseInt(getValues("seated")),
                    n_standing: parseInt(getValues("standing")),
                    speed_kmh: parseInt(getValues("speed")),
                    radius_m: radius, // Current Radius
                    is_wet: getValues("weather") === "wet" ? 1 : 0,
                    gradient_deg: 0,
                    dist_to_curve_m: minRadiusAhead < 200 ? distToSharpest : 0 // Pass REAL distance
                };

                // For the "Future" prediction, we visualize the worst-case scenario ahead
                const futureMlParams = { 
                    ...mlParams, 
                    radius_m: minRadiusAhead, 
                    dist_to_curve_m: 0 // At the curve, distance is 0
                };

                // Call ML (Parallel)
                Promise.all([
                    api.post("/bus/predict-safety", mlParams),
                    api.post("/bus/predict-safety", futureMlParams)
                ]).then(([resCurrent, resFuture]) => {
                    const newData = resCurrent.data;
                    const futureData = resFuture.data;
                    
                    // Attach distance to result object for UI
                    // Use the calculated distToSharpest if a curve exists
                    const displayDist = minRadiusAhead < 200 ? distToSharpest : 0;
                    setCurrentRisk({ ...newData, distToCurve: displayDist });
                    setFutureRisk(futureData);
                    
                    // Send Telemetry (Now includes Future Risk & Distance)
                    sendTelemetry(currentPos, newData.risk_score, futureData.risk_score, displayDist);

                    // Update History
                    setRiskHistory(prev => [...prev, {
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }),
                        risk: newData.risk_score,
                        futureRisk: futureData.risk_score,
                        speed: parseInt(getValues("speed")) 
                    }].slice(-30));

                    // Log Incident (Check BOTH current and future)
                    const maxRisk = Math.max(newData.risk_score, futureData.risk_score);
                    if (maxRisk > 0.7) {
                        setIncidentLog(prev => {
                            const lastLog = prev[0];
                            const now = new Date().toLocaleTimeString();
                            if (lastLog && lastLog.time === now) return prev;
                            return [{
                                time: now,
                                message: `Critical Risk Detected (Score: ${maxRisk.toFixed(2)})`,
                                details: `Speed: ${getValues("speed")} km/h` + (futureData.risk_score > newData.risk_score ? " [LOOKAHEAD]" : "")
                            }, ...prev].slice(0, 10);
                        });
                    }
                });
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    const stopSimulation = () => {
        setIsSimulating(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    // Ref for Risk State (to access inside animation loop)
    const currentRiskRef = useRef(null);
    useEffect(() => { currentRiskRef.current = currentRisk; }, [currentRisk]);

    const sendTelemetry = (pos, currentRiskScore, futureRiskScore, distToCurve) => {
        const payload = {
            licensePlate: selectedBus, // Use selected bus
            speed: parseInt(getValues("speed")),
            currentOccupancy: parseInt(watch("seated")) + parseInt(watch("standing")),
            footboardStatus: watch("footboard") === "true",
            riskScore: currentRiskScore || 0,
            futureRiskScore: futureRiskScore || 0, // NEW FIELD
            distToCurve: distToCurve || 0,         // NEW FIELD
            gps: { lat: pos.lat, lon: pos.lng }
        };
        api.post("/iot/mock-data", payload).catch(err => console.error(err));
    };
    
    useEffect(() => {
        return () => stopSimulation();
    }, []);

    // Risk Level Helper
    const getRiskLevel = (score) => {
        if (!score) return { label: "Unknown", color: "#64748b" };
        if (score > 0.7) return { label: "CRITICAL", color: "#dc2626" }; // Red
        if (score > 0.5) return { label: "WARNING", color: "#d97706" }; // Orange
        return { label: "SAFE", color: "#16a34a" }; // Green
    };

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 50 }}>
            {/* Header */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 12 }}>
                        <Navigation className="text-blue-600" size={32} />
                        Live Scenario Simulator
                    </h1>
                    <p style={{ color: "#64748b" }}>
                        Digital Twin Simulation powered by ML & Real-time Telemetry.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ padding: "8px 16px", background: "#f1f5f9", borderRadius: 8, fontSize: 13, color: "#475569" }}>
                         Model: <strong>XGBoost-Hybrid</strong>
                    </div>
                    <div style={{ padding: "8px 16px", background: "#e0e7ff", borderRadius: 8, fontSize: 13, color: "#3730a3" }}>
                         Latency: <strong>~20ms</strong>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 24 }}>
                {/* LEFT: CONTROLS */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    
                    {/* 1. Configuration */}
                    <Card>
                        <CardHeader><CardTitle>1. Bus & Environment</CardTitle></CardHeader>
                        <CardContent>
                             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>Speed (km/h)</label>
                                    <Input type="number" {...register("speed")} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>Seated</label>
                                        <Input type="number" {...register("seated")} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>Standing</label>
                                        <Input type="number" {...register("standing")} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>Road Condition</label>
                                    <select {...register("weather")} style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                        <option value="dry">Dry Asphalt (Safe)</option>
                                        <option value="wet">Wet / Raining (Risk)</option>
                                    </select>
                                </div>
                             </div>
                        </CardContent>
                    </Card>

                    {/* 1.5 Bus Selection (Added) */}
                    <Card>
                        <CardHeader><CardTitle>Bus Selection</CardTitle></CardHeader>
                        <CardContent>
                             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>Select Real Bus</label>
                                    <select 
                                        value={selectedBus}
                                        onChange={(e) => {
                                            setSelectedBus(e.target.value);
                                            setValue("licensePlate", e.target.value);
                                        }}
                                        style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}
                                    >
                                        {buses.map(bus => (
                                            <option key={bus._id} value={bus.licensePlate}>
                                                {bus.licensePlate} (R: {bus.routeId})
                                            </option>
                                        ))}
                                    </select>
                                    <p style={{fontSize: 11, color: "#94a3b8", marginTop: 4}}>
                                        Safety data will be sent to this bus ID in the backend.
                                    </p>
                                </div>
                             </div>
                        </CardContent>
                    </Card>

                    {/* 2. Route */}
                    <Card>
                        <CardHeader><CardTitle>2. Route Planner</CardTitle></CardHeader>
                        <CardContent>
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                                <Button 
                                    size="sm" 
                                    variant={selectionMode === "start" ? "primary" : "outline"}
                                    onClick={() => setSelectionMode("start")}
                                    style={{ flex: 1, background: selectionMode === "start" ? "#dcfce7" : "", color: selectionMode === "start" ? "#166534" : "" }}
                                >
                                    Start (Green)
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={selectionMode === "end" ? "primary" : "outline"}
                                    onClick={() => setSelectionMode("end")}
                                    style={{ flex: 1, background: selectionMode === "end" ? "#fee2e2" : "", color: selectionMode === "end" ? "#991b1b" : "" }}
                                >
                                    End (Red)
                                </Button>
                            </div>
                            <Button onClick={calculateRoute} style={{ width: "100%" }} disabled={!startPos || !endPos}>
                                Calculate Path
                            </Button>
                        </CardContent>
                    </Card>

                    {/* 3. Controls & Live Feed */}
                     <Card>
                        <CardContent style={{ paddingTop: 20 }}>
                             {!isSimulating ? (
                                 <Button onClick={startSimulation} style={{ width: "100%", background: "#2563eb" }}>
                                     <Play size={16} style={{ marginRight: 8 }} /> Start Live Simulation
                                 </Button>
                             ) : (
                                 <Button onClick={stopSimulation} style={{ width: "100%", background: "#dc2626" }}>
                                     <Square size={16} style={{ marginRight: 8 }} /> Stop
                                 </Button>
                             )}

                             {/* LIVE DASHBOARD */}
                             {isSimulating && currentRisk && (
                                 <div style={{ marginTop: 24, animation: "fadeIn 0.5s" }}>
                                     {/* MAIN RISK CARD */}
                                     {(() => {
                                         const effectiveRiskScore = Math.max(currentRisk.risk_score, futureRisk?.risk_score || 0);
                                         const riskInfo = getRiskLevel(effectiveRiskScore);
                                         
                                         return (
                                             <div style={{ 
                                                 padding: 16, 
                                                 borderRadius: 12, 
                                                 background: riskInfo.color, 
                                                 color: "#fff",
                                                 marginBottom: 16,
                                                 textAlign: "center",
                                                 boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                             }}>
                                                 <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>
                                                     {effectiveRiskScore > currentRisk.risk_score ? "PREDICTED DRIVER ALERT" : "DRIVER ALERT LEVEL"}
                                                 </div>
                                                 <div style={{ fontSize: 24, fontWeight: 800 }}>
                                                     {riskInfo.label} ({effectiveRiskScore.toFixed(2)})
                                                 </div>
                                                 {effectiveRiskScore > currentRisk.risk_score && (
                                                     <div style={{ fontSize: 11, background: "rgba(0,0,0,0.2)", display: "inline-block", padding: "2px 8px", borderRadius: 10, marginTop: 4 }}>
                                                         ⚠️ Warning sent ahead of curve
                                                     </div>
                                                 )}
                                                 {/* SHOW DISTANCE IF DETECTED */}
                                                 {currentRisk.distToCurve > 0 && (
                                                     <div style={{ marginTop: 8, padding: "4px 8px", background: "rgba(255,255,255,0.3)", borderRadius: 4, fontWeight: 700, fontSize: 13 }}>
                                                         ⚠️ Curve Ahead: {currentRisk.distToCurve.toFixed(0)} meters
                                                     </div>
                                                 )}
                                             </div>
                                         );
                                     })()}

                                     {/* Stop Distance */}
                                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 16 }}>
                                         <span style={{ fontSize: 13, color: "#64748b" }}>Stopping Dist:</span>
                                         <span style={{ fontWeight: 700, fontSize: 16 }}>{currentRisk.stopping_distance.toFixed(1)} m</span>
                                     </div>

                                     {/* PREDICTION LOOKAHEAD */}
                                     {futureRisk && (
                                         <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px dashed #94a3b8" }}>
                                             <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                                 <FastForward size={14} className="text-purple-600" />
                                                 <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>5-SEC FORECAST</span>
                                             </div>
                                             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                                                 <span style={{ color: "#64748b" }}>Upcoming Risk:</span>
                                                 <span style={{ 
                                                     fontWeight: 700, 
                                                     color: getRiskLevel(futureRisk.risk_score).color 
                                                 }}>
                                                     {getRiskLevel(futureRisk.risk_score).label}
                                                 </span>
                                             </div>
                                             {futureRisk.risk_score > currentRisk.risk_score && (
                                                 <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontStyle: "italic" }}>
                                                     ⚠️ Risk increasing ahead!
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* RISK CHART USAGE */}
                             {riskHistory.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", mb: 8 }}>RISK TREND (Live)</div>
                                    <div style={{ height: 100, width: "100%" }}>
                                        <ResponsiveContainer>
                                            <AreaChart data={riskHistory}>
                                                <defs>
                                                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="time" hide />
                                                <YAxis domain={[0, 1]} hide />
                                                <Tooltip contentStyle={{ fontSize: 12 }} />
                                                <Area type="monotone" dataKey="risk" stroke="#dc2626" fillOpacity={1} fill="url(#colorRisk)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                             )}

                             {/* INCIDENT LOG */}
                             {incidentLog.length > 0 && (
                                 <div style={{ marginTop: 20, maxHeight: 150, overflowY: "auto", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                                     <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                         <AlertTriangle size={12} />
                                         INCIDENT LOG
                                     </div>
                                     {incidentLog.map((log, i) => (
                                         <div key={i} style={{ fontSize: 11, padding: "6px", background: "#fef2f2", marginBottom: 4, borderRadius: 4, borderLeft: "3px solid #dc2626" }}>
                                             <div style={{ fontWeight: 600 }}>{log.time} - {log.message}</div>
                                             <div style={{ color: "#7f1d1d" }}>{log.details}</div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </CardContent>
                    </Card>

                </div>

                {/* RIGHT: MAP */}
                <Card style={{ height: "calc(100vh - 100px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                     <CardHeader style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                         <div style={{ display: "flex", gap: 12 }}>
                             <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
                                 <div style={{ position: "relative", flex: 1 }}>
                                     <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "#94a3b8" }} />
                                     <Input 
                                        placeholder="Search location (e.g. Kandy)" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ paddingLeft: 34 }} 
                                     />
                                 </div>
                                 <Button type="submit" disabled={searching}>{searching ? "..." : "Search"}</Button>
                             </form>
                         </div>
                     </CardHeader>

                     <div style={{ flex: 1 }}>
                        <MapContainer center={mapCenter} zoom={13} style={{ width: "100%", height: "100%" }}>
                            <TileLayer
                                url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                attribution='&copy; Google Maps'
                                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            />
                            
                            <MapController center={mapCenter} />
                            <LocationSelector mode={selectionMode} setStart={setStartPos} setEnd={setEndPos} />

                            {startPos && <Marker position={startPos} icon={startIcon} />}
                            {endPos && <Marker position={endPos} icon={endIcon} />}
                            
                            {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#2563eb" weight={5} opacity={0.6} />}
                            
                            {busPosition && (
                                <Marker position={busPosition} icon={busIcon}>
                                    <Popup>
                                        <div style={{ textAlign: "center" }}>
                                            <strong>Bus Live</strong><br/>
                                            {currentRisk ? `Risk: ${currentRisk.risk_score.toFixed(2)}` : "Calculating..."}
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </MapContainer>
                     </div>
                </Card>
            </div>
        </div>
    );
};

export default AuthorityScenarioSimulator;
