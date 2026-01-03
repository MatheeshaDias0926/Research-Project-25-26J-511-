import React, { useState, useEffect } from 'react'
import api from '../api'

export default function BusManagement() {
  const [busNumber, setBusNumber] = useState('')
  const [route, setRoute] = useState('')
  const [buses, setBuses] = useState([])

  const createBus = async () => {
    try {
      await api.post('/buses', { busNumber, route })
      fetchBuses()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBuses = async () => {
    try {
      const r = await api.get('/buses')
      setBuses(r.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchBuses()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Buses</h2>
      <div>
        <input placeholder="Bus Number" value={busNumber} onChange={(e) => setBusNumber(e.target.value)} />
        <input placeholder="Route" value={route} onChange={(e) => setRoute(e.target.value)} />
        <button onClick={createBus}>Create Bus</button>
      </div>
      <ul>
        {buses.map((b) => (
          <li key={b._id}>{b.busNumber} — {b.route}</li>
        ))}
      </ul>
    </div>
  )
}
