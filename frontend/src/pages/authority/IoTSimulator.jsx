import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { RadioTower, Send } from "lucide-react";

const IoTSimulator = () => {
    const { register, handleSubmit, reset } = useForm();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Construct payload to match backend expectation
            // Backend expects: { licensePlate, currentOccupancy, gps: { lat, lon }, footboardStatus, speed }
            const payload = {
                licensePlate: data.licensePlate,
                currentOccupancy: parseInt(data.occupancy),
                gps: {
                    lat: 6.9271, // Static for now
                    lon: 79.8612
                },
                footboardStatus: data.footboard === 'true', // Convert string "true" to boolean
                speed: parseInt(data.speed)
            };

            await api.post("/iot/mock-data", payload);

            // Add to local logs
            const newLog = {
                timestamp: new Date().toLocaleTimeString(),
                ...payload,
                status: "Sent"
            };
            setLogs([newLog, ...logs]);

            // reset(); // Keep values for easy repetitive testing? Maybe better not to reset completely.
        } catch (error) {
            console.error("Failed to send mock data", error);
            alert("Failed to send data: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <RadioTower className="h-8 w-8 text-primary-600" />
                <h1 className="text-3xl font-bold text-slate-800">IoT Simulator</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Send Telemetry</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">License Plate</label>
                                    <Input
                                        {...register("licensePlate", { required: true })}
                                        placeholder="NP-1234"
                                        defaultValue="NP-1234"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Speed (km/h)</label>
                                    <Input
                                        type="number"
                                        {...register("speed", { required: true })}
                                        defaultValue="45"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Occupancy</label>
                                    <Input
                                        type="number"
                                        {...register("occupancy", { required: true })}
                                        defaultValue="30"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Footboard Status</label>
                                    <select
                                        {...register("footboard")}
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="false">Clear (False)</option>
                                        <option value="true">Obstructed (True)</option>
                                    </select>
                                </div>

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Sending..." : "Send Data Packet"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full min-h-[500px]">
                        <CardHeader>
                            <CardTitle>Transmission Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {logs.length === 0 && <p className="text-slate-500 text-center py-8">No data sent yet.</p>}
                                {logs.map((log, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 font-mono text-sm">
                                        <div>
                                            <span className="text-slate-400 mr-3">[{log.timestamp}]</span>
                                            <span className="font-bold text-slate-700">{log.licensePlate}</span>
                                        </div>
                                        <div className="flex gap-4 text-slate-600">
                                            <span>{log.speed} km/h</span>
                                            <span>{log.currentOccupancy} pax</span>
                                            <span className={log.footboardStatus ? "text-red-500 font-bold" : "text-green-500"}>
                                                FB: {log.footboardStatus ? "YES" : "NO"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default IoTSimulator;
