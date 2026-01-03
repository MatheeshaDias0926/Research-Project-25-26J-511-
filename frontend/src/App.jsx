import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DeviceRegistration from './pages/DeviceRegistration'
import BusManagement from './pages/BusManagement'
import DriverManagement from './pages/DriverManagement'
import Logs from './pages/Logs'
import OAuthCallback from './pages/OAuthCallback'
import NavBar from './components/NavBar'

function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/devices" element={<DeviceRegistration />} />
        <Route path="/buses" element={<BusManagement />} />
        <Route path="/drivers" element={<DriverManagement />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </div>
  )
}

export default App
