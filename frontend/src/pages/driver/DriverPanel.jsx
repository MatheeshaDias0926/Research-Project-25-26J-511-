import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  Bus, MapPin, Wrench, AlertTriangle, RefreshCw,
  LayoutDashboard, User, Clock, Timer, Siren, FileWarning, Eye,
  Shield, Activity,
} from "lucide-react";
import BusLocationMap from "../../components/ui/BusLocationMap";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "live-map", label: "Live Location", icon: MapPin },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "alerts", label: "Alert Log", icon: FileWarning },
];

const tabStyle = (active) => ({
  padding: "var(--space-3) var(--space-5)",
  fontSize: "var(--text-sm)",
  fontWeight: active ? 600 : 500,
  color: active ? "var(--color-primary-600)" : "var(--text-muted)",
  borderBottom: "none",
  background: active ? "var(--color-primary-50)" : "transparent",
  border: "none",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  transition: "var(--transition-fast)",
});

const cardBoxStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-xl)",
  padding: "var(--space-5)",
  boxShadow: "var(--shadow-sm)",
  transition: "var(--transition-fast)",
};
const inputStyle = {
  padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", fontSize: "var(--text-sm)", outline: "none", width: "100%", transition: "var(--transition-fast)",
};
const selectStyle = {
  padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", fontSize: "var(--text-sm)", outline: "none", width: "100%",
};
const thStyle = { padding: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" };
const tdStyle = { padding: "var(--space-3)", fontSize: "var(--text-sm)" };

const formatMinutes = (min) => {
  if (!min) return "0h 0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};

// ═══════════════════════════════════════════════════════════════
// RED ALERT OVERLAY (full-screen blinking red)
// ═══════════════════════════════════════════════════════════════
const RedAlertOverlay = ({ blinkCount = 5, blinkDuration = 2, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [currentBlink, setCurrentBlink] = useState(0);
  const [isRed, setIsRed] = useState(true);

  useEffect(() => {
    if (currentBlink >= blinkCount) {
      onComplete?.();
      return;
    }
    const halfCycle = (blinkDuration * 1000) / 2;
    const timer = setTimeout(() => {
      if (isRed) {
        setIsRed(false);
      } else {
        setIsRed(true);
        setCurrentBlink(prev => prev + 1);
      }
    }, halfCycle);
    return () => clearTimeout(timer);
  }, [currentBlink, isRed, blinkCount, blinkDuration, onComplete]);

  if (!visible || currentBlink >= blinkCount) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      background: isRed ? "rgba(239, 68, 68, 0.85)" : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: isRed ? "auto" : "none",
      transition: `background ${blinkDuration * 250}ms ease-in-out`,
    }}>
      {isRed && (
        <div style={{ textAlign: "center", color: "white" }}>
          <AlertTriangle size={80} style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>⚠ VIOLATION ALERT</h1>
          <p style={{ fontSize: 18, opacity: 0.9 }}>Multiple violations detected — Drive safely!</p>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
            Blink {currentBlink + 1} of {blinkCount}
          </p>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
const OverviewTab = ({ user }) => {
  const [busInfo, setBusInfo] = useState(null);
  const [busStatus, setBusStatus] = useState(null);
  const [violations, setViolations] = useState([]);
  const [conductorInfo, setConductorInfo] = useState(null);
  const [piSession, setPiSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showRedAlert, setShowRedAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);
  const lastAlertTimeRef = { current: 0 };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await api.get("/auth/profile");
      const profile = profileRes.data;

      if (profile.assignedBus) {
        const busId = profile.assignedBus._id || profile.assignedBus;
        try {
          const [assignRes, statusRes] = await Promise.all([
            api.get(`/assignments/${busId}`),
            api.get(`/bus/${busId}/status`).catch(() => null),
          ]);
          setBusInfo(assignRes.data);
          if (assignRes.data.assignedConductor) {
            setConductorInfo(assignRes.data.assignedConductor);
          }
          if (statusRes?.data) {
            setBusStatus(statusRes.data.currentStatus);
          }

          // Fetch violations
          const violRes = await api.get(`/bus/${busId}/violations?limit=5`).catch(() => ({ data: { violations: [] } }));
          setViolations(violRes.data.violations || []);
        } catch (err) {
          console.error("Bus info fetch error:", err);
        }
      }

      if (profile.driverProfile) {
        // Driver profile exists — driving data comes from piSession below
      }

      // Fetch Pi verification session data
      try {
        const sessionRes = await api.get("/edge-devices/driver-sessions");
        setPiSession(sessionRes.data);
      } catch (err) {
        console.error("Pi session fetch error:", err);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check violations against alert config and trigger red overlay
  useEffect(() => {
    if (!piSession?.violationAlertConfig || !piSession?.todaySessions) return;
    const cfg = piSession.violationAlertConfig;
    setAlertConfig(cfg);

    const now = Date.now();
    const windowMs = (cfg.timeWindow || 5) * 60 * 1000;

    // Count drowsiness events within the time window
    let recentCount = 0;
    for (const session of piSession.todaySessions) {
      if (session.drowsinessEvents) {
        for (const evt of session.drowsinessEvents) {
          if (evt.timestamp && (now - new Date(evt.timestamp).getTime()) < windowMs) {
            recentCount++;
          }
        }
      }
    }

    // Trigger alert if threshold exceeded and not already triggered recently
    if (recentCount >= (cfg.threshold || 5) && (now - lastAlertTimeRef.current) > windowMs) {
      lastAlertTimeRef.current = now;
      setShowRedAlert(true);
    }
  }, [piSession]);

  if (loading && !busInfo) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Red Alert Overlay */}
      {showRedAlert && <RedAlertOverlay
        blinkCount={alertConfig?.blinkCount || 5}
        blinkDuration={alertConfig?.blinkDuration || 2}
        onComplete={() => setShowRedAlert(false)}
      />}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="outline" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-primary-600)", borderColor: "var(--color-primary-100)", background: "var(--color-primary-50)" }}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={{ ...cardBoxStyle, borderLeft: "4px solid #0284c7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Today's Driving</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{formatMinutes(piSession?.todayDrivingMinutes)}</p>
            </div>
            <Clock size={32} color="#0284c7" />
          </div>
        </div>

        <div style={{ ...cardBoxStyle, borderLeft: piSession?.deviceOnline === false ? "4px solid #94a3b8" : "4px solid #f59e0b" }}>
          {piSession?.deviceOnline === false ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Continuous Driving</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>Device Offline</p>
              </div>
              <Timer size={32} color="#94a3b8" />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Continuous Driving</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{formatMinutes(piSession?.continuousDrivingMinutes)}</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Max: {piSession?.drivingLimits ? formatMinutes(piSession.drivingLimits.maxContinuousDriving) : "—"} before rest
                  </p>
                </div>
                <Timer size={32} color="#f59e0b" />
              </div>
              <div style={{ marginTop: 12, background: "var(--bg-subtle)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, ((piSession?.continuousDrivingMinutes || 0) / (piSession?.drivingLimits?.maxContinuousDriving || 360)) * 100)}%`,
                  height: "100%",
                  background: (piSession?.continuousDrivingMinutes || 0) >= (piSession?.drivingLimits?.maxContinuousDriving || 360) * 0.8 ? "#ef4444" : "#f59e0b",
                  borderRadius: 4,
                }} />
              </div>
            </>
          )}
        </div>

        <div style={{ ...cardBoxStyle, borderLeft: piSession?.deviceOnline === false ? "4px solid #94a3b8" : (piSession?.continuousDrivingMinutes >= (piSession?.drivingLimits?.maxContinuousDriving || 360)) ? "4px solid #ef4444" : "4px solid #22c55e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Status</p>
              {piSession?.deviceOnline === false ? (
                <p style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>OFFLINE</p>
              ) : piSession?.continuousDrivingMinutes >= (piSession?.drivingLimits?.maxContinuousDriving || 360) ? (
                <>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>REST REQUIRED</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Need {piSession?.drivingLimits?.requiredRest || 360} min rest
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-success-500)" }}>ACTIVE</p>
              )}
            </div>
            <AlertTriangle size={32} color={piSession?.deviceOnline === false ? "#94a3b8" : (piSession?.continuousDrivingMinutes >= (piSession?.drivingLimits?.maxContinuousDriving || 360)) ? "#ef4444" : "#22c55e"} />
          </div>
        </div>

        <div style={{ ...cardBoxStyle, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Sessions Today</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{piSession?.todaySessionCount || 0}</p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Face verified sessions</p>
            </div>
            <Siren size={32} color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* Pi Verification & Session Info */}
      {piSession && (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: "var(--text-lg)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
              <Shield size={20} color="var(--color-primary-500)" /> Face Verification Status
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
              <div style={{ ...cardBoxStyle, borderLeft: "4px solid #0284c7", padding: 16 }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Verified Driving</p>
                <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>{formatMinutes(piSession.todayDrivingMinutes)}</p>
              </div>
              <div style={{ ...cardBoxStyle, borderLeft: "4px solid #22c55e", padding: 16 }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Resting Time</p>
                <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>{formatMinutes(piSession.todayRestingMinutes)}</p>
              </div>
              <div style={{ ...cardBoxStyle, borderLeft: "4px solid #8b5cf6", padding: 16 }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Sessions Today</p>
                <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>{piSession.todaySessionCount || 0}</p>
              </div>
              <div style={{ ...cardBoxStyle, borderLeft: piSession.todayDrowsinessEvents > 0 ? "4px solid #ef4444" : "4px solid #94a3b8", padding: 16 }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>Drowsiness Alerts</p>
                <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: piSession.todayDrowsinessEvents > 0 ? "#ef4444" : "inherit" }}>
                  {piSession.todayDrowsinessEvents || 0}
                </p>
              </div>
            </div>

            {/* Driving Limits Progress */}
            {piSession.drivingLimits && piSession.deviceOnline !== false && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ background: "var(--bg-muted)", borderRadius: "var(--radius-lg)", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>Continuous Driving</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      {piSession.continuousDrivingMinutes || 0}m / {piSession.drivingLimits.maxContinuousDriving}m
                    </p>
                  </div>
                  <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(100, ((piSession.continuousDrivingMinutes || 0) / piSession.drivingLimits.maxContinuousDriving) * 100)}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: (piSession.continuousDrivingMinutes || 0) >= piSession.drivingLimits.maxContinuousDriving ? "#ef4444"
                        : (piSession.continuousDrivingMinutes || 0) >= piSession.drivingLimits.maxContinuousDriving * 0.8 ? "#f59e0b" : "#22c55e",
                    }} />
                  </div>
                </div>
                <div style={{ background: "var(--bg-muted)", borderRadius: "var(--radius-lg)", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>Daily Driving</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      {piSession.todayDrivingMinutes || 0}m / {piSession.drivingLimits.maxDailyDriving}m
                    </p>
                  </div>
                  <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(100, ((piSession.todayDrivingMinutes || 0) / piSession.drivingLimits.maxDailyDriving) * 100)}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: (piSession.todayDrivingMinutes || 0) >= piSession.drivingLimits.maxDailyDriving ? "#ef4444"
                        : (piSession.todayDrivingMinutes || 0) >= piSession.drivingLimits.maxDailyDriving * 0.8 ? "#f59e0b" : "#22c55e",
                    }} />
                  </div>
                </div>
              </div>
            )}

            {/* Driving Limit Warnings */}
            {piSession.deviceOnline !== false && piSession.drivingLimits && (piSession.continuousDrivingMinutes >= piSession.drivingLimits.maxContinuousDriving ||
               piSession.todayDrivingMinutes >= piSession.drivingLimits.maxDailyDriving) && (
                <div style={{ background: "var(--color-danger-50)", border: "1px solid var(--color-danger-200)", borderRadius: 8, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <div>
                    {piSession.continuousDrivingMinutes >= piSession.drivingLimits.maxContinuousDriving && (
                      <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-danger-500)" }}>
                        Continuous driving limit reached! Take a mandatory rest of at least {piSession.drivingLimits.requiredRest || piSession.drivingLimits.minRestDuration} minutes.
                      </p>
                    )}
                    {piSession.todayDrivingMinutes >= piSession.drivingLimits.maxDailyDriving && (
                      <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-danger-500)" }}>
                        Daily driving limit reached ({piSession.drivingLimits.maxDailyDriving} min). No more driving allowed today.
                      </p>
                    )}
                  </div>
                </div>
            )}

            {/* Current Session */}
            {piSession.currentSession ? (
              <div style={{ background: piSession.currentSession.verified ? "#f0fdf4" : "#fffbeb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={16} color="#22c55e" /> Active Session
                  </span>
                  <Badge variant={piSession.currentSession.verified ? "success" : "error"}>
                    {piSession.currentSession.verified ? "Face Verified" : "Unverified"}
                  </Badge>
                </div>
                {piSession.currentSession.confidence != null && (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    Confidence: <strong>{piSession.currentSession.confidence?.toFixed(2)}%</strong>
                    {piSession.currentSession.local ? " (On-device)" : " (Remote)"}
                  </p>
                )}
                {piSession.currentSession.alertnessLevel && (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 4 }}>
                    Alertness: <Badge variant={piSession.currentSession.alertnessLevel === "ALERT" ? "success" : piSession.currentSession.alertnessLevel === "TIRED" ? "warning" : "error"}>
                      {piSession.currentSession.alertnessLevel} {piSession.currentSession.alertnessScore != null ? `(${piSession.currentSession.alertnessScore})` : ""}
                    </Badge>
                  </p>
                )}
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 6 }}>
                  Since: {new Date(piSession.currentSession.sessionStart).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div style={{ background: "var(--bg-muted)", borderRadius: 8, padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                No active Pi verification session
              </div>
            )}

            {/* Today's Sessions List */}
            {piSession.todaySessions?.length > 0 && (
              <div>
                <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "var(--text-muted)" }}>Today's Sessions</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {piSession.todaySessions.map(s => (
                    <div key={s._id} style={{
                      padding: 12, borderRadius: 8, background: "var(--bg-muted)",
                      borderLeft: `3px solid ${s.verified ? "#22c55e" : "#f59e0b"}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                          {new Date(s.sessionStart).toLocaleTimeString()}
                          {s.sessionEnd && ` — ${new Date(s.sessionEnd).toLocaleTimeString()}`}
                        </span>
                        {s.confidence != null && (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 12 }}>
                            {s.confidence?.toFixed(2)}% confidence
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {s.drowsinessEvents?.length > 0 && (
                          <span style={{ fontSize: "var(--text-xs)", color: "#ef4444" }}>{s.drowsinessEvents.length} alerts</span>
                        )}
                        <Badge variant={s.verified ? "success" : "error"} style={{ fontSize: 11 }}>
                          {s.verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Assigned Bus */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: "var(--text-lg)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
              <Bus size={20} color="var(--color-primary-500)" /> Assigned Bus
            </h3>
            {busInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>License Plate</span>
                  <span style={{ fontWeight: 600 }}>{busInfo.licensePlate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Route</span>
                  <span>{busInfo.routeId}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Status</span>
                  <Badge variant={busInfo.status === "active" ? "success" : "secondary"}>{busInfo.status || "active"}</Badge>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No bus assigned. Contact admin.</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Conductor */}
        <Card>
          <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: "var(--text-lg)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
              <User size={20} color="var(--color-primary-500)" /> Assigned Conductor
            </h3>
            {conductorInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Name</span>
                  <span style={{ fontWeight: 600 }}>{conductorInfo.fullName || conductorInfo.username}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Contact</span>
                  <span>{conductorInfo.contactNumber || "—"}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No conductor assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardContent style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: "var(--text-lg)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
              <AlertTriangle size={20} color="var(--color-warning-500)" /> Recent Alerts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {violations.length === 0 ? (
              <div style={{ padding: 12, background: "var(--color-success-50)", color: "#15803d", borderRadius: 8, fontSize: "var(--text-sm)", fontWeight: 500 }}>
                No active violations or alerts.
              </div>
            ) : violations.map(v => (
              <div key={v._id} style={{ padding: 12, background: "var(--color-danger-50)", borderRadius: 8, border: "1px solid #fee2e2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--color-danger-500)", fontWeight: 600, fontSize: 14 }}>{v.violationType}</span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Speed: {v.speed || 0} km/h</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <BusLocationMap role="driver" height="300px" refreshInterval={15000} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// LIVE LOCATION TAB (Driver - assigned bus only)
// ═══════════════════════════════════════════════════════════════
const LiveLocationTab = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)" }}>My Bus Location</h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 4 }}>Real-time location of your assigned bus</p>
        </div>
      </div>
      <BusLocationMap role="driver" height="550px" refreshInterval={10000} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE TAB
// ═══════════════════════════════════════════════════════════════
const MaintenanceTab = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ issue: "", description: "", priority: "medium" });
  const [message, setMessage] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/maintenance/my");
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const profile = await api.get("/auth/profile");
    const busId = profile.data.assignedBus?._id || profile.data.assignedBus;
    if (!busId) {
      alert("No bus assigned to your account.");
      return;
    }
    try {
      await api.post("/maintenance", {
        busId,
        issue: form.issue,
        description: form.description,
        priority: form.priority,
      });
      setForm({ issue: "", description: "", priority: "medium" });
      setIsAdding(false);
      setMessage("Maintenance request submitted");
      setTimeout(() => setMessage(""), 3000);
      fetchLogs();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const statusColor = (s) => s === "resolved" ? "success" : s === "in-progress" ? "warning" : "secondary";
  const priorityColor = (p) => p === "critical" ? "#ef4444" : p === "high" ? "#f59e0b" : p === "medium" ? "#3b82f6" : "#94a3b8";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Request maintenance and track status.</p>
        <Button onClick={() => setIsAdding(!isAdding)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Wrench size={16} /> {isAdding ? "Cancel" : "Request Maintenance"}
        </Button>
      </div>

      {message && <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8 }}>{message}</div>}

      {isAdding && (
        <Card style={{ border: "1px solid #bae6fd", background: "var(--color-info-50)" }}>
          <CardContent style={{ padding: 20 }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, display: "block", marginBottom: 4 }}>Issue *</label>
                <input style={inputStyle} value={form.issue} onChange={e => setForm(p => ({ ...p, issue: e.target.value }))} placeholder="e.g. Brake issue" required />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-sm)", fontWeight: 500, display: "block", marginBottom: 4 }}>Priority</label>
                <select style={selectStyle} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <Button type="submit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32 }}>Loading...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No maintenance requests.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14, textAlign: "left", borderCollapse: "collapse" }}>
                <thead style={{ background: "var(--bg-muted)" }}>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Bus</th>
                    <th style={thStyle}>Issue</th>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{new Date(log.createdAt).toLocaleDateString()}</td>
                      <td style={tdStyle}>{log.busId?.licensePlate || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{log.issue}</td>
                      <td style={tdStyle}><span style={{ color: priorityColor(log.priority), fontWeight: 600 }}>{log.priority}</span></td>
                      <td style={tdStyle}><Badge variant={statusColor(log.status)}>{log.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ALERT LOG TAB
// ═══════════════════════════════════════════════════════════════
const AlertLogTab = ({ user }) => {
  const [violations, setViolations] = useState([]);
  const [drowsinessEvents, setDrowsinessEvents] = useState([]);
  const [alertFilter, setAlertFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await api.get("/auth/profile");
      const busId = profile.data.assignedBus?._id || profile.data.assignedBus;

      const promises = [];
      if (busId) {
        promises.push(api.get(`/bus/${busId}/violations?limit=100`).catch(() => ({ data: { violations: [] } })));
      } else {
        promises.push(Promise.resolve({ data: { violations: [] } }));
      }
      promises.push(api.get("/edge-devices/drowsiness-log").catch(() => ({ data: [] })));

      const [violRes, drowsyRes] = await Promise.all(promises);
      setViolations(violRes.data.violations || []);
      setDrowsinessEvents(drowsyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getViolationIcon = (type) => {
    switch (type) {
      case "drowsiness": return { icon: "😴", label: "Drowsiness Detection", color: "#f59e0b" };
      case "yawning": return { icon: "🥱", label: "Yawning Detection", color: "#f97316" };
      case "sleepiness": return { icon: "💤", label: "Sleepiness Alert", color: "#ef4444" };
      case "no_face": return { icon: "👤", label: "Driver Not Visible", color: "var(--text-muted)" };
      case "mobile_phone": return { icon: "📱", label: "Mobile Phone Usage", color: "var(--color-danger-500)" };
      case "footboard": return { icon: "🚪", label: "Footboard Violation", color: "#ef4444" };
      case "overcrowding": return { icon: "👥", label: "Overcrowding", color: "#f97316" };
      default: return { icon: "⚠️", label: type, color: "var(--text-muted)" };
    }
  };

  // Merge violations + drowsiness events into a unified timeline
  const allAlerts = [
    ...violations.map(v => ({
      _id: v._id,
      type: v.violationType,
      timestamp: v.createdAt,
      source: "violation",
      speed: v.speed,
      gps: v.gps,
      occupancy: v.occupancyAtViolation,
    })),
    ...drowsinessEvents.map(e => ({
      _id: e._id,
      type: e.type,
      timestamp: e.timestamp,
      source: "pi",
      ear: e.ear,
      mar: e.mar,
      alertnessScore: e.alertnessScore,
      deviceId: e.deviceId,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredAlerts = alertFilter === "all" ? allAlerts
    : alertFilter === "pi" ? allAlerts.filter(a => a.source === "pi")
    : allAlerts.filter(a => a.source === "violation");

  const piCount = allAlerts.filter(a => a.source === "pi").length;
  const violCount = allAlerts.filter(a => a.source === "violation").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Violations, drowsiness, and yawning events from Pi monitoring.</p>
        <button onClick={fetchData} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {[
          { key: "all", label: `All (${allAlerts.length})` },
          { key: "pi", label: `Pi Alerts (${piCount})` },
          { key: "violation", label: `Violations (${violCount})` },
        ].map(t => (
          <button key={t.key} onClick={() => setAlertFilter(t.key)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: alertFilter === t.key ? 600 : 400,
            color: alertFilter === t.key ? "#0284c7" : "#64748b",
            borderBottom: alertFilter === t.key ? "2px solid #0284c7" : "2px solid transparent",
            background: "none", border: "none", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>Loading alert log...</div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#166534" }}>No Alerts</h3>
            <p style={{ color: "var(--text-muted)" }}>Great driving! No alerts recorded.</p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAlerts.map(a => {
            const info = getViolationIcon(a.type);
            return (
              <Card key={a._id} style={{ borderLeft: `4px solid ${info.color}` }}>
                <CardContent style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 28 }}>{info.icon}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <p style={{ fontWeight: 600, fontSize: 15, color: info.color }}>{info.label}</p>
                        <Badge variant={a.source === "pi" ? "secondary" : "warning"} style={{ fontSize: 10 }}>
                          {a.source === "pi" ? "Pi Device" : "System"}
                        </Badge>
                      </div>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                        {a.source === "pi" ? (
                          <>
                            {a.ear != null && `EAR: ${a.ear.toFixed(3)}`}
                            {a.mar != null && ` | MAR: ${a.mar.toFixed(3)}`}
                            {a.alertnessScore != null && ` | Alertness: ${a.alertnessScore}`}
                          </>
                        ) : (
                          <>
                            Speed: {a.speed || 0} km/h
                            {a.gps && a.gps.lat ? ` | GPS: ${a.gps.lat.toFixed(4)}, ${a.gps.lon.toFixed(4)}` : ""}
                            {a.occupancy ? ` | Occupancy: ${a.occupancy}` : ""}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{new Date(a.timestamp).toLocaleDateString()}</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{new Date(a.timestamp).toLocaleTimeString()}</p>
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

// ═══════════════════════════════════════════════════════════════
// MAIN DRIVER PANEL
// ═══════════════════════════════════════════════════════════════
const DriverPanel = () => {
  const { user } = useAuth();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === "/driver/live-map") return "live-map";
    if (location.pathname === "/driver/maintenance") return "maintenance";
    if (location.pathname === "/driver/alerts") return "alerts";
    return "overview";
  };

  const activeTab = getActiveTab();

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab user={user} />;
      case "live-map": return <LiveLocationTab />;
      case "maintenance": return <MaintenanceTab user={user} />;
      case "alerts": return <AlertLogTab user={user} />;
      default: return <OverviewTab user={user} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 1200, margin: "0 auto", animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{
          padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))",
        }}>
          <Bus size={24} color="#fff" />
        </div>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>Driver Panel</h1>
      </div>

      <div>{renderTab()}</div>
    </div>
  );
};

export default DriverPanel;
