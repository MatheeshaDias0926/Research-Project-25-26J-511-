import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Bus, AlertTriangle, CheckCircle, Wrench } from "lucide-react";

const AuthorityDashboard = () => {
    const [stats, setStats] = useState({
        activeBuses: 0,
        totalViolations: 0,
        pendingMaintenance: 0,
        systemStatus: "Healthy"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we'd have a specific analytics endpoint.
        // Here we'll just fetch list of buses to count them and mock the rest or fetch maintenance.
        const fetchData = async () => {
            try {
                const busesRes = await api.get("/bus");
                // const maintenanceRes = await api.get("/maintenance"); // if implemented
                setStats({
                    activeBuses: busesRes.data.length,
                    totalViolations: 12, // Mock for now or fetch logs
                    pendingMaintenance: 5,
                    systemStatus: "Healthy"
                });
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">System Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Buses</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.activeBuses}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Bus className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Violations (24h)</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalViolations}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Maintenance</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.pendingMaintenance}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                            <Wrench className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">System Status</p>
                            <p className="text-xl font-bold text-green-600">{stats.systemStatus}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Could add a chart or recent activity list here later */}
        </div>
    );
};

export default AuthorityDashboard;
