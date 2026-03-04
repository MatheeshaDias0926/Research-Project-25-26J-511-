import { useState, useEffect } from "react";
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
import { RadioTower, MapPin, Search } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Component to handle map clicks and updates
const LocationMarker = ({ position, setPosition }) => {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : <Marker position={position}></Marker>;
};

const IoTSimulator = () => {
    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            licensePlate: "NP-1234",
            speed: 45,
            occupancy: 30,
            footboard: "false",
            lat: 6.9271,
            lon: 79.8612
        }
    });
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    // Map & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [position, setPosition] = useState({ lat: 6.9271, lng: 79.8612 });

    // Watch lat/lon inputs
    const latValue = watch("lat");
    const lonValue = watch("lon");
    
    // Sync map when inputs change manually
    useEffect(() => {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lonValue);
        if (!isNaN(lat) && !isNaN(lng)) {
            setPosition({ lat, lng });
        }
    }, [latValue, lonValue]);

    // Handle map clicks
    const handleMapClick = (newLatlng) => {
        setPosition(newLatlng);
        setValue("lat", newLatlng.lat.toFixed(6));
        setValue("lon", newLatlng.lng.toFixed(6));
    };

    // Handle Location Search
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
                const newLat = parseFloat(lat);
                const newLon = parseFloat(lon);
                
                const newPos = { lat: newLat, lng: newLon };
                setPosition(newPos);
                setValue("lat", newLat.toFixed(6));
                setValue("lon", newLon.toFixed(6));
            } else {
                alert("Location not found");
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearching(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const payload = {
                licensePlate: data.licensePlate,
                currentOccupancy: parseInt(data.occupancy),
                gps: {
                    lat: parseFloat(data.lat),
                    lon: parseFloat(data.lon),
                },
                footboardStatus: data.footboard === "true",
                speed: parseInt(data.speed),
            };

            await api.post("/iot/mock-data", payload);

            const newLog = {
                timestamp: new Date().toLocaleTimeString(),
                ...payload,
                status: "Sent",
            };
            setLogs([newLog, ...logs]);

        } catch (error) {
            console.error("Failed to send mock data", error);
            alert("Failed to send data: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <RadioTower style={{ height: 32, width: 32, color: "#2563eb" }} />
                <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
                    IoT Simulator
                </h1>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 24 }}>
                {/* Left Column: Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Telemetry Controls</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>License Plate</label>
                                    <Input {...register("licensePlate", { required: true })} />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Speed (km/h)</label>
                                        <Input type="number" {...register("speed", { required: true })} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Occupancy</label>
                                        <Input type="number" {...register("occupancy", { required: true })} />
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Footboard Status</label>
                                    <select
                                        {...register("footboard")}
                                        style={{
                                            display: "flex", height: 40, width: "100%", borderRadius: 8,
                                            border: "1px solid var(--border-input)", background: "var(--bg-card)", padding: "0 12px", outline: "none"
                                        }}
                                    >
                                        <option value="false">Clear (Safe)</option>
                                        <option value="true">Obstructed (Risk)</option>
                                    </select>
                                </div>

                                <div style={{ paddingTop: 12, borderTop: "1px solid var(--bg-muted)" }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-body)", marginBottom: 8 }}>GPS Coordinates</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Lat</label>
                                            <Input step="any" type="number" {...register("lat", { required: true })} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Lon</label>
                                            <Input step="any" type="number" {...register("lon", { required: true })} />
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" style={{ width: "100%", }} disabled={loading}>
                                    {loading ? "Sending..." : "Send Data Packet"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card style={{ flex: 1, minHeight: 300 }}>
                        <CardHeader>
                             <CardTitle style={{ fontSize: 16 }}>Transmission Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                                {logs.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", fontStyle: "italic", padding: 20 }}>No packets sent yet.</p>}
                                {logs.map((log, idx) => (
                                    <div key={idx} style={{ padding: 10, background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--bg-muted)", fontSize: 12 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, color: "var(--text-body)" }}>{log.licensePlate}</span>
                                            <span style={{ color: "var(--text-muted)" }}>{log.timestamp}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 12, color: "var(--text-secondary)" }}>
                                            <span>{log.speed} km/h</span>
                                            <span>Lat: {log.gps.lat.toFixed(4)}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Map */}
                <Card style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", overflow: "hidden" }}>
                    <CardHeader style={{ padding: "12px 20px", background: "var(--bg-primary)", borderBottom: "1px solid var(--border-primary)" }}>
                         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                              <CardTitle style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                   <MapPin size={16} /> Select Location
                              </CardTitle>
                              <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 400 }}>
                                  <Input 
                                      placeholder="Search location..." 
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      style={{ height: 32, fontSize: 13 }}
                                  />
                                  <Button type="submit" disabled={searching} style={{ height: 32, padding: "0 12px" }}>
                                      {searching ? "..." : <Search size={14} />}
                                  </Button>
                              </form>
                         </div>
                    </CardHeader>
                    <div style={{ flex: 1 }}>
                         <MapContainer center={[6.9271, 79.8612]} zoom={14} style={{ height: "100%", width: "100%" }}>
                            <TileLayer
                                url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                maxZoom={20}
                                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                                attribution='&copy; Google Maps'
                            />
                            <LocationMarker position={position} setPosition={handleMapClick} />
                         </MapContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default IoTSimulator;
