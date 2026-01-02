import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Video, Clock } from 'lucide-react';

// Connect to your Backend Port
const socket = io('http://localhost:5001');

function App() {
  const [incidents, setIncidents] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("Alert");
  const deviceId = "BUS_A12"; // Your testing Device ID

  useEffect(() => {
    // 1. Listen for real-time alerts from the Python Edge AI
    socket.on(`alert-${deviceId}`, (data) => {
      setCurrentStatus(data.event);
      // Add new incident to the top of the list
      setIncidents((prev) => [{ ...data, time: new Date().toLocaleTimeString() }, ...prev]);
    });

    return () => socket.off(`alert-${deviceId}`);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Driver Monitoring System <small style={{ fontSize: '0.5em', color: '#666' }}>Admin Panel</small></h1>
        <div style={{ padding: '10px 20px', borderRadius: '20px', backgroundColor: currentStatus === 'Alert' ? '#dcfce7' : '#fee2e2', color: currentStatus === 'Alert' ? '#166534' : '#991b1b', fontWeight: 'bold' }}>
          System Status: {currentStatus === 'Alert' ? '🟢 Safe' : `🔴 ${currentStatus}`}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        
        {/* Left Column: Device Info */}
        <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Device Details</h3>
          <p><strong>Device ID:</strong> {deviceId}</p>
          <p><strong>Location:</strong> Colombo, Sri Lanka</p>
          <hr />
          <h4>Buyer Controls</h4>
          <button style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>Register New Driver</button>
          <button style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px' }}>Adjust Verify Interval</button>
        </section>

        {/* Right Column: Incident Logs (Research History) */}
        <section style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Recent Incidents (Fetched from Atlas)</h3>
          {incidents.length === 0 ? (
            <p style={{ color: '#888' }}>Waiting for edge device data...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Time</th>
                  <th style={{ padding: '10px' }}>Event</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}><Clock size={14} /> {inc.time || "Just now"}</td>
                    <td style={{ padding: '10px', color: '#dc2626', fontWeight: 'bold' }}>{inc.event}</td>
                    <td style={{ padding: '10px' }}>
                      <a href={inc.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Video size={16} /> View Clip
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;