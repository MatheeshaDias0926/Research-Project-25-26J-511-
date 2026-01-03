import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

function App() {
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState("Offline 🔴");
  const DEVICE_ID = "BUS_A12";

  useEffect(() => {
    socket.on(`alert-${DEVICE_ID}`, (data) => {
      // Any message received means the device is Online
      setStatus("Online 🟢");

      // Only add to table if it's not a heartbeat
      if (data.event !== "HEARTBEAT") {
        setIncidents(prev => [data, ...prev]);
      }
    });

    return () => socket.off(`alert-${DEVICE_ID}`);
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Driver Monitoring Dashboard</h1>
      <div style={{ fontSize: '20px', marginBottom: '20px' }}>
        Device Status: <strong>{status}</strong>
      </div>

      <table border="1" width="100%" cellPadding="10">
        <thead style={{ background: '#eee' }}>
          <tr>
            <th>Time</th>
            <th>Event Detected</th>
            <th>Device ID</th>
          </tr>
        </thead>
        <tbody>
          {incidents.length === 0 ? (
            <tr><td colSpan="3" align="center">No incidents detected yet.</td></tr>
          ) : (
            incidents.map((inc, i) => (
              <tr key={i}>
                <td>{new Date().toLocaleTimeString()}</td>
                <td style={{ color: 'red', fontWeight: 'bold' }}>{inc.event}</td>
                <td>{inc.deviceId}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;