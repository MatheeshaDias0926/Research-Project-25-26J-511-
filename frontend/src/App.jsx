import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DeviceRegistration from './pages/DeviceRegistration'
import BusManagement from './pages/BusManagement'
import DriverManagement from './pages/DriverManagement'
import Logs from './pages/Logs'
import OAuthCallback from './pages/OAuthCallback'

export default function App() {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#071227] to-[#0b1220]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/devices" element={<DeviceRegistration />} />
            <Route path="/buses" element={<BusManagement />} />
            <Route path="/drivers" element={<DriverManagement />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
