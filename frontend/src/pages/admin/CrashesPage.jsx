import React, { useEffect, useState } from 'react';
import { getCrashes } from '../../services/crashService';
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
            <th>Details</th>
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
                {crash.location?.latitude && crash.location?.longitude && (
                  <a href={`https://www.google.com/maps?q=${crash.location.latitude},${crash.location.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                    View Map
                  </a>
                )}
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
