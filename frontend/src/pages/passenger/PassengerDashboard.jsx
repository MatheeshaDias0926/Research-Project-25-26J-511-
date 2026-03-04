import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Users, Activity, AlertTriangle, Gauge, Route } from "lucide-react";

const PassengerDashboard = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchBuses();
    const interval = setInterval(fetchBuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await api.get("/bus");
      setBuses(response.data);
    } catch (error) {
      console.error("Failed to fetch buses", error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyLevel = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage > 90) return { label: "High", color: "#dc2626", bg: "#dc2626" };
    if (percentage > 50) return { label: "Medium", color: "#ca8a04", bg: "#eab308" };
    return { label: "Low", color: "#16a34a", bg: "#22c55e" };
  };

  // Helper to safely get nested status data
  const getStatusData = (bus) => {
     if (typeof bus.currentStatus === 'object' && bus.currentStatus) {
         return bus.currentStatus;
     }
     return null;
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
        Loading live bus data...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
            Live Bus Tracker
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                Real-time updates on occupancy, speed, and safety.
            </p>
        </div>
        <Badge
          variant="secondary"
          style={{ fontSize: 14, padding: "4px 12px" }}
        >
          {buses.length} Active Buses
        </Badge>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 24,
        }}
      >
        {buses.map((bus) => {
            const status = getStatusData(bus);
            const currentOccupancy = status?.currentOccupancy || 0;
            const speed = status?.speed || 0;
            const occupancyLevel = getOccupancyLevel(currentOccupancy, bus.capacity);
            const occupancyPct = Math.min((currentOccupancy / bus.capacity) * 100, 100);

            return (
                <Card key={bus._id} style={{ transition: "box-shadow 0.2s", overflow: "hidden" }}>
                    {/* Header Section */}
                    <div style={{ background: "var(--bg-primary)", padding: "16px 24px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ padding: 8, background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                                <Bus size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                                    {bus.licensePlate}
                                </h3>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-secondary)" }}>
                                    <Route size={12} />
                                    <span>Route {bus.routeId}</span>
                                </div>
                            </div>
                        </div>
                        <Badge variant={status ? "success" : "secondary"}>
                            {status ? "Live" : "Inactive"}
                        </Badge>
                    </div>

                    <CardContent style={{ padding: 24 }}>
                        {/* Occupancy Section */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "baseline" }}>
                                <span style={{ fontSize: 14, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <Users size={14} /> Crowding
                                </span>
                                <span style={{ fontWeight: 600, fontSize: 14, color: occupancyLevel.color }}>
                                    {occupancyLevel.label} ({currentOccupancy}/{bus.capacity})
                                </span>
                            </div>
                            {/* Progress Bar */}
                            <div style={{ height: 8, background: "var(--border-primary)", borderRadius: 4, overflow: "hidden" }}>
                                <div 
                                    style={{ 
                                        width: `${occupancyPct}%`, 
                                        height: "100%", 
                                        backgroundColor: occupancyLevel.bg, /* Fixed: Inline style */
                                        transition: "width 0.5s ease",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Telemetry Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                             {/* Speed Widget */}
                             <div style={{ padding: 12, background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)" }}>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Gauge size={14} /> Speed
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                                    {speed} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>km/h</span>
                                </div>
                             </div>

                             {/* Safety Widget */}
                             <div style={{ padding: 12, background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)" }}>
                                 <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Activity size={14} /> Safety
                                 </div>
                                 {/* Simple Safety Badge */}
                                 {status?.footboardStatus ? (
                                     <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                                         <AlertTriangle size={14} fill="#dc2626" stroke="#fff" /> Violation
                                     </div>
                                 ) : (
                                     <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                                         <Activity size={14} /> Normal
                                     </div>
                                 )}
                             </div>
                        </div>
                        
                        {/* Footer Action */}
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                <MapPin size={14} />
                                {status?.gps ? "Tracking Active" : "No GPS Signal"}
                            </div>
                            <Link
                                to={`/passenger/prediction`}
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "#2563eb",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4
                                }}
                            >
                                View full details &rarr;
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            );
        })}

        {buses.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "48px 0",
              color: "var(--text-secondary)",
            }}
          >
            No active buses found at the moment.
          </div>
        )}
      </div>
    </div>
  );
};

export default PassengerDashboard;
