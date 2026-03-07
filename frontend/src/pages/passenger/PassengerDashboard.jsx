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
    if (percentage > 90) return { label: "High", color: "var(--color-danger-500)", bg: "#dc2626" };
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
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
        Loading live bus data...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", animation: "fadeIn 0.3s ease-out" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{
              padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))",
            }}>
              <Bus size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>
                Live Bus Tracker
              </h1>
              <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: "var(--text-sm)" }}>
                  Real-time updates on occupancy, speed, and safety.
              </p>
            </div>
        </div>
        <Badge
          variant="secondary"
          style={{ fontSize: "var(--text-sm)", padding: "4px 12px" }}
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
                <Card key={bus._id} hover style={{ transition: "box-shadow 0.2s", overflow: "hidden" }}>
                    {/* Header Section */}
                    <div style={{ background: "var(--bg-muted)", padding: "16px 24px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ padding: 8, background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                                <Bus size={20} color="var(--color-primary-500)" />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>
                                    {bus.licensePlate}
                                </h3>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
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
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <Users size={14} /> Crowding
                                </span>
                                <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: occupancyLevel.color }}>
                                    {occupancyLevel.label} ({currentOccupancy}/{bus.capacity})
                                </span>
                            </div>
                            {/* Progress Bar */}
                            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
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
                             <div style={{ padding: 12, background: "var(--bg-muted)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-light)" }}>
                                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Gauge size={14} /> Speed
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                                    {speed} <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)" }}>km/h</span>
                                </div>
                             </div>

                             {/* Safety Widget */}
                             <div style={{ padding: 12, background: "var(--bg-muted)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-light)" }}>
                                 <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <Activity size={14} /> Safety
                                 </div>
                                 {/* Simple Safety Badge */}
                                 {status?.footboardStatus ? (
                                     <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-danger-500)", display: "flex", alignItems: "center", gap: 4 }}>
                                         <AlertTriangle size={14} fill="#dc2626" stroke="#fff" /> Violation
                                     </div>
                                 ) : (
                                     <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                                         <Activity size={14} /> Normal
                                     </div>
                                 )}
                             </div>
                        </div>
                        
                        {/* Footer Action */}
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                <MapPin size={14} />
                                {status?.gps ? "Tracking Active" : "No GPS Signal"}
                            </div>
                            <Link
                                to={`/passenger/prediction`}
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "var(--color-primary-500)",
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
              color: "var(--text-muted)",
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
