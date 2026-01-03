import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Dashboard() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    async function fetchMe() {
      try {
        const r = await api.get('/auth/me')
        setMe(r.data.user)
      } catch (err) {
        console.log(err)
      }
    }
    fetchMe()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>
      {me ? <div>Welcome, {me.name} ({me.email})</div> : <div>Loading user...</div>}
      <p>Use the navigation to manage devices, buses, drivers, and view logs.</p>
    </div>
  )
}
