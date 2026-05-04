import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Navigation, Clock } from "lucide-react";
import BusLocationMap from "../../components/ui/BusLocationMap";

const LiveLocation = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await api.get("/bus/locations");
        setBuses(res.data);
      } catch (err) {
        console.error("Failed to fetch bus locations", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
    const interval = setInterval(fetchBuses, 15000);
    return () => clearInterval(interval);
  }, []);

  const onlineBuses = buses.filter((b) => b.liveLocation && !b.liveLocation.isStale);
  const staleBuses = buses.filter((b) => b.liveLocation?.isStale);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{
          padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #10b981, #059669)",
        }}>
          <MapPin size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>Live Bus Locations</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Track all active buses in real-time</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Card hover style={{ flex: 1 }}>
          <CardContent style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 10, borderRadius: "var(--radius-full)", background: "#dcfce7", color: "#16a34a" }}>
              <Bus size={20} />
            </div>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Online Buses</p>
              <p style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{onlineBuses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card hover style={{ flex: 1 }}>
          <CardContent style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 10, borderRadius: "var(--radius-full)", background: "#fef3c7", color: "#d97706" }}>
              <Clock size={20} />
            </div>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Stale / Offline</p>
              <p style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{staleBuses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card hover style={{ flex: 1 }}>
          <CardContent style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 10, borderRadius: "var(--radius-full)", background: "#dbeafe", color: "#2563eb" }}>
              <Navigation size={20} />
            </div>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Total Tracking</p>
              <p style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{buses.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <BusLocationMap role="passenger" height="550px" refreshInterval={10000} />

      {/* Bus List */}
      {buses.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
          {buses.map((bus) => {
            const loc = bus.liveLocation;
            const isStale = loc?.isStale;
            return (
              <Card key={bus._id} hover>
                <CardContent style={{ padding: "var(--space-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Bus size={18} color="var(--color-primary-600)" />
                      <span style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>{bus.licensePlate}</span>
                    </div>
                    <Badge variant={isStale ? "warning" : "success"}>{isStale ? "Stale" : "Live"}</Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    <span><strong>Route:</strong> {bus.routeId}</span>
                    {loc?.speed != null && <span><strong>Speed:</strong> {loc.speed.toFixed(0)} km/h</span>}
                    {loc?.lat && <span><strong>GPS:</strong> {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveLocation;
