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
import PhysicsCheck from "./pages/passenger/PhysicsCheck";

// Authority Pages
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";
import ViolationsFeed from "./pages/authority/ViolationsFeed";
import IoTSimulator from "./pages/authority/IoTSimulator";
import FleetManagement from "./pages/authority/FleetManagement";
import ConductorManagement from "./pages/authority/ConductorManagement";

import MaintenanceDashboard from "./pages/authority/MaintenanceDashboard";
import AuthorityPhysicsCheck from "./pages/authority/AuthorityPhysicsCheck";
import SafetyTheories from "./pages/authority/SafetyTheories";
import AuthorityScenarioSimulator from "./pages/authority/AuthorityScenarioSimulator";

// Conductor Pages
import ConductorDashboard from "./pages/conductor/ConductorDashboard";
import MaintenanceReport from "./pages/conductor/MaintenanceReport";

// Placeholders for now
const NotFound = () => (
  <div style={{ padding: 32, textAlign: "center", fontSize: 20 }}>
    404 - Page Not Found
  </div>
);
const DashboardPlaceholder = ({ title }) => (
  <div style={{ fontSize: 24, fontWeight: 700 }}>
    {title} Dashboard (Coming Soon)
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

            {/* Role Protected Routes */}
            <Route element={<PrivateRoutes roles={["passenger"]} />}>
              <Route path="/passenger" element={<PassengerDashboard />} />
              <Route path="/passenger/prediction" element={<Prediction />} />

            </Route>

            <Route element={<PrivateRoutes roles={["conductor"]} />}>
              <Route path="/conductor" element={<ConductorDashboard />} />
              <Route
                path="/conductor/maintenance"
                element={<MaintenanceReport />}
              />
            </Route>

            <Route element={<PrivateRoutes roles={["authority"]} />}>
              <Route path="/authority" element={<AuthorityDashboard />} />
              <Route path="/authority/fleet" element={<FleetManagement />} />
              <Route
                path="/authority/conductors"
                element={<ConductorManagement />}
              />
              <Route
                path="/authority/violations"
                element={<ViolationsFeed />}
              />
              <Route
                path="/authority/maintenance"
                element={<MaintenanceDashboard />}
              />
              <Route path="/authority/iot" element={<IoTSimulator />} />
              <Route
                path="/authority/safety"
                element={<AuthorityPhysicsCheck />}
              />
              <Route
                path="/authority/theories"
                element={<SafetyTheories />}
              />
              <Route
                path="/authority/simulator"
                element={<AuthorityScenarioSimulator />}
              />
            </Route>

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
