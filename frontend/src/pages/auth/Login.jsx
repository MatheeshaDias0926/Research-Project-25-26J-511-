import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Bus } from "lucide-react";

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data) => {
        setLoading(true);
        setError("");
        const result = await login(data.username, data.password);
        setLoading(false);

        if (result.success) {
            // Decode locally or refetch user to know role? 
            // AuthContext updates user state. We can rely on that or simple redirect logic.
            // Usually AuthContext state update is async/effect based, so might need to wait or check result.
            // For now, let's just let the AuthProvider/PrivateRoutes handle redirection or simple default.
            // But we need to know where to go. Helper? 
            // Actually, let's just look at localStorage for instant redirect or wait for context.
            // Simpler: Redirect to root, let helper decide.
            navigate("/");
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary-100 rounded-full">
                            <Bus className="h-8 w-8 text-primary-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">Welcome Back</CardTitle>
                    <p className="text-sm text-slate-500 mt-2">Sign in to your account</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Username</label>
                            <Input
                                {...register("username", { required: "Username is required" })}
                                placeholder="Enter your username"
                            />
                            {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <Input
                                type="password"
                                {...register("password", { required: "Password is required" })}
                                placeholder="••••••••"
                            />
                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>

                        <div className="text-center text-sm text-slate-500">
                            Don't have an account?{" "}
                            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                                Register as Passenger
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
