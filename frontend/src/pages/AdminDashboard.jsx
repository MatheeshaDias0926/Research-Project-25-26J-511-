import React, { useEffect, useState } from 'react';
import { getCrashes, getSystemStats, updateCrashStatus } from '../services/crashService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (crashId, newStatus) => {
    try {
      await updateCrashStatus(crashId, { status: newStatus });
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to update crash status:', error);
      alert('Failed to update crash status');
    }
  };

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
              <th>Actions</th>
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
                <td>
                  <select
                    value={crash.status}
                    onChange={(e) => handleStatusChange(crash._id, e.target.value)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      backgroundColor: crash.status === 'active' ? '#fee2e2' : crash.status === 'resolved' ? '#d1fae5' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                  </select>
                </td>
              </tr>
            ))}
            {crashes.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
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
