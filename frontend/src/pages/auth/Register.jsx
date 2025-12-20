import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { UserPlus } from "lucide-react";

const Register = () => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm();
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data) => {
        setLoading(true);
        setError("");
        const result = await registerUser(data.username, data.password);
        setLoading(false);

        if (result.success) {
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
                            <UserPlus className="h-8 w-8 text-primary-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">Create Account</CardTitle>
                    <p className="text-sm text-slate-500 mt-2">Join as a Passenger</p>
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
                                {...register("username", { required: "Username is required", minLength: { value: 3, message: "Min 3 characters" } })}
                                placeholder="Choose a username"
                            />
                            {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <Input
                                type="password"
                                {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })}
                                placeholder="••••••••"
                            />
                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                            <Input
                                type="password"
                                {...register("confirmPassword", {
                                    required: "Please confirm password",
                                    validate: (val) => {
                                        if (watch('password') != val) {
                                            return "Your passwords do not match";
                                        }
                                    }
                                })}
                                placeholder="••••••••"
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating Account..." : "Register"}
                        </Button>

                        <div className="text-center text-sm text-slate-500">
                            Already have an account?{" "}
                            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Register;
