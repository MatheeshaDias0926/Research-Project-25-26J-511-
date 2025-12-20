import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { Bus, Plus, RefreshCw } from "lucide-react";

const FleetManagement = () => {
    const { register, handleSubmit, reset } = useForm();
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchBuses();
    }, []);

    const fetchBuses = async () => {
        setLoading(true);
        try {
            const response = await api.get("/bus");
            setBuses(response.data);
        } catch (error) {
            console.error("Failed to fetch buses", error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            const payload = {
                licensePlate: data.licensePlate,
                routeId: data.routeId,
                capacity: parseInt(data.capacity)
            };
            await api.post("/bus", payload);
            reset();
            setIsAdding(false);
            fetchBuses(); // Refresh list
        } catch (error) {
            console.error("Failed to create bus", error);
            alert("Failed to create bus: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-800">Fleet Management</h1>
                <Button onClick={() => setIsAdding(!isAdding)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add New Bus
                </Button>
            </div>

            {isAdding && (
                <Card className="animate-in slide-in-from-top-4 border-primary-200 bg-primary-50">
                    <CardHeader>
                        <CardTitle className="text-lg">Register New Vehicle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full md:w-1/3 space-y-1">
                                <label className="text-sm font-medium text-slate-700">License Plate</label>
                                <Input {...register("licensePlate", { required: true })} placeholder="NP-XXXX" />
                            </div>
                            <div className="w-full md:w-1/3 space-y-1">
                                <label className="text-sm font-medium text-slate-700">Route ID</label>
                                <Input {...register("routeId", { required: true })} placeholder="ROUTE-XXX" />
                            </div>
                            <div className="w-full md:w-1/3 space-y-1">
                                <label className="text-sm font-medium text-slate-700">Capacity</label>
                                <Input type="number" {...register("capacity", { required: true })} placeholder="50" />
                            </div>
                            <Button type="submit">Create Bus</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Active Fleet</CardTitle>
                    <button onClick={fetchBuses} className="text-slate-400 hover:text-primary-600 transition-colors">
                        <RefreshCw className="h-5 w-5" />
                    </button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading fleet data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3">License Plate</th>
                                        <th className="px-4 py-3">Route</th>
                                        <th className="px-4 py-3">Capacity</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">System ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {buses.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-slate-500">No buses in fleet.</td>
                                        </tr>
                                    )}
                                    {buses.map((bus) => (
                                        <tr key={bus._id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                                                <Bus className="h-4 w-4 text-slate-400" />
                                                {bus.licensePlate}
                                            </td>
                                            <td className="px-4 py-3">{bus.routeId}</td>
                                            <td className="px-4 py-3">{bus.capacity}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={bus.currentStatus === 'active' ? 'success' : 'secondary'}>
                                                    {bus.currentStatus}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                {bus._id}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default FleetManagement;
