import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { UserPlus, Bus, Search, User, CheckCircle } from "lucide-react";

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
    const [searchTerm, setSearchTerm] = useState("");

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
                text: "Conductor registered successfully!",
            });

            // Reset form and refresh list
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

    const filteredConductors = conductors.filter(c =>
        c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.assignedBus?.licensePlate || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>
                    Manage Conductors
                </h1>
                <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                    Register new conductors and manage existing fleet assignments.
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

                {/* Left Column: Register Form */}
                <div>
                    <Card style={{ position: "sticky", top: 20 }}>
                        <CardHeader style={{ borderBottom: "1px solid var(--bg-muted)", paddingBottom: 16 }}>
                            <CardTitle style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 18 }}>
                                <div style={{ background: "#eff6ff", padding: 8, borderRadius: 8, color: "#2563eb" }}>
                                    <UserPlus size={20} />
                                </div>
                                Register New Conductor
                            </CardTitle>
                        </CardHeader>
                        <CardContent style={{ paddingTop: 24 }}>
                            {message.text && (
                                <div
                                    style={{
                                        padding: "12px 16px",
                                        borderRadius: 8,
                                        marginBottom: 24,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        backgroundColor:
                                            message.type === "error" ? "#fef2f2" : "#f0fdf4",
                                        color: message.type === "error" ? "#dc2626" : "#166534",
                                        border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}`
                                    }}
                                >
                                    {message.type === "success" && <CheckCircle size={18} />}
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "var(--text-body)" }}>
                                        Username
                                    </label>
                                    <Input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. johndoe"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "var(--text-body)" }}>
                                        Password
                                    </label>
                                    <Input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="Min. 6 characters"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "var(--text-body)" }}>
                                        Assign Bus
                                        <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-secondary)", fontWeight: 400 }}>
                                            {availableBuses.length} buses available
                                        </span>
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <select
                                            name="busId"
                                            value={formData.busId}
                                            onChange={handleChange}
                                            required
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                borderRadius: 6,
                                                border: "1px solid var(--border-primary)",
                                                outline: "none",
                                                backgroundColor: "var(--bg-card)",
                                                appearance: "none",
                                                cursor: "pointer",
                                                fontSize: 14
                                            }}
                                        >
                                            <option value="">Select a Bus to Assign</option>
                                            {availableBuses.map((bus) => (
                                                <option key={bus._id} value={bus._id}>
                                                    {bus.licensePlate} — Route {bus.routeId}
                                                </option>
                                            ))}
                                        </select>
                                        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}>
                                            <Bus size={16} />
                                        </div>
                                    </div>
                                    {availableBuses.length === 0 && !loading && (
                                        <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>
                                            ⚠ No buses available. Please add a new bus to the fleet first.
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

                {/* Right Column: List */}
                <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                            <User size={20} />
                            Registered Conductors
                            <span style={{ fontSize: 14, background: "var(--border-primary)", padding: "2px 8px", borderRadius: 12, color: "var(--text-label)" }}>
                                {conductors.length}
                            </span>
                        </h2>
                    </div>

                    <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: 16, borderBottom: "1px solid var(--bg-muted)" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                <Input
                                    placeholder="Search by name or bus number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: 36 }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "var(--bg-primary)" }}>
                            {loadingConductors ? (
                                <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading conductors...</div>
                            ) : filteredConductors.length === 0 ? (
                                <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
                                    {searchTerm ? "No matching conductors found." : "No conductors registered yet."}
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {filteredConductors.map((conductor) => (
                                        <div
                                            key={conductor._id}
                                            style={{
                                                background: "var(--bg-card)",
                                                padding: 16,
                                                borderRadius: 8,
                                                border: "1px solid var(--border-primary)",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                                <div style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: "50%",
                                                    background: "var(--bg-muted)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "var(--text-secondary)",
                                                    fontWeight: 600
                                                }}>
                                                    {conductor.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                                                        {conductor.username}
                                                    </p>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                                                        {conductor.assignedBus ? (
                                                            <>
                                                                <Bus size={14} />
                                                                <span>
                                                                    <span style={{ fontWeight: 500, color: "var(--text-body)" }}>{conductor.assignedBus.licensePlate}</span>
                                                                    <span style={{ opacity: 0.7 }}> • Route {conductor.assignedBus.routeId}</span>
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span style={{ color: "#ef4444", fontWeight: 500 }}>No Bus Assigned</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                                <div style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    padding: "4px 10px",
                                                    borderRadius: 20,
                                                    background: conductor.assignedBus ? "#f0fdf4" : "#fef2f2",
                                                    color: conductor.assignedBus ? "#166534" : "#dc2626"
                                                }}>
                                                    {conductor.assignedBus ? "Active" : "Unassigned"}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ConductorManagement;
