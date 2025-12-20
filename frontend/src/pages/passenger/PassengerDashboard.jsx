import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Bus, MapPin, Users, Activity } from "lucide-react";

const PassengerDashboard = () => {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBuses();
    }, []);

    const fetchBuses = async () => {
        try {
            const response = await api.get("/bus");
            setBuses(response.data);
        } catch (error) {
            console.error("Failed to fetch buses", error);
        } finally {
            setLoading(false);
        }
    };

    const getOccupancyColor = (current, capacity) => {
        const percentage = (current / capacity) * 100;
        if (percentage > 90) return "text-red-600";
        if (percentage > 70) return "text-yellow-600";
        return "text-green-600";
    };

    if (loading) {
        return <div className="p-8 text-center">Loading buses...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-800">Active Buses</h1>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                    {buses.length} Active
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buses.map((bus) => (
                    <Card key={bus._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 rounded-lg">
                                        <Bus className="h-6 w-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">{bus.licensePlate}</h3>
                                        <p className="text-sm text-slate-500">Route {bus.routeId}</p>
                                    </div>
                                </div>
                                <Badge variant={bus.currentStatus === "active" ? "success" : "secondary"}>
                                    {bus.currentStatus}
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <Users className="h-4 w-4" /> Occupancy
                                    </span>
                                    <span className={`font-semibold ${getOccupancyColor(bus.currentStatus === 'active' ? bus.capacity : 0, bus.capacity)}`}>
                                        {/* Note: Backend might not return live occupancy in the list view, usually just static data. 
                        Assuming 'capacity' is static. If we have live data, we need to check how it's sent.
                        Standard /bus endpoint usually returns bus static details. 
                        Let's check the API response structure if needed. For now assume capacity is max.
                    */}
                                        {bus.capacity} Max
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <MapPin className="h-4 w-4" /> Live Tracking
                                    </span>
                                    <Link to={`/passenger/prediction`} className="text-primary-600 hover:underline">
                                        View Prediction
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {buses.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        No buses found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PassengerDashboard;
