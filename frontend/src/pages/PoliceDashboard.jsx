import React, { useEffect, useState } from 'react';
import { getAlerts, acceptAlert, dispatchUnits, closeCase } from '../services/alertService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './PoliceDashboard.css';

const PoliceDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data.sort((a, b) => {
        const priority = { critical: 3, high: 2, medium: 1, low: 0 };
        return priority[b.severity] - priority[a.severity];
      }));
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (alert) => {
    setActionLoading(true);
    try {
      await acceptAlert(alert._id);
      await fetchAlerts();
      alert('Alert acknowledged successfully');
    } catch (error) {
      alert('Failed to acknowledge alert');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const pendingAlerts = alerts.filter(a => a.status === 'pending');

  return (
    <div className="police-dashboard">
      <h1>Police Emergency Response</h1>
      <div className="alert-count-banner">
        <h2>{pendingAlerts.length} ALERTS AWAITING RESPONSE</h2>
      </div>

      <div className="alerts-grid">
        {alerts.map(alert => (
          <div
            key={alert._id}
            className={`alert-card ${alert.severity}`}
          >
            <div className="alert-header">
              <StatusBadge severity={alert.severity} />
              <span className="time">{formatDateTime(alert.timestamp)}</span>
            </div>
            <h3>{alert.bus_id}</h3>
            <p className="location">{alert.location?.address || 'Location unavailable'}</p>
            <p className="acceleration">Impact: {alert.max_acceleration?.toFixed(2)} m/s²</p>
            <p className="status">Status: <StatusBadge status={alert.status} /></p>

            {alert.status === 'pending' && (
              <button
                onClick={() => handleAccept(alert)}
                className="btn-respond"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'RESPOND NOW'}
              </button>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="no-alerts">No alerts at this time</div>
        )}
      </div>
    </div>
  );
};

export default PoliceDashboard;
