import { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Bus, Clock, AlertTriangle, Siren, Timer } from "lucide-react";

const DriverDashboard = () => {
  const { user } = useAuth();
  const [busInfo, setBusInfo] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch driver profile from user's assigned bus
        const profileRes = await api.get("/auth/profile");
        const profile = profileRes.data;

        if (profile.assignedBus) {
          try {
            const busRes = await api.get(`/assignments/${profile.assignedBus._id || profile.assignedBus}`);
            setBusInfo(busRes.data);
          } catch (err) {
            console.error("Bus info fetch error:", err);
          }
        }

        // Fetch attendance if driver profile exists
        if (profile.driverProfile) {
          try {
            const [attendRes, coolRes] = await Promise.all([
              api.get(`/attendance/today/${profile.driverProfile}`),
              api.get(`/attendance/cooldown/${profile.driverProfile}`),
            ]);
            setAttendance(attendRes.data);
            setCooldown(coolRes.data);
          } catch (err) {
            console.error("Attendance fetch error:", err);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  const formatMinutes = (min) => {
    if (!min) return "0h 0m";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
        <LayoutDashboard size={28} /> Driver Dashboard
      </h1>

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
        {/* Driving Hours Card */}
        <div style={{ ...cardStyle, borderLeft: "4px solid #0284c7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Today's Driving</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{formatMinutes(attendance?.totalDrivingMinutes)}</p>
            </div>
            <Clock size={32} color="#0284c7" />
          </div>
        </div>

        {/* Continuous Driving Card */}
        <div style={{ ...cardStyle, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Continuous Driving</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{formatMinutes(attendance?.continuousDrivingMinutes)}</p>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Max: 5h before cooldown</p>
            </div>
            <Timer size={32} color="#f59e0b" />
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12, background: "#f1f5f9", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, ((attendance?.continuousDrivingMinutes || 0) / 300) * 100)}%`,
              height: "100%",
              background: (attendance?.continuousDrivingMinutes || 0) >= 240 ? "#ef4444" : "#f59e0b",
              borderRadius: 4,
              transition: "width 0.3s",
            }} />
          </div>
        </div>

        {/* Cooldown Card */}
        <div style={{ ...cardStyle, borderLeft: cooldown?.inCooldown ? "4px solid #ef4444" : "4px solid #22c55e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Status</p>
              {cooldown?.inCooldown ? (
                <>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>COOLDOWN</p>
                  <p style={{ fontSize: 13, color: "#64748b" }}>{cooldown.remainingMinutes} min remaining</p>
                </>
              ) : (
                <p style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>ACTIVE</p>
              )}
            </div>
            <AlertTriangle size={32} color={cooldown?.inCooldown ? "#ef4444" : "#22c55e"} />
          </div>
        </div>

        {/* Check-ins Card */}
        <div style={{ ...cardStyle, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Face Check-ins</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{attendance?.checkIns?.length || 0}</p>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Verified every 5 min</p>
            </div>
            <Siren size={32} color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* Assigned Bus Info */}
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <Bus size={22} /> Assigned Bus
      </h2>
      {busInfo ? (
        <div style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: "#64748b" }}>License Plate</p>
              <p style={{ fontSize: 16, fontWeight: 600 }}>{busInfo.licensePlate}</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#64748b" }}>Route</p>
              <p style={{ fontSize: 16, fontWeight: 600 }}>{busInfo.routeId}</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#64748b" }}>Conductor</p>
              <p style={{ fontSize: 16, fontWeight: 600 }}>{busInfo.assignedConductor?.username || "Not assigned"}</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#64748b" }}>Edge Device</p>
              <p style={{ fontSize: 16, fontWeight: 600 }}>{busInfo.assignedEdgeDevice?.name || "Not assigned"}</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#64748b" }}>Status</p>
              <span style={{
                padding: "4px 12px", borderRadius: 12, fontSize: 13, fontWeight: 500,
                background: busInfo.status === "active" ? "#dcfce7" : "#fee2e2",
                color: busInfo.status === "active" ? "#166534" : "#991b1b",
              }}>
                {busInfo.status || "active"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
          <Bus size={40} style={{ margin: "0 auto 12px" }} />
          <p>No bus assigned to you yet. Contact admin.</p>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
