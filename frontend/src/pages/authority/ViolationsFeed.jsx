import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { AlertTriangle, Clock, MapPin } from "lucide-react";

const ViolationsFeed = () => {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [violations, setViolations] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [loadingViolations, setLoadingViolations] = useState(false);

  // 1. Fetch all buses on mount
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const response = await api.get("/bus");
        setBuses(response.data);
        if (response.data.length > 0) {
          setSelectedBusId(response.data[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch buses", error);
      } finally {
        setLoadingBuses(false);
      }
    };
    fetchBuses();
  }, []);

  // 2. Fetch violations when selectedBusId changes
  useEffect(() => {
    if (!selectedBusId) return;

    const fetchViolations = async () => {
      setLoadingViolations(true);
      try {
        // Backend returns: { bus: {...}, violations: [...], pagination: {...} }
        const response = await api.get(`/bus/${selectedBusId}/violations`);
        setViolations(response.data.violations || []);
      } catch (error) {
        console.error("Failed to fetch violations", error);
        setViolations([]);
      } finally {
        setLoadingViolations(false);
      }
    };
    fetchViolations();
  }, [selectedBusId]);

  const getViolationBadge = (type) => {
    switch (type) {
      case "footboard":
        return <Badge variant="danger">Footboard</Badge>;
      case "speeding":
        return <Badge variant="danger">Speeding</Badge>;
      case "overcrowding":
        return <Badge variant="warning">Overcrowding</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loadingBuses) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>Loading buses...</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
          Violation Log
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            htmlFor="bus-select"
            style={{ fontWeight: 500, color: "#475569" }}
          >
            Select Bus:
          </label>
          <select
            id="bus-select"
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              minWidth: 200,
            }}
          >
            {buses.length === 0 && <option value="">No buses available</option>}
            {buses.map((bus) => (
              <option key={bus._id} value={bus._id}>
                {bus.licensePlate} ({bus.routeId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingViolations ? (
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
          Loading violation history...
        </div>
      ) : violations.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 48, textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: 16 }}>
              No violations recorded for this bus.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {violations.map((violation) => (
            <Card
              key={violation._id}
              style={{ borderLeft: "4px solid #ef4444" }}
            >
              <CardContent
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  justifyContent: "space-between",
                  ...(window.innerWidth >= 768
                    ? { flexDirection: "row", alignItems: "center" }
                    : {}),
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 16 }}
                >
                  <div
                    style={{
                      padding: 8,
                      background: "#fee2e2",
                      borderRadius: 9999,
                      color: "#dc2626",
                      marginTop: 4,
                    }}
                  >
                    <AlertTriangle style={{ height: 20, width: 20 }} />
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <h3
                        style={{
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#0f172a",
                        }}
                      >
                        {violation.licensePlate || "Unknown Bus"}
                      </h3>
                      {getViolationBadge(violation.type)}
                    </div>
                    <p style={{ color: "#475569", fontWeight: 500 }}>
                      {violation.description ||
                        `Violation type: ${violation.type}`}
                    </p>
                    {violation.speed && (
                      <p
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                          marginTop: 4,
                        }}
                      >
                        Speed: {violation.speed} km/h
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    fontSize: 14,
                    color: "#64748b",
                    minWidth: 150,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Clock style={{ height: 16, width: 16 }} />
                    {new Date(violation.timestamp).toLocaleTimeString()}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <MapPin style={{ height: 16, width: 16 }} />
                    {violation.location
                      ? `${violation.location.lat}, ${violation.location.lon}`
                      : "Colombo, LK"}
                  </div>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {new Date(violation.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViolationsFeed;
