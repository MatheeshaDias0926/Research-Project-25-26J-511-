import { useState, useEffect } from "react";
import api from "../../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { TrendingUp, Clock, Users, Map } from "lucide-react";

const Prediction = () => {
    const [routeId, setRouteId] = useState("ROUTE-138");
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);

    // Auto-fetch on mount for demo
    useEffect(() => {
        fetchPrediction();
    }, []);

    const fetchPrediction = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/bus/predict/${routeId}`);
            setPrediction(response.data);
        } catch (error) {
            console.error("Prediction failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-800">Occupancy Prediction</h1>
                <div className="flex gap-2">
                    <select
                        value={routeId}
                        onChange={(e) => setRouteId(e.target.value)}
                        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="ROUTE-138">Route 138 (Colombo-Homagama)</option>
                        <option value="ROUTE-120">Route 120 (Colombo-Horana)</option>
                        <option value="ROUTE-177">Route 177 (Kollupitiya-Kaduwela)</option>
                    </select>
                    <Button onClick={fetchPrediction} disabled={loading}>
                        {loading ? "Refreshing..." : "Update"}
                    </Button>
                </div>
            </div>

            {prediction && (
                <Card className="overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-bold">{routeId} Analysis</h2>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                                ML Model v1.0
                            </Badge>
                        </div>
                        <p className="opacity-90">Based on historical data and current time.</p>
                    </div>

                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center p-4 bg-slate-50 rounded-xl">
                                <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 mb-1">Predicted Occupancy</p>
                                <p className="text-3xl font-bold text-slate-900">{prediction.predictedOccupancy || 42}</p>
                                <p className="text-xs text-slate-400 mt-1">Passengers</p>
                            </div>

                            <div className="text-center p-4 bg-slate-50 rounded-xl">
                                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 mb-1">Confidence Score</p>
                                <p className="text-3xl font-bold text-slate-900">
                                    {prediction.confidence ? (prediction.confidence * 100).toFixed(0) : 85}%
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Accuracy Probability</p>
                            </div>

                            <div className="text-center p-4 bg-slate-50 rounded-xl">
                                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 mb-1">Next Bus In</p>
                                <p className="text-3xl font-bold text-slate-900">12</p>
                                <p className="text-xs text-slate-400 mt-1">Minutes (Est)</p>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800">
                            <Map className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Route Recommendation</p>
                                <p className="text-sm mt-1 text-blue-700">
                                    Current traffic suggests moderate congestion. The predicted occupancy indicates seating might be available if you board within the next 15 minutes.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Prediction;
