import React, { useState, useEffect } from 'react'
import api from '../api'

export default function DriverManagement() {
  const [name, setName] = useState('')
  const [nic, setNic] = useState('')
  const [busId, setBusId] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [drivers, setDrivers] = useState([])

    const [buses, setBuses] = useState([])
    const [form, setForm] = useState({ name: '', busId: '', images: null })

    useEffect(() => {
      fetchDrivers()
      fetchBuses()
    }, [])

    async function fetchDrivers() {
      try {
        const r = await api.get('/drivers')
        setDrivers(r.data)
      } catch (err) {
        console.error(err)
      }
    }

    async function fetchBuses() {
      try {
        const res = await api.get('/buses')
        setBuses(res.data)
      } catch (err) {
        console.error('Failed to fetch buses', err)
      }
    }

    async function handleSubmit(e) {
      e.preventDefault()
      try {
        const data = new FormData()
        data.append('name', form.name)
        data.append('busId', form.busId)
        if (form.images) {
          for (let i = 0; i < form.images.length; i++) data.append('images', form.images[i])
        }
        const res = await api.post('/drivers', data, { headers: { 'Content-Type': 'multipart/form-data' } })
        setDrivers(prev => [res.data, ...prev])
        setForm({ name: '', busId: '', images: null })
      } catch (err) {
        console.error('Create driver failed', err)
        alert('Failed to create driver')
      }
    }

    return (
      <div style={{ padding: 24 }}>
        <h2>Drivers</h2>
        <form onSubmit={handleSubmit} className="card form">
          <label>
            Name
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Bus
            <select value={form.busId} onChange={e => setForm({ ...form, busId: e.target.value })}>
              <option value="">-- Select Bus --</option>
              {buses.map(b => (
                <option key={b._id} value={b._id}>{b.plateNumber || b.name || b._id}</option>
              ))}
            </select>
          </label>
          <label>
            Images
            <input type="file" multiple onChange={e => setForm({ ...form, images: e.target.files })} />
          </label>
          <button type="submit" className="btn">Create</button>
        </form>

        <ul>
          {drivers.map(d => (
            <li key={d._id}>{d.name} — {d.nicNumber || '—'}</li>
          ))}
        </ul>
      </div>
    )
  }
