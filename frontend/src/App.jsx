import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { EmergencyProvider } from "./context/EmergencyContext";
import { NotificationProvider } from "./context/NotificationContext";
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

// Crash Management Pages (police, hospital, bus_owner)
import AdminDashboard from "./pages/AdminDashboard";
import PoliceDashboard from "./pages/PoliceDashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import BusOwnerDashboard from "./pages/BusOwnerDashboard";

// Admin CRUD Pages
import PoliceStationsPage from "./pages/admin/PoliceStationsPage";
import HospitalsPage from "./pages/admin/HospitalsPage";

const NotFound = () => (
  <div style={{ padding: 32, textAlign: "center", fontSize: 20 }}>
    404 - Page Not Found
  </div>
);

function App() {
  return (
    <ThemeProvider>
    <Router>
      <AuthProvider>
        <EmergencyProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes — all use the SmartBus Layout */}
              <Route element={<Layout />}>
                <Route element={<PrivateRoutes />}>
                  <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Passenger */}
                <Route element={<PrivateRoutes roles={["passenger"]} />}>
                  <Route path="/passenger" element={<PassengerDashboard />} />
                  <Route path="/passenger/prediction" element={<Prediction />} />
                </Route>

                {/* Conductor */}
                <Route element={<PrivateRoutes roles={["conductor"]} />}>
                  <Route path="/conductor" element={<ConductorDashboard />} />
                  <Route path="/conductor/maintenance" element={<MaintenanceReport />} />
                </Route>

                {/* Authority */}
                <Route element={<PrivateRoutes roles={["authority"]} />}>
                  <Route path="/authority" element={<AuthorityDashboard />} />
                  <Route path="/authority/fleet" element={<FleetManagement />} />
                  <Route path="/authority/conductors" element={<ConductorManagement />} />
                  <Route path="/authority/violations" element={<ViolationsFeed />} />
                  <Route path="/authority/maintenance" element={<MaintenanceDashboard />} />
                  <Route path="/authority/iot" element={<IoTSimulator />} />
                  <Route path="/authority/safety" element={<AuthorityPhysicsCheck />} />
                  <Route path="/authority/theories" element={<SafetyTheories />} />
                  <Route path="/authority/simulator" element={<AuthorityScenarioSimulator />} />
                </Route>

                {/* Admin */}
                <Route element={<PrivateRoutes roles={["admin"]} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/crashes" element={<PoliceDashboard />} />
                  <Route path="/admin/buses" element={<BusOwnerDashboard />} />
                  <Route path="/admin/police-stations" element={<PoliceStationsPage />} />
                  <Route path="/admin/hospitals" element={<HospitalsPage />} />
                  <Route path="/admin/users" element={<AdminDashboard />} />
                </Route>

                {/* Police */}
                <Route element={<PrivateRoutes roles={["police"]} />}>
                  <Route path="/police" element={<PoliceDashboard />} />
                  <Route path="/police/history" element={<PoliceDashboard />} />
                </Route>

                {/* Hospital */}
                <Route element={<PrivateRoutes roles={["hospital"]} />}>
                  <Route path="/hospital" element={<HospitalDashboard />} />
                  <Route path="/hospital/history" element={<HospitalDashboard />} />
                </Route>

                {/* Bus Owner */}
                <Route element={<PrivateRoutes roles={["busowner"]} />}>
                  <Route path="/busowner" element={<BusOwnerDashboard />} />
                  <Route path="/busowner/crashes" element={<BusOwnerDashboard />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<RoleRedirect />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </EmergencyProvider>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  );
}

export default App;
