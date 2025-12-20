
import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { UserPlus, Bus } from "lucide-react";

const ConductorManagement = () => {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        busId: "",
    });
    const [availableBuses, setAvailableBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        fetchAvailableBuses();
    }, []);

    const fetchAvailableBuses = async () => {
        try {
            const res = await api.get("/bus/available");
            setAvailableBuses(res.data);
        } catch (error) {
            console.error("Failed to fetch buses", error);
            setMessage({
                type: "error",
                text: "Failed to load available buses.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            const payload = {
                ...formData,
                role: "conductor",
            };

            await api.post("/auth/register", payload);

            setMessage({
                type: "success",
                text: "Conductor registered successfully and assigned to bus!",
            });

            // Reset form and refresh list (the assigned bus is no longer available)
            setFormData({ username: "", password: "", busId: "" });
            fetchAvailableBuses();

        } catch (error) {
            console.error("Registration failed", error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Registration failed.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1
                style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: 32,
                }}
            >
                Manage Conductors
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <UserPlus size={24} />
                        Register New Conductor
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {message.text && (
                        <div
                            style={{
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 20,
                                backgroundColor:
                                    message.type === "error" ? "#fee2e2" : "#dcfce7",
                                color: message.type === "error" ? "#dc2626" : "#166534",
                            }}
                        >
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 500,
                                    fontSize: 14,
                                }}
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #e2e8f0",
                                    outline: "none",
                                }}
                                placeholder="Enter username"
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 500,
                                    fontSize: 14,
                                }}
                            >
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #e2e8f0",
                                    outline: "none",
                                }}
                                placeholder="Enter password"
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 500,
                                    fontSize: 14,
                                }}
                            >
                                Assign Bus
                            </label>
                            <select
                                name="busId"
                                value={formData.busId}
                                onChange={handleChange}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #e2e8f0",
                                    outline: "none",
                                    backgroundColor: "white",
                                }}
                            >
                                <option value="">Select a Bus</option>
                                {loading ? (
                                    <option disabled>Loading buses...</option>
                                ) : (
                                    availableBuses.map((bus) => (
                                        <option key={bus._id} value={bus._id}>
                                            {bus.licensePlate} (Route: {bus.routeId})
                                        </option>
                                    ))
                                )}
                            </select>
                            {availableBuses.length === 0 && !loading && (
                                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                                    No available buses found. create a new bus first.
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={submitting || (availableBuses.length === 0 && !formData.busId)}
                            style={{ marginTop: 8 }}
                        >
                            {submitting ? "Registering..." : "Register Conductor"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ConductorManagement;
