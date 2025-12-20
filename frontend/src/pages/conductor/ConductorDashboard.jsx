import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Wrench, AlertTriangle } from "lucide-react";

const ConductorDashboard = () => {
    const [myBus, setMyBus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we'd fetch the bus assigned to the logged-in conductor.
        // Since our backend doesn't explicitly link user->bus in the User model without extra query,
        // we'll simulate fetching the "first active bus" or a specific one for demo.
        const fetchBus = async () => {
            try {
                const response = await api.get("/bus");
                if (response.data.length > 0) {
                    setMyBus(response.data[0]);
                }
            } catch (error) {
                console.error("Failed to fetch bus", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBus();
    }, []);

    if (loading) return <div>Loading assigned bus...</div>;

    if (!myBus) return (
        <div className="text-center p-12">
            <Bus className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-700">No Bus Assigned</h2>
            <p className="text-slate-500">Please contact the authority to assign a bus.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">My Bus</h1>
                    <p className="text-slate-500">Manage your assigned vehicle for today.</p>
                </div>
                <Link to="/conductor/maintenance">
                    <Button variant="secondary" className="gap-2">
                        <Wrench className="h-4 w-4" /> Report Issue
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="md:col-span-2 bg-slate-900 text-white">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white/10 rounded-2xl">
                                <Bus className="h-12 w-12 text-white" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-bold tracking-tight">{myBus.licensePlate}</h2>
                                <p className="text-slate-400 text-lg">Route {myBus.routeId}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center px-6 py-2 bg-white/10 rounded-lg">
                                <p className="text-sm text-slate-400">Status</p>
                                <p className="text-xl font-bold capitalize text-green-400">{myBus.currentStatus}</p>
                            </div>
                            <div className="text-center px-6 py-2 bg-white/10 rounded-lg">
                                <p className="text-sm text-slate-400">Capacity</p>
                                <p className="text-xl font-bold">{myBus.capacity}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" /> Current Alerts
                        </h3>
                        {/* Mock alerts since we don't have a direct "alerts" field on bus object without fetching violations */}
                        <div className="space-y-3">
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                No active violations.
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-500" /> Location Status
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Last Update</span>
                                <span className="font-medium">Just now</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">GPS Signal</span>
                                <Badge variant="success">Strong</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ConductorDashboard;
