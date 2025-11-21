import { Link } from "react-router-dom";
import { Bus, LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  const roleLabels = {
    passenger: "Passenger",
    conductor: "Bus Conductor",
    authority: "Transport Authority",
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Bus className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Smart Bus Safety
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="h-5 w-5" />
                <div className="text-sm">
                  <div className="font-medium">{user.username}</div>
                  <div className="text-gray-500">{roleLabels[user.role]}</div>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
