import { useState, useEffect, useRef } from "react";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Radio,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Zap,
  MapPin,
} from "lucide-react";

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Risk-based bus icons
const createBusIcon = (riskScore) => {
  let color = "#22c55e"; // green (safe)
  if (riskScore > 0.7)
    color = "#dc2626"; // red (critical)
  else if (riskScore > 0.5)
    color = "#f97316"; // orange (warning)
  else if (riskScore > 0.3) color = "#eab308"; // yellow (caution)

  return L.divIcon({
    className: "custom-bus-icon",
    html: `<div style="
      background: ${color};
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.9);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 18px;
    ">🚌</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center]);
  return null;
};

const getRiskLevel = (score) => {
  if (!score || score <= 0.3)
    return { label: "SAFE", color: "#22c55e", bg: "#f0fdf4" };
  if (score <= 0.5)
    return { label: "CAUTION", color: "#eab308", bg: "#fefce8" };
  if (score <= 0.7)
    return { label: "WARNING", color: "#f97316", bg: "#fff7ed" };
  return { label: "CRITICAL", color: "#dc2626", bg: "#fef2f2" };
};

const LiveMonitor = () => {
  const [buses, setBuses] = useState([]);
  const [gpsFeeds, setGpsFeeds] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [violations, setViolations] = useState([]);
  const [mapCenter, setMapCenter] = useState([6.9271, 79.8612]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollRef = useRef(null);
  const selectedBusRef = useRef(null);

  // Keep ref in sync so the poll interval always sees the latest selectedBus
  useEffect(() => {
    selectedBusRef.current = selectedBus;
  }, [selectedBus]);

  // Fetch all bus data + GPS feeds
  const fetchData = async () => {
    try {
      const [busRes, gpsRes] = await Promise.all([
        api.get("/bus"),
        api.get("/iot/gps-feeds"),
      ]);

      const allBuses = busRes.data || [];

      // Populate each bus with its currentStatus
      const enriched = await Promise.all(
        allBuses.map(async (bus) => {
          try {
            const statusRes = await api.get(`/bus/${bus._id}/status`);
            return {
              ...bus,
              currentStatus: statusRes.data?.currentStatus || null,
            };
          } catch {
            return { ...bus, currentStatus: null };
          }
        }),
      );

      setBuses(enriched);
      setGpsFeeds(gpsRes.data?.feeds || []);
      setLastUpdate(new Date());

      // Refresh selectedBus with latest data so Live Status panel updates in real-time
      const currentSelected = selectedBusRef.current;
      if (currentSelected) {
        const fresh = enriched.find((b) => b._id === currentSelected._id);
        if (fresh) setSelectedBus(fresh);

        // Fetch violations for the selected bus
        try {
          const violRes = await api.get(
            `/bus/${currentSelected._id}/violations`,
          );
          setViolations(violRes.data?.violations || violRes.data || []);
        } catch {
          setViolations([]);
        }
      }
    } catch (err) {
      console.error("LiveMonitor fetch error:", err);
    }
  };

  // Poll every 3 seconds
  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Active buses with GPS data
  const activeBuses = buses.filter(
    (b) =>
      b.currentStatus?.gps &&
      b.currentStatus.gps.lat !== 0 &&
      b.currentStatus.gps.lon !== 0,
  );

  // Stats
  const totalActive = activeBuses.length;
  const criticalCount = activeBuses.filter(
    (b) => (b.currentStatus?.riskScore || 0) > 0.7,
  ).length;
  const warningCount = activeBuses.filter(
    (b) =>
      (b.currentStatus?.riskScore || 0) > 0.5 &&
      (b.currentStatus?.riskScore || 0) <= 0.7,
  ).length;

  const handleBusClick = (bus) => {
    setSelectedBus(bus);
    if (bus.currentStatus?.gps) {
      setMapCenter([bus.currentStatus.gps.lat, bus.currentStatus.gps.lon]);
    }
  };

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Radio className="text-green-600" size={28} />
            Live Monitoring
          </h1>
          <p style={{ color: "#64748b" }}>
            Real-time bus tracking, rollover risk & violation monitoring
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: totalActive > 0 ? "#22c55e" : "#94a3b8",
              animation: totalActive > 0 ? "pulse 2s infinite" : "none",
            }}
          />
          <span style={{ fontSize: 13, color: "#64748b" }}>
            {totalActive} active {totalActive === 1 ? "bus" : "buses"}
          </span>
          {lastUpdate && (
            <span
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginLeft: 12,
              }}
            >
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card>
          <CardContent
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity size={20} color="#0284c7" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
                {totalActive}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Active Buses</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#f0fdf4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} color="#22c55e" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>
                {totalActive - criticalCount - warningCount}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Safe</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={20} color="#f97316" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>
                {warningCount}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Warning</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>
                {criticalCount}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Critical</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Map + Details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 24,
        }}
      >
        {/* Map */}
        <Card
          style={{
            height: "calc(100vh - 280px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardHeader
            style={{
              padding: "12px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <CardTitle
              style={{
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MapPin size={16} /> Fleet Map — Real-Time
            </CardTitle>
          </CardHeader>
          <div style={{ flex: 1 }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
                subdomains={["mt0", "mt1", "mt2", "mt3"]}
              />
              <MapRecenter center={mapCenter} />

              {activeBuses.map((bus) => {
                const risk = bus.currentStatus?.riskScore || 0;
                const riskInfo = getRiskLevel(risk);
                return (
                  <Marker
                    key={bus._id}
                    position={[
                      bus.currentStatus.gps.lat,
                      bus.currentStatus.gps.lon,
                    ]}
                    icon={createBusIcon(risk)}
                    eventHandlers={{
                      click: () => handleBusClick(bus),
                    }}
                  >
                    <Popup>
                      <div style={{ textAlign: "center", minWidth: 160 }}>
                        <strong style={{ fontSize: 16 }}>
                          {bus.licensePlate}
                        </strong>
                        <br />
                        <span
                          style={{
                            color: riskInfo.color,
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {riskInfo.label} ({risk.toFixed(2)})
                        </span>
                        <br />
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Speed: {bus.currentStatus?.speed || 0} km/h
                          <br />
                          Passengers: {bus.currentStatus?.currentOccupancy || 0}
                          /{bus.capacity}
                        </span>
                        {bus.currentStatus?.distToCurve > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              padding: "3px 8px",
                              background: "#fef2f2",
                              borderRadius: 4,
                              fontSize: 11,
                              color: "#dc2626",
                              fontWeight: 600,
                            }}
                          >
                            ⚠️ Curve Ahead:{" "}
                            {bus.currentStatus.distToCurve.toFixed(0)}m
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </Card>

        {/* Right Panel: Bus Details + Violations */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
          }}
        >
          {/* Bus List */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 14 }}>Fleet Status</CardTitle>
            </CardHeader>
            <CardContent
              style={{
                padding: "0 16px 16px",
                maxHeight: 250,
                overflowY: "auto",
              }}
            >
              {buses.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>No buses found</p>
              ) : (
                buses.map((bus) => {
                  const risk = bus.currentStatus?.riskScore || 0;
                  const riskInfo = getRiskLevel(risk);
                  const hasGps =
                    bus.currentStatus?.gps && bus.currentStatus.gps.lat !== 0;
                  const isSelected = selectedBus?._id === bus._id;

                  return (
                    <div
                      key={bus._id}
                      onClick={() => handleBusClick(bus)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 8,
                        marginBottom: 6,
                        cursor: "pointer",
                        background: isSelected ? "#e0f2fe" : "#f8fafc",
                        border: isSelected
                          ? "2px solid #0284c7"
                          : "1px solid #e2e8f0",
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#1e293b",
                          }}
                        >
                          {bus.licensePlate}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Route {bus.routeId} • Cap: {bus.capacity}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {hasGps && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            {bus.currentStatus?.speed?.toFixed(0) || 0} km/h
                          </span>
                        )}
                        <div
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: hasGps ? riskInfo.bg : "#f1f5f9",
                            color: hasGps ? riskInfo.color : "#94a3b8",
                          }}
                        >
                          {hasGps ? riskInfo.label : "OFFLINE"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Selected Bus Detail */}
          {selectedBus && (
            <Card>
              <CardHeader>
                <CardTitle
                  style={{
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Zap size={16} />
                  {selectedBus.licensePlate} — Live Status
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: "0 16px 16px" }}>
                {(() => {
                  const status = selectedBus.currentStatus;
                  const risk = status?.riskScore || 0;
                  const riskInfo = getRiskLevel(risk);

                  return (
                    <>
                      {/* Risk Score Banner */}
                      <div
                        style={{
                          padding: 16,
                          borderRadius: 10,
                          background: riskInfo.color,
                          color: "#fff",
                          textAlign: "center",
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.9,
                            marginBottom: 4,
                          }}
                        >
                          ROLLOVER RISK
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800 }}>
                          {riskInfo.label}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            opacity: 0.9,
                            marginTop: 2,
                          }}
                        >
                          Score: {risk.toFixed(3)}
                        </div>
                        {status?.distToCurve > 0 && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: "4px 10px",
                              background: "rgba(255,255,255,0.25)",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 700,
                              display: "inline-block",
                            }}
                          >
                            ⚠️ Curve Ahead: {status.distToCurve.toFixed(0)}m
                          </div>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            padding: 10,
                            background: "#f8fafc",
                            borderRadius: 8,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {status?.speed?.toFixed(0) || 0}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            km/h
                          </div>
                        </div>
                        <div
                          style={{
                            padding: 10,
                            background: "#f8fafc",
                            borderRadius: 8,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {status?.currentOccupancy || 0}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            Passengers
                          </div>
                        </div>
                        <div
                          style={{
                            padding: 10,
                            background: "#f8fafc",
                            borderRadius: 8,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: status?.footboardStatus
                                ? "#dc2626"
                                : "#22c55e",
                            }}
                          >
                            {status?.footboardStatus ? "YES" : "NO"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            Footboard
                          </div>
                        </div>
                        <div
                          style={{
                            padding: 10,
                            background: "#f8fafc",
                            borderRadius: 8,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {status?.gps
                              ? `${status.gps.lat.toFixed(3)}`
                              : "N/A"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            Latitude
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Violations Feed */}
          {selectedBus && (
            <Card>
              <CardHeader>
                <CardTitle
                  style={{
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#dc2626",
                  }}
                >
                  <AlertTriangle size={16} />
                  Recent Violations
                </CardTitle>
              </CardHeader>
              <CardContent
                style={{
                  padding: "0 16px 16px",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {violations.length === 0 ? (
                  <div
                    style={{
                      padding: 12,
                      background: "#f0fdf4",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#15803d",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ShieldCheck size={16} />
                    No violations recorded
                  </div>
                ) : (
                  violations.slice(0, 10).map((v, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px 10px",
                        background: "#fef2f2",
                        borderRadius: 6,
                        marginBottom: 6,
                        borderLeft: "3px solid #dc2626",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: "#dc2626",
                            textTransform: "uppercase",
                          }}
                        >
                          {v.violationType}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {new Date(
                            v.createdAt || v.timestamp,
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          marginTop: 2,
                        }}
                      >
                        Speed: {v.speed || 0} km/h • Occ:{" "}
                        {v.occupancyAtViolation || 0}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* GPS Feed Status */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 14 }}>GPS Feed Status</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "0 16px 16px" }}>
              {gpsFeeds.length === 0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  No active GPS feeds. Start the conductor app on the bus.
                </p>
              ) : (
                gpsFeeds.map((feed, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom:
                        i < gpsFeeds.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: "#22c55e",
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "#1e293b",
                        }}
                      >
                        {feed.licensePlate}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {feed.speed?.toFixed(0) || 0} km/h •{" "}
                      {(feed.ageMs / 1000).toFixed(0)}s ago
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default LiveMonitor;
