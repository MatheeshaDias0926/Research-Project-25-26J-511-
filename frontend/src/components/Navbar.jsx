import { Link } from "react-router-dom";
import { Bus, LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

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
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          {/* Logo Section */}
          <Link to="/dashboard" className="navbar-logo-link">
            <div className="navbar-logo-wrapper">
              <div className="navbar-logo-glow"></div>
              <div className="navbar-logo">
                <Bus />
              </div>
            </div>
            <div className="navbar-brand">
              <span className="navbar-brand-title">Smart Bus Safety</span>
              <div className="navbar-brand-subtitle">Real-time Monitoring</div>
            </div>
          </Link>

          {/* User Section */}
          {user && (
            <div className="navbar-user-section">
              {/* User Info Card */}
              <div className="navbar-user-card">
                <div className="navbar-user-avatar-wrapper">
                  <div className="navbar-user-avatar-glow"></div>
                  <div className="navbar-user-avatar">
                    <User />
                  </div>
                </div>
                <div className="navbar-user-info">
                  <div className="navbar-user-name">{user.username}</div>
                  <div
                    className={`navbar-user-role navbar-user-role-${user.role}`}
                  >
                    {roleLabels[user.role]}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button onClick={logout} className="navbar-logout-btn">
                <LogOut />
                <span className="navbar-logout-text">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
