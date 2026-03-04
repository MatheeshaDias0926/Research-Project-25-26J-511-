import { useContext, useEffect, useState } from "react";
import { EmergencyContext } from "../../context/EmergencyContext";
import { AlertTriangle, X, MapPin, Clock } from "lucide-react";

// Inject pulse keyframe animation once
const STYLE_ID = "crash-alert-pulse-style";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes crashPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes crashSlideIn {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const timeAgo = (timestamp) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const severityConfig = {
  critical: { label: "CRITICAL", bg: "#991b1b", border: "#7f1d1d" },
  high: { label: "HIGH", bg: "#c2410c", border: "#9a3412" },
  medium: { label: "MEDIUM", bg: "#a16207", border: "#854d0e" },
  low: { label: "LOW", bg: "#1d4ed8", border: "#1e40af" },
};

const CrashAlertBanner = () => {
  const { visibleAlerts, newCrashIds, dismissCrash } = useContext(EmergencyContext);
  const [, setTick] = useState(0);

  // Re-render every 30s to update "time ago"
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!visibleAlerts || visibleAlerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {visibleAlerts.map((crash) => {
        const isNew = newCrashIds.has(crash._id);
        const sev = severityConfig[crash.severity] || severityConfig.medium;
        const location = crash.location?.address ||
          (crash.location
            ? `${crash.location.latitude || crash.location.lat}, ${crash.location.longitude || crash.location.lon}`
            : "Unknown location");

        return (
          <div
            key={crash._id}
            style={{
              background: isNew
                ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                : "#dc2626",
              color: "#ffffff",
              borderRadius: 12,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              animation: isNew
                ? "crashPulse 1.5s ease-in-out infinite, crashSlideIn 0.4s ease-out"
                : "crashSlideIn 0.4s ease-out",
              boxShadow: isNew
                ? "0 4px 20px rgba(220, 38, 38, 0.5)"
                : "0 2px 8px rgba(220, 38, 38, 0.3)",
              position: "relative",
            }}
          >
            {/* Icon */}
            <div
              style={{
                padding: 10,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 9999,
                flexShrink: 0,
              }}
            >
              <AlertTriangle style={{ height: 22, width: 22 }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: "0.5px",
                  }}
                >
                  CRASH DETECTED
                </span>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    textTransform: "uppercase",
                  }}
                >
                  {sev.label}
                </span>
                {isNew && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.25)",
                    }}
                  >
                    NEW
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 4,
                  fontSize: 13,
                  opacity: 0.9,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  Bus: {crash.bus_id || crash.busId?.licensePlate || "N/A"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin style={{ height: 13, width: 13 }} />
                  {location}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock style={{ height: 13, width: 13 }} />
                  {timeAgo(crash.timestamp)}
                </span>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismissCrash(crash._id)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 9999,
                padding: 6,
                cursor: "pointer",
                color: "#ffffff",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Dismiss alert"
            >
              <X style={{ height: 18, width: 18 }} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CrashAlertBanner;
