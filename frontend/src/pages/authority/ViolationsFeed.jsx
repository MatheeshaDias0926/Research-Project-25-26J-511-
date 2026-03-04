import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { AlertTriangle, Clock, MapPin } from "lucide-react";

// Sub-component to handle individual violation display and geocoding
const ViolationCard = ({ violation, getViolationBadge }) => {
  const [address, setAddress] = useState("Loading location...");

  useEffect(() => {
    const fetchAddress = async () => {
      if (!violation.gps || !violation.gps.lat || !violation.gps.lon) {
        setAddress("Location N/A");
        return;
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${violation.gps.lat}&lon=${violation.gps.lon}`
        );
        const data = await res.json();
        setAddress(data.display_name || "Unknown Location");
      } catch (error) {
        console.error("Failed to fetch address", error);
        setAddress("Unknown Location");
      }
    };

    fetchAddress();
  }, [violation.gps]);

  return (
    <Card style={{ borderLeft: "4px solid #ef4444" }}>
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
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
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
              <h3 style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                {violation.busId?.licensePlate || "Unknown Bus"}
              </h3>
              {getViolationBadge(violation.violationType)}
            </div>
            <p style={{ color: "var(--text-label)", fontWeight: 500 }}>
              Violation type: {violation.violationType}
            </p>
            {violation.speed && (
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                Speed: {violation.speed} km/h
              </p>
            )}
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              <MapPin style={{ height: 12, width: 12, marginRight: 4, display: "inline" }} />
              {address}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            fontSize: 14,
            color: "var(--text-secondary)",
            minWidth: 150,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock style={{ height: 16, width: 16 }} />
            {new Date(violation.createdAt).toLocaleTimeString()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${violation.gps?.lat},${violation.gps?.lon}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb", textDecoration: "none", fontSize: 12 }}
            >
              View on Google Maps
            </a>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date(violation.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

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
            style={{ fontWeight: 500, color: "var(--text-label)" }}
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
              border: "1px solid var(--border-input)",
              background: "var(--bg-card)",
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
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-secondary)" }}>
          Loading violation history...
        </div>
      ) : violations.length === 0 ? (
        <Card>
          <CardContent style={{ padding: 48, textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              No violations recorded for this bus.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {violations.map((violation) => (
            <ViolationCard
              key={violation._id}
              violation={violation}
              getViolationBadge={getViolationBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ViolationsFeed;
