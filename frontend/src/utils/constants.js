export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const ROLE_ROUTES = {
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/crashes', label: 'Crashes' },
    { path: '/admin/buses', label: 'Buses' },
    { path: '/admin/bus-owners', label: 'Bus Owners' },
    { path: '/admin/drivers', label: 'Drivers' },
    { path: '/admin/conductors', label: 'Conductors' },
    { path: '/admin/police-stations', label: 'Police Stations' },
    { path: '/admin/hospitals', label: 'Hospitals' },
    { path: '/admin/settings', label: 'Settings' }
  ],
  police: [
    { path: '/police/dashboard', label: 'Alerts' },
    { path: '/police/history', label: 'History' }
  ],
  hospital: [
    { path: '/hospital/dashboard', label: 'Emergency Intake' },
    { path: '/hospital/history', label: 'History' }
  ],
  ministry: [
    { path: '/ministry/dashboard', label: 'Analytics' },
    { path: '/ministry/reports', label: 'Reports' }
  ],
  busowner: [
    { path: '/busowner/dashboard', label: 'My Buses' },
    { path: '/busowner/history', label: 'Crash History' }
  ]
};

export const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#f59e0b',
  low: '#3b82f6'
};

export const STATUS_COLORS = {
  active: '#dc2626',
  in_progress: '#ea580c',
  resolved: '#16a34a',
  false_positive: '#6b7280'
};
