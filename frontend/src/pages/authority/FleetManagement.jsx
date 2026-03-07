import { useState, useEffect } from "react";
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
import Badge from "../../components/ui/Badge";
import { Bus, Plus, RefreshCw } from "lucide-react";

const FleetManagement = () => {
  const { register, handleSubmit, reset } = useForm();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const response = await api.get("/bus");
      setBuses(response.data);
    } catch (error) {
      console.error("Failed to fetch buses", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        licensePlate: data.licensePlate,
        routeId: data.routeId,
        capacity: parseInt(data.capacity),
      };
      await api.post("/bus", payload);
      reset();
      setIsAdding(false);
      fetchBuses(); // Refresh list
    } catch (error) {
      console.error("Failed to create bus", error);
      alert(
        "Failed to create bus: " +
        (error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>
            Fleet Management
          </h1>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Plus style={{ height: 16, width: 16 }} /> Add New Bus
        </Button>
      </div>

      {isAdding && (
        <Card
          style={{
            animation: "slideInTop 0.3s",
            border: "1px solid #bae6fd",
            background: "var(--color-info-50)",
          }}
        >
          <CardHeader>
            <CardTitle style={{ fontSize: 18 }}>Register New Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <label
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
                >
                  License Plate
                </label>
                <Input
                  {...register("licensePlate", { required: true })}
                  placeholder="NP-XXXX"
                />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <label
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
                >
                  Route ID
                </label>
                <Input
                  {...register("routeId", { required: true })}
                  placeholder="ROUTE-XXX"
                />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <label
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
                >
                  Capacity
                </label>
                <Input
                  type="number"
                  {...register("capacity", { required: true })}
                  placeholder="50"
                />
              </div>
              <Button type="submit">Create Bus</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <CardTitle>Active Fleet</CardTitle>
          <button
            onClick={fetchBuses}
            style={{
              color: "var(--text-muted)",
              transition: "color 0.2s",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#0284c7")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <RefreshCw style={{ height: 20, width: 20 }} />
          </button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              Loading fleet data...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14, textAlign: "left" }}>
                <thead
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    background: "var(--bg-muted)",
                  }}
                >
                  <tr>
                    <th style={{ padding: "12px" }}>License Plate</th>
                    <th style={{ padding: "12px" }}>Route</th>
                    <th style={{ padding: "12px" }}>Capacity</th>
                    <th style={{ padding: "12px" }}>Status</th>
                    <th style={{ padding: "12px" }}>System ID</th>
                  </tr>
                </thead>
                <tbody>
                  {buses.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        style={{
                          textAlign: "center",
                          padding: "32px 0",
                          color: "var(--text-muted)",
                        }}
                      >
                        No buses in fleet.
                      </td>
                    </tr>
                  )}
                  {buses.map((bus) => (
                    <tr
                      key={bus._id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#f8fafc")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          padding: "12px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Bus
                          style={{ height: 16, width: 16, color: "var(--text-muted)" }}
                        />
                        {bus.licensePlate}
                      </td>
                      <td style={{ padding: "12px" }}>{bus.routeId}</td>
                      <td style={{ padding: "12px" }}>{bus.capacity}</td>
                      <td style={{ padding: "12px" }}>
                        <Badge
                          variant={

                            (typeof bus.currentStatus === "string" &&
                              bus.currentStatus === "active") ||
                              (typeof bus.currentStatus === "object" &&
                                bus.currentStatus)
                              ? "success"
                              : "secondary"
                          }
                        >
                          {typeof bus.currentStatus === "object"
                            ? "Active"
                            : bus.currentStatus || "Inactive"}
                        </Badge>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        {bus._id}
                      </td>
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

export default FleetManagement;
