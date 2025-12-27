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
    const { register, watch } = useForm({
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
    
    // Refs
    const simulationRef = useRef(null);
    const stepRef = useRef(0);

    // Fetch Route from OSRM
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
                setRouteCoords(path);
                setBusPosition(path[0]);
                stepRef.current = 0;
                setCurrentRisk(null);
                setFutureRisk(null);
            } else {
                alert("No route found.");
            }
        } catch (error) {
            console.error("Routing error:", error);
            alert("Failed to calculate route.");
        }
    };

    // --- INIT: ensure bus exists ---
    useEffect(() => {
        const checkAndCreateBus = async () => {
            const plate = "DEMO-ML-01";
            try {
                await api.get(`/bus/plate/${plate}`);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log("Demo bus not found. Creating...");
                    try {
                        await api.post("/bus", {
                            licensePlate: plate,
                            routeId: "DEMO_ROUTE",
                            capacity: 60
                        });
                        console.log("Demo bus created!");
                    } catch (createError) {
                        console.error("Failed to create demo bus", createError);
                    }
                }
            }
        };
        checkAndCreateBus();
    }, []);

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

    // --- SIMULATION LOOP ---
    const startSimulation = () => {
        if (routeCoords.length === 0) {
            alert("Please calculate a route first.");
            return;
        }
        setIsSimulating(true);
        stepRef.current = 0;
        
        simulationRef.current = setInterval(async () => {
            const currentStep = stepRef.current;
            const nextStep = currentStep + 1;

            if (nextStep >= routeCoords.length) {
                stopSimulation();
                return;
            }

            const currentPos = routeCoords[nextStep];
            setBusPosition(currentPos);
            stepRef.current = nextStep;

            // --- 1. TELEMETRY (Backend Update) ---
            sendTelemetry(currentPos);

            // --- 2. ML MODEL PREDICTION (Current) ---
            // Calculate instantaneous radius using prev, current, next points
            const pCurrent = routeCoords[nextStep];
            const pPrev = routeCoords[nextStep - 1] || pCurrent;
            const pNext = routeCoords[nextStep + 1] || pCurrent;
            const radius = calculateRadius(pPrev, pCurrent, pNext);

            const mlParams = {
                n_seated: parseInt(watch("seated")),
                n_standing: parseInt(watch("standing")),
                speed_kmh: parseInt(watch("speed")),
                radius_m: radius,
                is_wet: watch("weather") === "wet" ? 1 : 0,
                gradient_deg: 0 // Mock gradient
            };

            // Call ML Endpoint
            api.post("/bus/predict-safety", mlParams).then(res => {
                setCurrentRisk(res.data);
            });

            // --- 3. PREDICTIVE LOOKAHEAD (Dynamic Forecast) ---
            // Look 5 steps ahead (~5 seconds)
            const lookaheadStep = Math.min(nextStep + 5, routeCoords.length - 2);
            if (lookaheadStep > nextStep) {
                const lp1 = routeCoords[lookaheadStep - 1];
                const lp2 = routeCoords[lookaheadStep];
                const lp3 = routeCoords[lookaheadStep + 1];
                const futureRadius = calculateRadius(lp1, lp2, lp3);
                
                // Predict for future point
                api.post("/bus/predict-safety", { ...mlParams, radius_m: futureRadius }).then(res => {
                    setFutureRisk(res.data);
                });
            }

        }, 1000); // 1-second interval
    };

    const stopSimulation = () => {
        setIsSimulating(false);
        if (simulationRef.current) clearInterval(simulationRef.current);
    };

    const sendTelemetry = (pos) => {
        const payload = {
            licensePlate: watch("licensePlate"),
            speed: parseInt(watch("speed")),
            currentOccupancy: parseInt(watch("seated")) + parseInt(watch("standing")),
            footboardStatus: watch("footboard") === "true",
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
                                     <div style={{ 
                                         padding: 16, 
                                         borderRadius: 12, 
                                         background: getRiskLevel(currentRisk.risk_score).color, 
                                         color: "#fff",
                                         marginBottom: 16,
                                         textAlign: "center",
                                         boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                     }}>
                                         <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>INSTANTANEOUS RISK</div>
                                         <div style={{ fontSize: 24, fontWeight: 800 }}>
                                             {getRiskLevel(currentRisk.risk_score).label} ({currentRisk.risk_score.toFixed(2)})
                                         </div>
                                     </div>

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
