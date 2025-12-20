import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import {
    LayoutDashboard,
    Bus,
    AlertTriangle,
    Wrench,
    Activity,
    User,
    LogOut,
    Map,
    ShieldAlert,
} from "lucide-react";

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const role = user.role;

    const links = [
        // Passenger Links
        {
            name: "Dashboard",
            href: "/passenger",
            icon: LayoutDashboard,
            roles: ["passenger"],
        },
        {
            name: "Prediction",
            href: "/passenger/prediction",
            icon: Activity,
            roles: ["passenger"],
        },
        {
            name: "Physics Check",
            href: "/passenger/physics",
            icon: ShieldAlert,
            roles: ["passenger"],
        },

        // Conductor Links
        {
            name: "My Bus",
            href: "/conductor",
            icon: Bus,
            roles: ["conductor"],
        },
        {
            name: "Maintenance",
            href: "/conductor/maintenance",
            icon: Wrench,
            roles: ["conductor"],
        },

        // Authority Links
        {
            name: "Overview",
            href: "/authority",
            icon: LayoutDashboard,
            roles: ["authority"],
        },
        {
            name: "Fleet",
            href: "/authority/fleet",
            icon: Bus,
            roles: ["authority"],
        },
        {
            name: "Violations",
            href: "/authority/violations",
            icon: AlertTriangle,
            roles: ["authority"],
        },
        {
            name: "Maintenance Logs",
            href: "/authority/maintenance",
            icon: Wrench,
            roles: ["authority"],
        },
        {
            name: "IoT Simulator",
            href: "/authority/iot",
            icon: Activity,
            roles: ["authority"],
        },
    ];

    const filteredLinks = links.filter((link) => link.roles.includes(role));

    return (
        <div className="flex flex-col h-full w-64 bg-slate-900 text-white">
            <div className="p-6">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Bus className="h-6 w-6 text-primary-400" />
                    SmartBus
                </h1>
                <p className="text-xs text-slate-400 mt-1 capitalize">{role} Portal</p>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {filteredLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary-600 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <Link
                    to="/profile"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-2",
                        location.pathname === "/profile"
                            ? "bg-slate-800 text-white"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <User className="h-5 w-5" />
                    Profile
                </Link>
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 rounded-lg hover:bg-red-900/20 hover:text-red-400 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
