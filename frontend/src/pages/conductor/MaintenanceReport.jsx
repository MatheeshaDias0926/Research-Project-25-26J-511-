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
import { Wrench, CheckCircle } from "lucide-react";

const MaintenanceReport = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Hardcoded bus ID for demo since user->bus link isn't strict in backend yet
  // In production we'd pick from list or assigned bus
  const busId = "6740b3b3a6c9e1234567890a"; // Example ID, might fail if not seeded.
  // Actually, let's ask user for Bus ID text or just use a dummy one if we don't fetch list.
  // Better: Text input for Bus License Plate or ID for flexibility in demo.

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Need to fetch bus ID from license plate first usually, or just assume we have ID.
      // Let's assume user inputs Bus ID directly or we fetch it.
      // Simplified: User inputs Bus ID (mongo ID) for now as backend requires it.
      // Or we just send the form data and let backend validation pass if ID format valid.
      const payload = {
        busId: data.busId,
        issue: data.issue,
        description: data.description,
        priority: data.priority,
      };
      await api.post("/maintenance", payload);
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Maintenance report failed", error);
      alert("Failed to submit report. Please check Bus ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 672,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
        Report Issue
      </h1>

      <Card>
        <CardHeader>
          <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench style={{ height: 24, width: 24, color: "#2563eb" }} />
            Maintenance Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: "#f0fdf4",
                color: "#15803d",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle style={{ height: 20, width: 20 }} />
              Report submitted successfully!
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Bus ID (System ID)
              </label>
              <Input
                {...register("busId", { required: "Bus ID is required" })}
                placeholder="e.g. 6740..."
              />
              <p style={{ fontSize: 12, color: "#94a3b8" }}>
                Copy ID from Bus List in Authority view for testing
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Issue Type
              </label>
              <Input
                {...register("issue", { required: "Issue title is required" })}
                placeholder="e.g. Brake Failure"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Description
              </label>
              <textarea
                {...register("description", { required: true })}
                style={{
                  display: "flex",
                  minHeight: 100,
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  padding: "8px 12px",
                  fontSize: 14,
                  outline: "none",
                }}
                placeholder="Describe the problem in detail..."
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label
                style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
              >
                Priority
              </label>
              <select
                {...register("priority")}
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <Button type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceReport;
