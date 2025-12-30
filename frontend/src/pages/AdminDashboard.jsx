import React, { useEffect, useState } from 'react';
import { getCrashes, getSystemStats } from '../services/crashService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, crashesData] = await Promise.all([
          getSystemStats(),
          getCrashes({ limit: 50, sort: '-createdAt' })
        ]);
        setStats(statsData);
        setCrashes(crashesData.crashes || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="overview-cards">
        <div className="stat-card red">
          <h3>{stats?.activeCrashes || 0}</h3>
          <p>Active Crashes</p>
        </div>
        <div className="stat-card orange">
          <h3>{stats?.pendingResponses || 0}</h3>
          <p>Pending Responses</p>
        </div>
        <div className="stat-card green">
          <h3>{stats?.resolvedToday || 0}</h3>
          <p>Resolved Today</p>
        </div>
        <div className="stat-card blue">
          <h3>{stats?.totalBuses || 0}</h3>
          <p>Total Buses</p>
        </div>
      </div>

      <div className="crash-table-section">
        <h2>Recent Crashes</h2>
        <table className="crash-table">
          <thead>
            <tr>
              <th>Bus ID</th>
              <th>Timestamp</th>
              <th>Location</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Acceleration</th>
            </tr>
          </thead>
          <tbody>
            {crashes.map(crash => (
              <tr key={crash._id} className={crash.status === 'active' ? 'row-emergency' : ''}>
                <td><strong>{crash.bus_id}</strong></td>
                <td>{formatDateTime(crash.timestamp)}</td>
                <td>{crash.location?.address || 'Unknown'}</td>
                <td><StatusBadge severity={crash.severity} /></td>
                <td><StatusBadge status={crash.status} /></td>
                <td>{crash.max_acceleration?.toFixed(2)} m/s²</td>
              </tr>
            ))}
            {crashes.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  No crashes recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
