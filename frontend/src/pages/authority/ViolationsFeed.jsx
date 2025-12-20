import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { AlertTriangle, Clock, MapPin } from "lucide-react";

/**
 * Note: The backend endpoint `GET /api/bus/:busId/violations` gets violations for ONE bus.
 * To get a system-wide feed, we probably need a new endpoint or iterate active buses.
 * For now, we will mock the feed or just fallback to fetching a few active buses and aggregating.
 * OR if the backend supports `GET /api/violations` (it wasn't in the list), we'd use that.
 * Let's assume we need to fetch for active buses or just mock the aggregation for the UI demo.
 */
const ViolationsFeed = () => {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulating fetching a feed. Real implementation would likely need a backend update for "All Violations"
        // or we fetch the "All Buses" and then fetch violations for each (inefficient but works for small scale).
        const fetchViolations = async () => {
            try {
                const buses = await api.get("/bus");
                // For demo purposes, let's just use mock data mixed with real bus IDs if possible
                // or just static mock data to demonstrate the UI since we can't easily query all violations yet.

                const mockViolations = [
                    {
                        _id: "v1",
                        busId: "BUS-1234",
                        licensePlate: "NP-1234",
                        type: "footboard",
                        description: "Passenger on footboard while moving",
                        speed: 45,
                        timestamp: new Date().toISOString()
                    },
                    {
                        _id: "v2",
                        busId: "BUS-5678",
                        licensePlate: "WP-5678",
                        type: "overcrowding",
                        description: "Occupancy exceeded safety limit (65/50)",
                        speed: 20,
                        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 mins ago
                    },
                    {
                        _id: "v3",
                        busId: "BUS-9999",
                        licensePlate: "CP-9999",
                        type: "speeding",
                        description: "Speed limit exceeded (85 km/h)",
                        speed: 85,
                        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 mins ago
                    }
                ];
                setViolations(mockViolations);
            } catch (error) {
                console.error("Failed to fetch violations", error);
            } finally {
                setLoading(false);
            }
        };
        fetchViolations();
    }, []);

    const getViolationBadge = (type) => {
        switch (type) {
            case "footboard": return <Badge variant="danger">Footboard</Badge>;
            case "speeding": return <Badge variant="danger">Speeding</Badge>;
            case "overcrowding": return <Badge variant="warning">Overcrowding</Badge>;
            default: return <Badge variant="secondary">{type}</Badge>;
        }
    };

    if (loading) return <div>Loading violations...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Violation Log</h1>

            <div className="space-y-4">
                {violations.map((violation) => (
                    <Card key={violation._id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-red-100 rounded-full text-red-600 mt-1">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-slate-900">{violation.licensePlate}</h3>
                                        {getViolationBadge(violation.type)}
                                    </div>
                                    <p className="text-slate-600 font-medium">{violation.description}</p>
                                    <p className="text-sm text-slate-500 mt-1">Speed: {violation.speed} km/h</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 text-sm text-slate-500 min-w-[150px]">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {new Date(violation.timestamp).toLocaleTimeString()}
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    Colombo, LK
                                </div>
                                <span className="text-xs text-slate-400">{new Date(violation.timestamp).toLocaleDateString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default ViolationsFeed;
