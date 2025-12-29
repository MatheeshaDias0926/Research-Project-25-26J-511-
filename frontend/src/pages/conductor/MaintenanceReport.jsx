import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext"; // Import useAuth
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Wrench, CheckCircle, Bus, AlertCircle } from "lucide-react";

const MaintenanceReport = () => {
  const { user } = useAuth(); // Get user from context
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-set the busId when component loads or user changes
  useEffect(() => {
    if (user?.assignedBus?._id) {
      setValue("busId", user.assignedBus._id);
    }
  }, [user, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        busId: data.busId,
        issue: data.issue,
        description: data.description,
        priority: data.priority,
      };
      await api.post("/maintenance", payload);
      setSuccess(true);
      // Only reset the other fields, keep busId
      reset({
        busId: user?.assignedBus?._id, // Keep the bus ID
        issue: "",
        description: "",
        priority: "medium"
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Maintenance report failed", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div style={{ paddingBottom: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>
          Report Issue
        </h1>
        <p style={{ color: "#64748b", marginTop: 4 }}>
          Submit a maintenance request for your assigned bus.
        </p>
      </div>

      <Card>
        <CardHeader style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#eff6ff", padding: 8, borderRadius: 8, color: "#2563eb" }}>
              <Wrench size={20} />
            </div>
            Maintenance Ticket
          </CardTitle>
        </CardHeader>
        <CardContent style={{ paddingTop: 24 }}>
          {success && (
            <div
              style={{
                marginBottom: 24,
                padding: "12px 16px",
                background: "#f0fdf4",
                color: "#166534",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid #bbf7d0"
              }}
            >
              <CheckCircle size={20} />
              Maintenance report submitted successfully!
            </div>
          )}

          {/* Warning if no bus is assigned */}
          {!user?.assignedBus && (
            <div
              style={{
                marginBottom: 24,
                padding: "12px 16px",
                background: "#fef2f2",
                color: "#dc2626",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid #fecaca"
              }}
            >
              <AlertCircle size={20} />
              You do not have a bus assigned. Please contact authority.
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {/* Bus Info Section */}
            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Reporting For Bus
              </label>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <Bus size={24} color="#334155" />
                <div>
                  {user.assignedBus ? (
                    <>
                      <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                        {user.assignedBus.licensePlate || "Unknown Plate"}
                      </p>
                      <p style={{ fontSize: 13, color: "#64748b" }}>
                        Route {user.assignedBus.routeId || "N/A"} • System ID: {user.assignedBus._id}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: "#ef4444", fontWeight: 600 }}>No Bus Assigned</p>
                  )}
                </div>
              </div>
              {/* Hidden input to store ID for form submission */}
              <input
                type="hidden"
                {...register("busId", { required: "Bus ID is required" })}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Issue Title
              </label>
              <Input
                {...register("issue", { required: "Issue title is required" })}
                placeholder="e.g. Engine Overheating, Brake Noise"
                disabled={!user?.assignedBus}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Detailed Description
              </label>
              <textarea
                {...register("description", { required: true })}
                style={{
                  display: "flex",
                  minHeight: 120,
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  padding: "10px 14px",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
                placeholder="Describe the problem in detail so the maintenance team can understand..."
                disabled={!user?.assignedBus}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Priority Level
              </label>
              <select
                {...register("priority")}
                style={{
                  display: "flex",
                  height: 42,
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  padding: "0 12px",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                  color: "#0f172a"
                }}
                disabled={!user?.assignedBus}
              >
                <option value="low">Low - Minor cosmetic issues</option>
                <option value="medium">Medium - Non-critical mechanical issues</option>
                <option value="high">High - Urgent, but bus can move</option>
                <option value="critical">Critical - Immediate attention required</option>
              </select>
            </div>

            <Button
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading || !user?.assignedBus}
            >
              {loading ? "Submitting Request..." : "Submit Maintenance Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceReport;
