import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../AdminDashboard.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    smsAlerts: false,
    autoAssignPolice: true,
    autoAssignHospital: true,
    severityThreshold: 'medium'
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>System Settings</h1>
        <button className="btn-primary" onClick={handleSave}>Save Settings</button>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px' }}>
        <h2 style={{ marginTop: 0 }}>Profile Information</h2>
        <div style={{ marginBottom: '2rem' }}>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Organization:</strong> {user?.organization}</p>
        </div>

        <h2>Notification Settings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={settings.notifications} onChange={e => setSettings({...settings, notifications: e.target.checked})} />
            Enable push notifications
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={settings.emailAlerts} onChange={e => setSettings({...settings, emailAlerts: e.target.checked})} />
            Email alerts for crashes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={settings.smsAlerts} onChange={e => setSettings({...settings, smsAlerts: e.target.checked})} />
            SMS alerts for critical crashes
          </label>
        </div>

        <h2>Auto-Assignment Settings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={settings.autoAssignPolice} onChange={e => setSettings({...settings, autoAssignPolice: e.target.checked})} />
            Auto-assign nearest police station
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={settings.autoAssignHospital} onChange={e => setSettings({...settings, autoAssignHospital: e.target.checked})} />
            Auto-assign nearest hospital
          </label>
        </div>

        <h2>Alert Threshold</h2>
        <div style={{ marginBottom: '2rem' }}>
          <select value={settings.severityThreshold} onChange={e => setSettings({...settings, severityThreshold: e.target.value})} style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}>
            <option value="low">Low - Alert on all detections</option>
            <option value="medium">Medium - Alert on medium severity and above</option>
            <option value="high">High - Alert only on high severity</option>
            <option value="critical">Critical - Alert only on critical crashes</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
