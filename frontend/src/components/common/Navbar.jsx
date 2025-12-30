import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { EmergencyContext } from '../../context/EmergencyContext';
import { logout } from '../../services/authService';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const { activeEmergencies } = useContext(EmergencyContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/crash-login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Crash Management System</h1>
      </div>
      <div className="navbar-right">
        {activeEmergencies.length > 0 && (
          <span className="emergency-badge">{activeEmergencies.length} ACTIVE EMERGENCIES</span>
        )}
        <div className="user-info">
          <span className="user-role">{user.role?.toUpperCase()}</span>
          <span className="user-name">{user.name}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
