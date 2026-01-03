import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Logs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    async function fetchLogs() {
      try {
        const r = await api.get('/detections')
        setLogs(r.data.logs)
      } catch (err) {
        console.error(err)
      }
    }
    fetchLogs()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Detection Logs</h2>
      <ul>
        {logs.map((l) => (
          <li key={l._id} style={{ marginBottom: 12 }}>
            <div><strong>{l.deviceId}</strong> — {new Date(l.timestamp).toLocaleString()}</div>
            <div>Driver: {l.driver || 'unknown'} | Fatigue: {l.fatigueStatus} | Distraction: {l.distractionType}</div>
            {l.imageUrl && <img src={l.imageUrl} alt="capture" style={{ maxWidth: 320, marginTop: 8 }} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
