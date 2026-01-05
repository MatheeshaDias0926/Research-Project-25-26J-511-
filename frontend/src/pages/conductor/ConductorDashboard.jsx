import { useState, useEffect } from "react";
import api from "../../api/axios";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Wrench, AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Component to fly to the bus location when it updates
const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

const ConductorDashboard = () => {
  const { user } = useAuth();
  const [myBus, setMyBus] = useState(null);
  const [violations, setViolations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    if (!user?.assignedBus?._id) return;
    
    setLoading(true);
    try {
        const busId = user.assignedBus._id;
        
        // 1. Fetch latest Bus Status
        const statusRes = await api.get(`/bus/${busId}/status`);
        // Merge currentStatus into the bus object for easier access
        const busData = {
           ...statusRes.data.bus,
           currentStatus: statusRes.data.currentStatus
        };
        setMyBus(busData); 
        
        // Reverse Geocode if we have GPS data
        if (busData.currentStatus?.gps) {
            const { lat, lon } = statusRes.data.currentStatus.gps;
            try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const address = geoRes.data.address;
                const city = address.city || address.town || address.village || address.suburb || "Unknown Location";
                setLocationName(city);
            } catch (geoError) {
                console.error("Geocoding failed", geoError);
            }
        }
        
        // 2. Fetch Violations (Alerts)
        const violationRes = await api.get(`/bus/${busId}/violations?limit=5`);
        setViolations(violationRes.data.violations);

        // 3. Fetch Historical Data Logs
        const logsRes = await api.get(`/bus/${busId}/logs?limit=20`);
        const chartData = logsRes.data.logs.reverse().map(log => ({
            time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            occupancy: log.currentOccupancy,
            speed: log.speed
        }));
        setLogs(chartData);

        setLastUpdated(new Date());

    } catch (error) {
        console.error("Failed to fetch dashboard data", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Extract Bus Location
  const busLocation = myBus?.currentStatus?.gps 
    ? [myBus.currentStatus.gps.lat, myBus.currentStatus.gps.lon]
    : [6.9271, 79.8612]; 

  const hasLocationData = !!myBus?.currentStatus?.gps;

  if (!user?.assignedBus) {
      return (
        <div style={{ textAlign: "center", padding: 48 }}>
            <Bus style={{ height: 48, width: 48, margin: "0 auto 16px", color: "#94a3b8" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#334155" }}>No Bus Assigned</h2>
            <p style={{ color: "#64748b" }}>Please contact the authority to assign a bus to your account.</p>
        </div>
      );
  }

  if (loading && !myBus) return <div style={{ padding: 40, textAlign: "center" }}>Loading dashboard...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>My Bus Dashboard</h1>
          <p style={{ color: "#64748b" }}>Real-time overview of your vehicle status.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
            <Button 
                variant="outline" 
                onClick={fetchData} 
                style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                color: "#2563eb", 
                borderColor: "#bfdbfe", 
                background: "#eff6ff" 
                }}
            >
                <RefreshCw size={16} /> Refresh
            </Button>
            <Link to="/conductor/maintenance">
            <Button variant="secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Wrench style={{ height: 16, width: 16 }} /> Report Issue
            </Button>
            </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Main Bus Card */}
        <Card style={{ gridColumn: "span 2", background: "#0f172a", color: "#fff" }}>
          <CardContent style={{ padding: 32, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ padding: 16, background: "rgba(255,255,255,0.1)", borderRadius: 24 }}>
                <Bus style={{ height: 48, width: 48, color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 12 }}>
                  {myBus?.licensePlate || user.assignedBus.licensePlate}
                  {locationName && (
                      <span style={{ fontSize: 18, fontWeight: 400, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                          <MapPin size={16} /> {locationName}
                      </span>
                  )}
                </h2>
                <p style={{ color: "#94a3b8", fontSize: 18 }}>
                  Route {myBus?.routeId || user.assignedBus.routeId}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Speed</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{myBus?.currentStatus?.speed || 0} km/h</p>
              </div>
              <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Passengers</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>
                    {myBus?.currentStatus?.currentOccupancy || 0} <span style={{fontSize: 14, color: "#94a3b8"}}>/ {myBus?.capacity || 55}</span>
                </p>
              </div>
              <div style={{ textAlign: "center", padding: "8px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Status</p>
                <Badge 
                    variant={myBus?.currentStatus ? "success" : "secondary"}
                >
                    {myBus?.currentStatus ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Alerts / Violations */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle style={{ height: 20, width: 20, color: "#f59e42" }} /> 
              Recent Alerts
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {violations.length === 0 ? (
                  <div style={{ padding: 12, background: "#f0fdf4", color: "#15803d", borderRadius: 8, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ height: 8, width: 8, borderRadius: 9999, background: "#22c55e" }}></div>
                    No active violations or alerts.
                  </div>
              ) : (
                  violations.map((v) => (
                    <div key={v._id} style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 14 }}>{v.violationType}</span>
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(v.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "#64748b" }}>
                            Location: {v.gps?.lat?.toFixed(4)}, {v.gps?.lon?.toFixed(4)}. Speed: {v.speed || 0} km/h
                        </p>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Status */}
        <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "24px 24px 12px 24px" }}>
                <h3 style={{ fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin style={{ height: 20, width: 20, color: "#2563eb" }} /> 
                Live Location
                </h3>
            </div>
            
            <div style={{ flex: 1, minHeight: 300, position: "relative" }}>
                 <MapContainer center={busLocation} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        maxZoom={20}
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        attribution='&copy; Google Maps'
                    />
                    {hasLocationData && <Marker position={busLocation}></Marker>}
                    <RecenterMap position={busLocation} />
                 </MapContainer>
            </div>

            <div style={{ padding: 16, background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Updated: {lastUpdated.toLocaleTimeString()}</span>
                    <Badge variant="success">Signal: Strong</Badge>
                 </div>
            </div>
        </Card>

        {/* Occupancy Chart */}
        <Card style={{ gridColumn: "span 2" }}>
            <CardContent style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp style={{ height: 20, width: 20, color: "#16a34a" }} /> 
                    Passenger Capacity Trend
                </h3>
                <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={logs}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="time" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748b", fontSize: 12 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: "#64748b", fontSize: 12 }} 
                            />
                            <Tooltip 
                                contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="occupancy" 
                                stroke="#16a34a" 
                                strokeWidth={2}
                                fill="rgba(22, 163, 74, 0.1)" 
                                name="Passengers"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConductorDashboard;
