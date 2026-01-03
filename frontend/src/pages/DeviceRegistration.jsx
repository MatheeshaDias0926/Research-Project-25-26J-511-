import React, { useState } from 'react'
import api from '../api'

export default function DeviceRegistration() {
  const [deviceId, setDeviceId] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState(null)

  const createDevice = async () => {
    try {
      const r = await api.post('/devices/create', { deviceId, password })
      setResult(r.data)
    } catch (err) {
      setResult({ error: err.response?.data || err.message })
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Register Edge Device</h2>
      <div>
        <label>Device ID</label>
        <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
      </div>
      <div>
        <label>Default Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button onClick={createDevice}>Create</button>
      <pre>{result ? JSON.stringify(result, null, 2) : ''}</pre>
    </div>
  )
}
