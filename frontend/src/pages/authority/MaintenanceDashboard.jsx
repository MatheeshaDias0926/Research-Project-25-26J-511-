import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/Card";
import { Wrench, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const MaintenanceDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // 'all', 'pending', 'resolved'

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get("/maintenance");
            setLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch maintenance logs", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "resolved":
                return "#22c55e"; // green
            case "in-progress":
                return "#eab308"; // yellow
            case "pending":
            default:
                return "#ef4444"; // red
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high":
                return "#ef4444";
            case "medium":
                return "#f97316";
            default:
                return "#3b82f6";
        }
    };

    const filteredLogs = logs.filter((log) => {
        if (filter === "all") return true;
        if (filter === "pending") return log.status !== "resolved";
        return log.status === filter;
    });

    if (loading) return <div>Loading maintenance data...</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>
                    Maintenance Overview
                </h1>
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        onClick={() => setFilter("all")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 6,
                            background: filter === "all" ? "#0284c7" : "#e2e8f0",
                            color: filter === "all" ? "#fff" : "#64748b",
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("pending")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 6,
                            background: filter === "pending" ? "#0284c7" : "#e2e8f0",
                            color: filter === "pending" ? "#fff" : "#64748b",
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilter("resolved")}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 6,
                            background: filter === "resolved" ? "#0284c7" : "#e2e8f0",
                            color: filter === "resolved" ? "#fff" : "#64748b",
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
                {filteredLogs.length === 0 ? (
                    <p style={{ color: "#64748b" }}>No maintenance logs found.</p>
                ) : (
                    filteredLogs.map((log) => (
                        <Card key={log._id}>
                            <CardContent style={{ padding: 24 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: "#1e293b",
                                                    background: "#f1f5f9",
                                                    padding: "4px 8px",
                                                    borderRadius: 4,
                                                }}
                                            >
                                                Bus: {log.busId?.licensePlate || "Unknown"}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: "#fff",
                                                    background: getPriorityColor(log.priority),
                                                    padding: "4px 12px",
                                                    borderRadius: 9999,
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                {log.priority}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: getStatusColor(log.status),
                                                    border: `1px solid ${getStatusColor(log.status)}`,
                                                    padding: "3px 10px",
                                                    borderRadius: 9999,
                                                    textTransform: "capitalize",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}
                                            >
                                                {log.status === "resolved" ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                {log.status}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                                            {log.issue}
                                        </h3>
                                        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>
                                            {log.description}
                                        </p>
                                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                            Reported by: <span style={{ fontWeight: 500 }}>{log.reportedBy?.username || "Unknown"}</span> •{" "}
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        {/* Actions could go here (e.g., Resolving) */}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default MaintenanceDashboard;
