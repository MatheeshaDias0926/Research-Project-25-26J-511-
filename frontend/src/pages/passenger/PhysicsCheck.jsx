import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { ShieldCheck, AlertTriangle, Info } from "lucide-react";

const PhysicsCheck = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Mocking lat/lon for now as user input might be tedious, or defaulting to a gentle curve location
            const payload = {
                seated: parseInt(data.seated),
                standing: parseInt(data.standing),
                speed: parseInt(data.speed),
                lat: 6.9271, // Colombo default
                lon: 79.8612
            };
            const response = await api.post("/bus/physics", payload);
            setResult(response.data);
        } catch (error) {
            console.error("Physics check failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Safety Check</h1>
            <p className="text-slate-600">Calculate rollover risk and braking distance based on current conditions.</p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-primary-600" />
                        Enter Bus Parameters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Seated Passengers</label>
                                <Input
                                    type="number"
                                    {...register("seated", { required: true, min: 0 })}
                                    placeholder="e.g. 40"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Standing Passengers</label>
                                <Input
                                    type="number"
                                    {...register("standing", { required: true, min: 0 })}
                                    placeholder="e.g. 10"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Speed (km/h)</label>
                                <Input
                                    type="number"
                                    {...register("speed", { required: true, min: 0 })}
                                    placeholder="e.g. 60"
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Calculating..." : "Analyze Safety"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <Card className={result.rolloverRisk ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {result.rolloverRisk ? <AlertTriangle className="text-red-600" /> : <ShieldCheck className="text-green-600" />}
                                Rollover Risk
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold mb-1">
                                {result.rolloverRisk ? "High Risk" : "Safe"}
                            </p>
                            <p className="text-sm opacity-80">
                                {result.rolloverRisk
                                    ? "The bus is unstable at this speed with the current load."
                                    : "The bus is stable under these conditions."}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Info className="text-primary-600" />
                                Braking Distance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-500">Dry Road</p>
                                    <p className="text-xl font-bold">{result.stoppingDistance?.dry?.toFixed(1)} m</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Wet Road</p>
                                    <p className="text-xl font-bold">{result.stoppingDistance?.wet?.toFixed(1)} m</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PhysicsCheck;
