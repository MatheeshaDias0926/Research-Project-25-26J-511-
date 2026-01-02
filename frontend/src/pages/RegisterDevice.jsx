import React, { useState } from 'react';
import axios from 'axios';

const RegisterDevice = () => {
    const [deviceId, setDeviceId] = useState('');
    const [interval, setInterval] = useState(15); // minutes

    const handleAddDevice = async () => {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/api/devices/add', 
            { deviceId, verifyInterval: interval },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Device Linked Successfully!");
    };

    return (
        <div className="registration-container">
            <h2>Register New Edge Device</h2>
            <input placeholder="Device ID (e.g., BUS_001)" onChange={(e) => setDeviceId(e.target.value)} />
            <select onChange={(e) => setInterval(e.target.value)}>
                <option value="1">Verify every 1 min</option>
                <option value="15">Verify every 15 min</option>
                <option value="30">Verify every 30 min</option>
            </select>
            <button onClick={handleAddDevice}>Link Device</button>
        </div>
    );
};

export default RegisterDevice;