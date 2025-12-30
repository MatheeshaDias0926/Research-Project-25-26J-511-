import React, { useEffect, useState } from 'react';
import { getOwnedBuses } from '../services/busService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const BusOwnerDashboard = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const data = await getOwnedBuses();
        setBuses(data);
      } catch (error) {
        console.error('Failed to load buses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuses();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="busowner-dashboard">
      <h1>My Buses</h1>
      <div className="buses-grid">
        {buses.map(bus => (
          <div key={bus._id} className="bus-card">
            <h3>{bus.bus_id}</h3>
            <p>Registration: {bus.registration_number}</p>
            <p>Route: {bus.route || 'N/A'}</p>
            <p>Status: {bus.sensor_status}</p>
          </div>
        ))}
        {buses.length === 0 && (
          <p>No buses registered</p>
        )}
      </div>
    </div>
  );
};

export default BusOwnerDashboard;
