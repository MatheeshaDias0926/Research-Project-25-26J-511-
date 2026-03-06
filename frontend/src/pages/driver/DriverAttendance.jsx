import { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { Clock, Calendar, Timer, CheckCircle, AlertTriangle } from "lucide-react";

const DriverAttendance = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [driverProfileId, setDriverProfileId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await api.get("/auth/profile");
        const driverId = profileRes.data.driverProfile;
        setDriverProfileId(driverId);

        if (driverId) {
          const [todayRes, historyRes] = await Promise.all([
            api.get(`/attendance/today/${driverId}`),
            api.get(`/attendance/history/${driverId}?days=30`),
          ]);
          setTodayAttendance(todayRes.data);
          setHistory(historyRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatMinutes = (min) => {
    if (!min) return "0h 0m";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  };

  const handleEndShift = async () => {
    if (!driverProfileId || !confirm("End your shift?")) return;
    try {
      await api.post(`/attendance/end-shift/${driverProfileId}`);
      // Refresh
      const todayRes = await api.get(`/attendance/today/${driverProfileId}`);
      setTodayAttendance(todayRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={28} /> Driving Hours & Attendance
        </h1>
        {todayAttendance?.status === "active" && (
          <button onClick={handleEndShift} style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            End Shift
          </button>
        )}
      </div>

      {/* Today's Summary */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Today's Summary</h2>
      {todayAttendance?.totalDrivingMinutes !== undefined ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Total Driving</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{formatMinutes(todayAttendance.totalDrivingMinutes)}</p>
          </div>
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Continuous Driving</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{formatMinutes(todayAttendance.continuousDrivingMinutes)}</p>
            {/* Progress */}
            <div style={{ marginTop: 8, background: "#f1f5f9", borderRadius: 4, height: 6 }}>
              <div style={{ width: `${Math.min(100, ((todayAttendance.continuousDrivingMinutes || 0) / 300) * 100)}%`, height: "100%", background: (todayAttendance.continuousDrivingMinutes || 0) >= 240 ? "#ef4444" : "#0284c7", borderRadius: 4 }} />
            </div>
          </div>
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Check-ins</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{todayAttendance.checkIns?.length || 0}</p>
          </div>
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Shift Status</p>
            <span style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: todayAttendance.status === "active" ? "#dcfce7" : todayAttendance.status === "cooldown" ? "#fee2e2" : "#f1f5f9",
              color: todayAttendance.status === "active" ? "#166534" : todayAttendance.status === "cooldown" ? "#991b1b" : "#475569",
            }}>
              {todayAttendance.status?.toUpperCase() || "OFF DUTY"}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: "center", color: "#94a3b8", padding: 32, marginBottom: 32 }}>
          <Timer size={40} style={{ margin: "0 auto 12px" }} />
          <p>No shift recorded today</p>
        </div>
      )}

      {/* Check-in Log */}
      {todayAttendance?.checkIns?.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Today's Check-ins</h2>
          <div style={{ ...cardStyle, marginBottom: 32, maxHeight: 300, overflowY: "auto" }}>
            {todayAttendance.checkIns.map((ci, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < todayAttendance.checkIns.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                {ci.verified ? (
                  <CheckCircle size={18} color="#22c55e" />
                ) : (
                  <AlertTriangle size={18} color="#ef4444" />
                )}
                <span style={{ fontSize: 14, color: "#334155" }}>
                  {new Date(ci.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  {ci.verified ? "Verified" : "Failed"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* History */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <Calendar size={20} /> Last 30 Days
      </h2>
      {history.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Bus</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Total Driving</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Check-ins</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((rec) => (
                <tr key={rec._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 16px" }}>{new Date(rec.date).toLocaleDateString()}</td>
                  <td style={{ padding: "12px 16px" }}>{rec.busId?.licensePlate || "N/A"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{formatMinutes(rec.totalDrivingMinutes)}</td>
                  <td style={{ padding: "12px 16px" }}>{rec.checkIns?.length || 0}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: rec.status === "completed" ? "#dcfce7" : rec.status === "cooldown" ? "#fee2e2" : "#f0f9ff",
                      color: rec.status === "completed" ? "#166534" : rec.status === "cooldown" ? "#991b1b" : "#0369a1",
                    }}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: "center", color: "#94a3b8", padding: 32 }}>
          <p>No attendance history found</p>
        </div>
      )}
    </div>
  );
};

export default DriverAttendance;
