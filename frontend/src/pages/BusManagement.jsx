import { useEffect, useState } from 'react'
import api from '../api'

export default function BusManagement() {
  const [busNumber, setBusNumber] = useState('')
  const [route, setRoute] = useState('')
  const [buses, setBuses] = useState([])

  useEffect(() => {
    api.get('/buses').then(r => setBuses(r.data))
  }, [])

  const createBus = async () => {
    await api.post('/buses', { busNumber, route })
    setBusNumber('')
    setRoute('')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Bus Management</h2>

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
        <input className="input" placeholder="Bus Number" value={busNumber} onChange={e => setBusNumber(e.target.value)} />
        <input className="input" placeholder="Route" value={route} onChange={e => setRoute(e.target.value)} />
        <button className="btn-primary" onClick={createBus}>Add Bus</button>
      </div>

      <div className="card">
        <ul className="space-y-2">
          {buses.map(b => (
            <li key={b._id} className="flex justify-between border-b pb-2">
              <span>{b.busNumber}</span>
              <span className="text-gray-500">{b.route}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
