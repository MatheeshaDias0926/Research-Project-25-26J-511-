import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import PrivateRoutes from "./components/layout/PrivateRoutes";
import RoleRedirect from "./components/layout/RoleRedirect";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Profile from "./pages/auth/Profile";

// Passenger Pages
import PassengerDashboard from "./pages/passenger/PassengerDashboard";
import Prediction from "./pages/passenger/Prediction";

// Admin Panel (unified tabbed)
import AdminPanel from "./pages/admin/AdminPanel";

// Conductor Panel (unified tabbed)
import ConductorPanel from "./pages/conductor/ConductorPanel";

// Driver Panel (unified tabbed)
import DriverPanel from "./pages/driver/DriverPanel";

import ViolationsFeed from "./pages/authority/ViolationsFeed";
import LiveDetection from "./pages/authority/RealTimeStreaming";
import MaintenanceDashboard from "./pages/authority/MaintenanceDashboard";
import IoTSimulator from "./pages/authority/IoTSimulator";
import SafetyTheories from "./pages/authority/SafetyTheories";
import AuthorityScenarioSimulator from "./pages/authority/AuthorityScenarioSimulator";
import ConductorManagement from "./pages/authority/ConductorManagement";

// Placeholders for now
const NotFound = () => (
  <div style={{ padding: 32, textAlign: "center", fontSize: 20 }}>
    404 - Page Not Found
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route element={<PrivateRoutes />}>
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Passenger Routes */}
            <Route element={<PrivateRoutes roles={["passenger"]} />}>
              <Route path="/passenger" element={<PassengerDashboard />} />
              <Route path="/passenger/prediction" element={<Prediction />} />
              <Route path="/passenger/live-map" element={<PassengerDashboard />} />
            </Route>

            {/* Conductor Routes */}
            <Route element={<PrivateRoutes roles={["conductor"]} />}>
              <Route path="/conductor" element={<ConductorPanel />} />
              <Route path="/conductor/maintenance" element={<ConductorPanel />} />
            </Route>

            {/* Driver Routes */}
            <Route element={<PrivateRoutes roles={["driver"]} />}>
              <Route path="/driver" element={<DriverPanel />} />
              <Route path="/driver/maintenance" element={<DriverPanel />} />
              <Route path="/driver/alerts" element={<DriverPanel />} />
            </Route>

            {/* Admin Routes (supports both "authority" and "admin" roles) */}
            <Route element={<PrivateRoutes roles={["authority", "admin"]} />}>
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/fleet" element={<AdminPanel />} />
              <Route path="/admin/assignments" element={<AdminPanel />} />
              <Route path="/admin/employees" element={<AdminPanel />} />
              <Route path="/admin/edge-devices" element={<AdminPanel />} />
              <Route path="/admin/sos" element={<AdminPanel />} />
              <Route path="/admin/face-recognition" element={<AdminPanel />} />
              <Route path="/admin/live-map" element={<AdminPanel />} />
              <Route path="/admin/violations" element={<ViolationsFeed />} />
              <Route path="/admin/live-detection" element={<LiveDetection />} />
              <Route path="/admin/maintenance" element={<MaintenanceDashboard />} />
              <Route path="/admin/iot" element={<IoTSimulator />} />
              <Route path="/admin/safety" element={<SafetyTheories />} />
              <Route path="/admin/simulator" element={<AuthorityScenarioSimulator />} />
              <Route path="/admin/conductors" element={<ConductorManagement />} />
            </Route>

            {/* Legacy authority routes redirect to admin */}
            <Route path="/authority/*" element={<Navigate to="/admin" replace />} />

            {/* Default redirect for root */}
            <Route path="/" element={<RoleRedirect />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
