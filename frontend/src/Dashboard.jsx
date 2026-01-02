import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const Dashboard = ({ deviceId }) => {
    const [status, setStatus] = useState("Normal");
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Listen for specific device alerts
        socket.on(`alert-${deviceId}`, (data) => {
            setStatus(data.event);
            setHistory(prev => [{ ...data, time: new Date().toLocaleTimeString() }, ...prev]);
        });

        return () => socket.off(`alert-${deviceId}`);
    }, [deviceId]);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold">Bus ID: {deviceId}</h2>
            
            {/* Real-time Status Badge */}
            <div className={`mt-4 p-4 rounded ${status === 'Normal' ? 'bg-green-100' : 'bg-red-500 text-white animate-pulse'}`}>
                Current State: {status}
            </div>

            <div className="mt-8">
                <h3 className="font-semibold">Recent Incident History</h3>
                <ul className="divide-y divide-gray-200">
                    {history.map((h, i) => (
                        <li key={i} className="py-2">
                            [{h.time}] - <span className="text-red-600 font-bold">{h.event}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Dashboard;