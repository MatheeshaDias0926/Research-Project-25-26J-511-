import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Cpu, Bus, Users, FileText, Menu, X } from 'lucide-react'
import { useState } from 'react'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/devices', label: 'Devices', icon: Cpu },
  { to: '/buses', label: 'Buses', icon: Bus },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/logs', label: 'Logs', icon: FileText },
]

function LinkItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition
        ${isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}`
      }
    >
      <Icon className="w-5 h-5" />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 min-h-screen sticky top-0 bg-[#0b1220] text-gray-200 border-r border-white/10">
        <div className="p-6 flex flex-col w-full">
          <h1 className="text-2xl font-bold mb-6">Edge Driver</h1>
          <nav className="space-y-2">
            {links.map(l => <LinkItem key={l.to} {...l} />)}
          </nav>
        </div>
      </aside>

      {/* Mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 rounded"
        onClick={() => setOpen(true)}
      >
        <Menu className="text-white" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40">
          <aside className="absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-gen-deep via-gen-lav to-gen-pink text-white p-6">
            <button onClick={() => setOpen(false)} className="mb-6">
              <X />
            </button>
            <nav className="space-y-2">
              {links.map(l => (
                <div key={l.to} onClick={() => setOpen(false)}>
                  <LinkItem {...l} />
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
