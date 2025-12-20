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
import { ShieldCheck, AlertTriangle, Info, MapPin, Search } from "lucide-react";
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

const AuthorityPhysicsCheck = () => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
    } = useForm({
        defaultValues: {
            seated: 10,
            standing: 60,
            speed: 50,
            lat: 6.9271,
            lon: 79.8612,
        }
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);

    // Watch lat/lon inputs to update map
    const latValue = watch("lat");
    const lonValue = watch("lon");

    // Local state for map position to sync with inputs
    const [position, setPosition] = useState({ lat: 6.9271, lng: 79.8612 });

    // Update map position when inputs change
    useEffect(() => {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lonValue);
        if (!isNaN(lat) && !isNaN(lng)) {
            setPosition({ lat, lng });
        }
    }, [latValue, lonValue]);

    // Update inputs when map is clicked (via setPosition callback)
    const handleMapClick = (newLatlng) => {
        setPosition(newLatlng);
        setValue("lat", newLatlng.lat.toFixed(6));
        setValue("lon", newLatlng.lng.toFixed(6));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await axios.get(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    searchQuery
                )}`
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
            alert("Failed to search location");
        } finally {
            setSearching(false);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setResult(null);
        try {
            const payload = {
                seated: parseInt(data.seated),
                standing: parseInt(data.standing),
                speed: parseInt(data.speed),
                lat: parseFloat(data.lat),
                lon: parseFloat(data.lon),
            };
            const response = await api.post("/bus/physics", payload);
            setResult(response.data);
        } catch (error) {
            console.error("Physics check failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: 24,
            }}
        >
            <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
                Safety & Physics Analysis
            </h1>
            <p style={{ color: "#475569" }}>
                Run a real-world simulation using the live physics engine. Enter coordinates manually or select a location on the map.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <Card>
                    <CardHeader>
                        <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ShieldCheck style={{ height: 24, width: 24, color: "#2563eb" }} />
                            1. Simulation Parameters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            style={{ display: "flex", flexDirection: "column", gap: 16 }}
                        >
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label
                                        style={{ fontSize: 14, fontWeight: 500, color: "#334155", display: "block", marginBottom: 4 }}
                                    >
                                        Seated Passengers
                                    </label>
                                    <Input
                                        type="number"
                                        {...register("seated", { required: true, min: 0 })}
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{ fontSize: 14, fontWeight: 500, color: "#334155", display: "block", marginBottom: 4 }}
                                    >
                                        Standing Passengers
                                    </label>
                                    <Input
                                        type="number"
                                        {...register("standing", { required: true, min: 0 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    style={{ fontSize: 14, fontWeight: 500, color: "#334155", display: "block", marginBottom: 4 }}
                                >
                                    Speed (km/h)
                                </label>
                                <Input
                                    type="number"
                                    {...register("speed", { required: true, min: 0 })}
                                />
                            </div>

                            <div style={{ paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 12 }}>
                                    Location Coordinates
                                </p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                    <div>
                                        <label
                                            style={{ fontSize: 13, fontWeight: 500, color: "#64748b", display: "block", marginBottom: 4 }}
                                        >
                                            Latitude
                                        </label>
                                        <Input
                                            step="any"
                                            type="number"
                                            {...register("lat", { required: true })}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            style={{ fontSize: 13, fontWeight: 500, color: "#64748b", display: "block", marginBottom: 4 }}
                                        >
                                            Longitude
                                        </label>
                                        <Input
                                            step="any"
                                            type="number"
                                            {...register("lon", { required: true })}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                                    * Search location or click on the map to auto-fill.
                                </p>
                            </div>

                            <Button type="submit" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
                                {loading ? "Running Simulation..." : "Run Safety Analysis"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Map Section */}
                <Card style={{ overflow: "hidden", minHeight: 450, display: "flex", flexDirection: "column" }}>
                    <CardHeader style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                            <CardTitle style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                                <MapPin size={18} /> Select Location
                            </CardTitle>
                            <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                <Input
                                    placeholder="Search places (e.g. Kandy Clock Tower)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ height: 36, fontSize: 13 }}
                                />
                                <Button
                                    type="submit"
                                    disabled={searching}
                                    style={{ height: 36, padding: "0 12px" }}
                                >
                                    {searching ? "..." : <Search size={16} />}
                                </Button>
                            </form>
                        </div>
                    </CardHeader>
                    <MapContainer center={[6.9271, 79.8612]} zoom={15} style={{ flex: 1, width: "100%" }}>
                        {/* Google Maps Streets Tile Layer */}
                        <TileLayer
                            url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            maxZoom={20}
                            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            attribution='&copy; Google Maps'
                        />
                        <LocationMarker position={position} setPosition={handleMapClick} />
                    </MapContainer>
                </Card>
            </div>

            {result && (
                <div style={{ animation: "fadeInUp 0.5s", paddingBottom: 40 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>Analysis Results</h2>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                        {/* Result Cards */}
                        <Card style={{ background: result["Rollover threshold"] < "0.70 g" ? "#fef2f2" : "#f0fdf4", border: "1px solid #e5e7eb" }}>
                            <CardContent style={{ padding: 16 }}>
                                <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Rollover Threshold</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: result["Rollover threshold"] < "0.70 g" ? "#dc2626" : "#166534" }}>
                                    {result["Rollover threshold"]}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: 16 }}>
                                <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>CoG Height</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
                                    {result["CoG height"]}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: 16 }}>
                                <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Lateral Accel</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
                                    {result["Lateral accel"]}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card style={{ marginBottom: 24, borderLeft: result.Decision?.includes("CRITICAL") ? "6px solid #dc2626" : "6px solid #22c55e" }}>
                        <CardContent style={{ padding: 24 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
                                System Decision
                            </p>
                            <p style={{ fontSize: 24, fontWeight: 800, color: result.Decision?.includes("CRITICAL") ? "#dc2626" : "#166534" }}>
                                {result.Decision}
                            </p>
                        </CardContent>
                    </Card>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        <Card>
                            <CardHeader>
                                <CardTitle style={{ fontSize: 18 }}>Stopping Distance Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: "grid", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                        <span style={{ color: "#64748b" }}>Reaction Distance</span>
                                        <span style={{ fontWeight: 600 }}>{result["Reaction distance"]}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                        <span style={{ color: "#64748b" }}>Braking Distance</span>
                                        <span style={{ fontWeight: 600 }}>{result["Braking distance"]}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                                        <span style={{ color: "#0f172a", fontWeight: 600 }}>Total Stopping Distance</span>
                                        <span style={{ fontWeight: 700, color: "#2563eb", fontSize: 18 }}>{result["Total stopping distance"]}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle style={{ fontSize: 18 }}>Curve Safety Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: "grid", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                        <span style={{ color: "#64748b" }}>Curve Radius</span>
                                        <span style={{ fontWeight: 600 }}>{result["Curve radius"]}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                        <span style={{ color: "#64748b" }}>Max Safe Speed</span>
                                        <span style={{ fontWeight: 600 }}>{result["Max safe speed for curve"]}</span>
                                    </div>
                                    {result["Curve Warning"] && (
                                        <div style={{
                                            marginTop: 8,
                                            padding: 12,
                                            background: "#fef2f2",
                                            color: "#dc2626",
                                            borderRadius: 6,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            fontSize: 14,
                                            fontWeight: 600
                                        }}>
                                            <AlertTriangle size={18} />
                                            {result["Curve Warning"]}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthorityPhysicsCheck;
