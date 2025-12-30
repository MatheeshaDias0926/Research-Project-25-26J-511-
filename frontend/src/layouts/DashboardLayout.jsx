import React, { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmergencyContext } from '../context/EmergencyContext';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import EmergencyIndicator from '../components/common/EmergencyIndicator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { activeEmergencies } = useContext(EmergencyContext);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-body">
        <Sidebar role={user?.role} />
        <main className="dashboard-content">
          {activeEmergencies.length > 0 && <EmergencyIndicator />}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
