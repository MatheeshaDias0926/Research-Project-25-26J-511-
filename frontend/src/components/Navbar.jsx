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

  const roleColors = {
    passenger: "bg-blue-100 text-blue-700",
    conductor: "bg-green-100 text-green-700",
    authority: "bg-purple-100 text-purple-700",
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <Bus className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Smart Bus Safety
              </span>
              <div className="text-xs text-gray-500 font-medium">
                Real-time Monitoring
              </div>
            </div>
          </Link>

          {/* User Section */}
          {user && (
            <div className="flex items-center gap-4">
              {/* User Info Card */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm opacity-30"></div>
                  <div className="relative bg-gradient-to-br from-blue-100 to-blue-200 p-2 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    {user.username}
                  </div>
                  <div
                    className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                      roleColors[user.role]
                    }`}
                  >
                    {roleLabels[user.role]}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <LogOut className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
