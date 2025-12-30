import React, { useEffect, useState } from 'react';
import { getAlerts } from '../services/alertService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/helpers';

const HospitalDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        setAlerts(data);
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="hospital-dashboard">
      <h1>Hospital Emergency Intake</h1>
      <div className="severity-summary">
        <div className="severity-box critical">
          <h3>{alerts.filter(a => a.severity === 'critical').length}</h3>
          <p>Critical</p>
        </div>
        <div className="severity-box high">
          <h3>{alerts.filter(a => a.severity === 'high').length}</h3>
          <p>High</p>
        </div>
        <div className="severity-box medium">
          <h3>{alerts.filter(a => a.severity === 'medium').length}</h3>
          <p>Medium</p>
        </div>
      </div>
      <div className="alerts-list">
        <h2>Incoming Alerts</h2>
        {alerts.map(alert => (
          <div key={alert._id} className={`alert-item ${alert.severity}`}>
            <StatusBadge severity={alert.severity} />
            <div>
              <strong>{alert.bus_id}</strong> - {alert.location?.address}
              <br />
              <small>{formatDateTime(alert.timestamp)}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalDashboard;
