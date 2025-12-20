import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { RadioTower, Send } from "lucide-react";

const IoTSimulator = () => {
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Construct payload to match backend expectation
      // Backend expects: { licensePlate, currentOccupancy, gps: { lat, lon }, footboardStatus, speed }
      const payload = {
        licensePlate: data.licensePlate,
        currentOccupancy: parseInt(data.occupancy),
        gps: {
          lat: 6.9271, // Static for now
          lon: 79.8612,
        },
        footboardStatus: data.footboard === "true", // Convert string "true" to boolean
        speed: parseInt(data.speed),
      };

      await api.post("/iot/mock-data", payload);

      // Add to local logs
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        ...payload,
        status: "Sent",
      };
      setLogs([newLog, ...logs]);

      // reset(); // Keep values for easy repetitive testing? Maybe better not to reset completely.
    } catch (error) {
      console.error("Failed to send mock data", error);
      alert(
        "Failed to send data: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <RadioTower style={{ height: 32, width: 32, color: "#2563eb" }} />
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
          IoT Simulator
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32 }}>
        <div>
          <Card style={{ position: "sticky", top: 24 }}>
            <CardHeader>
              <CardTitle>Send Telemetry</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
                  >
                    License Plate
                  </label>
                  <Input
                    {...register("licensePlate", { required: true })}
                    placeholder="NP-1234"
                    defaultValue="NP-1234"
                  />
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
                  >
                    Speed (km/h)
                  </label>
                  <Input
                    type="number"
                    {...register("speed", { required: true })}
                    defaultValue="45"
                  />
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
                  >
                    Occupancy
                  </label>
                  <Input
                    type="number"
                    {...register("occupancy", { required: true })}
                    defaultValue="30"
                  />
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
                  >
                    Footboard Status
                  </label>
                  <select
                    {...register("footboard")}
                    style={{
                      display: "flex",
                      height: 40,
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      padding: "8px 12px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  >
                    <option value="false">Clear (False)</option>
                    <option value="true">Obstructed (True)</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  style={{ width: "100%" }}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Data Packet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card style={{ minHeight: 500, height: "100%" }}>
            <CardHeader>
              <CardTitle>Transmission Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {logs.length === 0 && (
                  <p
                    style={{
                      color: "#64748b",
                      textAlign: "center",
                      padding: "32px 0",
                    }}
                  >
                    No data sent yet.
                  </p>
                )}
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 12,
                      background: "#f8fafc",
                      borderRadius: 8,
                      border: "1px solid #f1f5f9",
                      fontFamily: "monospace",
                      fontSize: 14,
                    }}
                  >
                    <div>
                      <span style={{ color: "#94a3b8", marginRight: 12 }}>
                        [{log.timestamp}]
                      </span>
                      <span style={{ fontWeight: 700, color: "#334155" }}>
                        {log.licensePlate}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, color: "#475569" }}>
                      <span>{log.speed} km/h</span>
                      <span>{log.currentOccupancy} pax</span>
                      <span
                        style={{
                          color: log.footboardStatus ? "#ef4444" : "#22c55e",
                          fontWeight: 700,
                        }}
                      >
                        FB: {log.footboardStatus ? "YES" : "NO"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IoTSimulator;
