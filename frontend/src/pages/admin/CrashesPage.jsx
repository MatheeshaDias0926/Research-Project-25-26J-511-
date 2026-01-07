import React, { useEffect, useState } from 'react';
import { getCrashes, updateCrashStatus } from '../../services/crashService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDateTime } from '../../utils/helpers';
import '../AdminDashboard.css';

const CrashesPage = () => {
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCrashes();
  }, [filter]);

  const fetchCrashes = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await getCrashes(params);
      setCrashes(data.crashes || []);
    } catch (error) {
      console.error('Failed to fetch crashes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (crashId, newStatus) => {
    try {
      await updateCrashStatus(crashId, { status: newStatus });
      // Refresh crashes list
      await fetchCrashes();
    } catch (error) {
      console.error('Failed to update crash status:', error);
      alert('Failed to update crash status');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Crash Management</h1>
        <div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
            <option value="all">All Crashes</option>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Bus ID</th>
            <th>Timestamp</th>
            <th>Location</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Max Acceleration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {crashes.map(crash => (
            <tr key={crash._id} className={crash.status === 'active' ? 'row-emergency' : ''}>
              <td><strong>{crash.bus_id}</strong></td>
              <td>{formatDateTime(crash.timestamp)}</td>
              <td>{crash.location?.address || `${crash.location?.latitude?.toFixed(4)}, ${crash.location?.longitude?.toFixed(4)}` || 'Unknown'}</td>
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
                No crashes found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CrashesPage;
