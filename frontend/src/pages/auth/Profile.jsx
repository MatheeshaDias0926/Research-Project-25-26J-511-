import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { User, Shield, Briefcase, UserCircle } from "lucide-react";

const Profile = () => {
    const { user } = useAuth();

    const getRoleIcon = (role) => {
        switch (role) {
            case "authority":
                return <Shield className="h-5 w-5" />;
            case "conductor":
                return <Briefcase className="h-5 w-5" />;
            default:
                return <User className="h-5 w-5" />;
        }
    };

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case "authority":
                return "danger";
            case "conductor":
                return "warning";
            default:
                return "default";
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCircle className="h-6 w-6 text-primary-600" />
                        User Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Username</p>
                            <p className="text-lg font-semibold text-slate-900">{user.username}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Role</p>
                            <div className="flex items-center gap-2 mt-1">
                                {getRoleIcon(user.role)}
                                <span className="font-semibold capitalize text-slate-900">{user.role}</span>
                            </div>
                        </div>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="uppercase text-xs tracking-wider">
                            {user.role} Account
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Account ID</p>
                            <p className="text-sm font-mono text-slate-600 mt-1">{user.id || user._id}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Profile;
