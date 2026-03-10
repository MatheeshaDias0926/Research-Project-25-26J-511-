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
<<<<<<< HEAD
                <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>
                    Manage Conductors
                </h1>
                <p style={{ color: "#64748b", marginTop: 4 }}>
                    Register new conductors and manage existing fleet assignments.
                </p>
=======
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: 4 }}>
                  <div style={{
                    padding: 10, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, var(--color-info-500), var(--color-primary-600))",
                  }}>
                    <UserPlus size={24} color="#fff" />
                  </div>
                  <div>
                    <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)" }}>
                        Manage Conductors
                    </h1>
                    <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
                        Register new conductors and manage existing fleet assignments.
                    </p>
                  </div>
                </div>
>>>>>>> main
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

                {/* Left Column: Register Form */}
                <div>
                    <Card style={{ position: "sticky", top: 20 }}>
                        <CardHeader style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                            <CardTitle style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 18 }}>
<<<<<<< HEAD
                                <div style={{ background: "#eff6ff", padding: 8, borderRadius: 8, color: "#2563eb" }}>
=======
                                <div style={{ background: "var(--color-primary-50)", padding: 8, borderRadius: 8, color: "var(--color-primary-500)" }}>
>>>>>>> main
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
<<<<<<< HEAD
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
=======
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
>>>>>>> main
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
<<<<<<< HEAD
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
=======
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
>>>>>>> main
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
<<<<<<< HEAD
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#334155" }}>
                                        Assign Bus
                                        <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b", fontWeight: 400 }}>
=======
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                                        Assign Bus
                                        <span style={{ marginLeft: 8, fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 400 }}>
>>>>>>> main
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
<<<<<<< HEAD
                                                border: "1px solid #e2e8f0",
=======
                                                border: "1px solid var(--border-light)",
>>>>>>> main
                                                outline: "none",
                                                backgroundColor: "white",
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
<<<<<<< HEAD
                                        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
=======
                                        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}>
>>>>>>> main
                                            <Bus size={16} />
                                        </div>
                                    </div>
                                    {availableBuses.length === 0 && !loading && (
<<<<<<< HEAD
                                        <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>
=======
                                        <p style={{ fontSize: "var(--text-xs)", color: "#ef4444", marginTop: 6 }}>
>>>>>>> main
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
<<<<<<< HEAD
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                            <User size={20} />
                            Registered Conductors
                            <span style={{ fontSize: 14, background: "#e2e8f0", padding: "2px 8px", borderRadius: 12, color: "#475569" }}>
=======
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                            <User size={20} />
                            Registered Conductors
                            <span style={{ fontSize: 14, background: "#e2e8f0", padding: "2px 8px", borderRadius: "var(--radius-lg)", color: "var(--text-secondary)" }}>
>>>>>>> main
                                {conductors.length}
                            </span>
                        </h2>
                    </div>

                    <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ position: "relative" }}>
<<<<<<< HEAD
                                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
=======
                                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
>>>>>>> main
                                <Input
                                    placeholder="Search by name or bus number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: 36 }}
                                />
                            </div>
                        </div>

<<<<<<< HEAD
                        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f8fafc" }}>
                            {loadingConductors ? (
                                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading conductors...</div>
                            ) : filteredConductors.length === 0 ? (
                                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
=======
                        <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "var(--bg-muted)" }}>
                            {loadingConductors ? (
                                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading conductors...</div>
                            ) : filteredConductors.length === 0 ? (
                                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
>>>>>>> main
                                    {searchTerm ? "No matching conductors found." : "No conductors registered yet."}
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {filteredConductors.map((conductor) => (
                                        <div
                                            key={conductor._id}
                                            style={{
                                                background: "white",
                                                padding: 16,
                                                borderRadius: 8,
<<<<<<< HEAD
                                                border: "1px solid #e2e8f0",
=======
                                                border: "1px solid var(--border-light)",
>>>>>>> main
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
<<<<<<< HEAD
                                                    background: "#f1f5f9",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#64748b",
=======
                                                    background: "var(--bg-subtle)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "var(--text-muted)",
>>>>>>> main
                                                    fontWeight: 600
                                                }}>
                                                    {conductor.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
<<<<<<< HEAD
                                                    <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                                                        {conductor.username}
                                                    </p>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginTop: 2 }}>
=======
                                                    <p style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
                                                        {conductor.username}
                                                    </p>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>
>>>>>>> main
                                                        {conductor.assignedBus ? (
                                                            <>
                                                                <Bus size={14} />
                                                                <span>
<<<<<<< HEAD
                                                                    <span style={{ fontWeight: 500, color: "#334155" }}>{conductor.assignedBus.licensePlate}</span>
=======
                                                                    <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{conductor.assignedBus.licensePlate}</span>
>>>>>>> main
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
