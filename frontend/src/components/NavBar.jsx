import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function NavBar() {
  const navigate = useNavigate()
  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <nav style={{ padding: 12, borderBottom: '1px solid #eee' }}>
      <Link to="/dashboard" style={{ marginRight: 12 }}>
        Dashboard
      </Link>
      <Link to="/devices" style={{ marginRight: 12 }}>
        Devices
      </Link>
      <Link to="/buses" style={{ marginRight: 12 }}>
        Buses
      </Link>
      <Link to="/drivers" style={{ marginRight: 12 }}>
        Drivers
      </Link>
      <Link to="/logs" style={{ marginRight: 12 }}>
        Logs
      </Link>
      <button onClick={logout} style={{ float: 'right' }}>
        Logout
      </button>
    </nav>
  )
}
