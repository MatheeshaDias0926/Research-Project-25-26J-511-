
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
    const [conductors, setConductors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingConductors, setLoadingConductors] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        fetchAvailableBuses();
        fetchConductors();
    }, []);

    const fetchConductors = async () => {
        try {
            const res = await api.get("/auth/conductors");
            setConductors(res.data);
        } catch (error) {
            console.error("Failed to fetch conductors", error);
        } finally {
            setLoadingConductors(false);
        }
    };

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
            fetchConductors();

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

            <div style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>
                    Registered Conductors
                </h2>
                {loadingConductors ? (
                    <div style={{ textAlign: "center", padding: 20 }}>Loading conductors...</div>
                ) : conductors.length === 0 ? (
                    <Card><CardContent style={{ padding: 20, textAlign: "center" }}>No conductors found.</CardContent></Card>
                ) : (
                    <div style={{ display: "grid", gap: 16 }}>
                        {conductors.map((conductor) => (
                            <Card key={conductor._id}>
                                <CardContent
                                    style={{
                                        padding: 20,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                                            {conductor.username}
                                        </p>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                            <Bus size={14} style={{ color: "#64748b" }} />
                                            <p style={{ fontSize: 14, color: "#64748b" }}>
                                                {conductor.assignedBus ? (
                                                    <span>
                                                        Assigned to: <span style={{ fontWeight: 500, color: "#0f172a" }}>{conductor.assignedBus.licensePlate}</span> (Route {conductor.assignedBus.routeId})
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#ef4444" }}>No bus assigned</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            padding: "4px 12px",
                                            borderRadius: 9999,
                                            backgroundColor: "#f0fdf4",
                                            color: "#166534",
                                            fontSize: 12,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Active
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConductorManagement;
