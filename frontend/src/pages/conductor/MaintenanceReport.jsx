import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Wrench, CheckCircle } from "lucide-react";

const MaintenanceReport = () => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Hardcoded bus ID for demo since user->bus link isn't strict in backend yet
    // In production we'd pick from list or assigned bus
    const busId = "6740b3b3a6c9e1234567890a"; // Example ID, might fail if not seeded. 
    // Actually, let's ask user for Bus ID text or just use a dummy one if we don't fetch list.
    // Better: Text input for Bus License Plate or ID for flexibility in demo.

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Need to fetch bus ID from license plate first usually, or just assume we have ID.
            // Let's assume user inputs Bus ID directly or we fetch it.
            // Simplified: User inputs Bus ID (mongo ID) for now as backend requires it.
            // Or we just send the form data and let backend validation pass if ID format valid.
            const payload = {
                busId: data.busId,
                issue: data.issue,
                description: data.description,
                priority: data.priority
            };
            await api.post("/maintenance", payload);
            setSuccess(true);
            reset();
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Maintenance report failed", error);
            alert("Failed to submit report. Please check Bus ID.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Report Issue</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-6 w-6 text-primary-600" />
                        Maintenance Ticket
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Report submitted successfully!
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Bus ID (System ID)</label>
                            <Input
                                {...register("busId", { required: "Bus ID is required" })}
                                placeholder="e.g. 6740..."
                            />
                            <p className="text-xs text-slate-400">Copy ID from Bus List in Authority view for testing</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Issue Type</label>
                            <Input
                                {...register("issue", { required: "Issue title is required" })}
                                placeholder="e.g. Brake Failure"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                {...register("description", { required: true })}
                                className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Describe the problem in detail..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Priority</label>
                            <select
                                {...register("priority")}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Submitting..." : "Submit Report"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default MaintenanceReport;
