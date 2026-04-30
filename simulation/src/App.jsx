import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DriverSim from './pages/DriverSim';
import TrafficSim from './pages/trafficSim';
import OvercrowdingSim from './pages/OvercrowdingSim';
import CrashSim from './pages/CrashSim';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<DriverSim />} />
            <Route path="/driver" element={<DriverSim />} />
            <Route path="/traffic" element={<TrafficSim />} />
            <Route path="/overcrowding" element={<OvercrowdingSim />} />
            <Route path="/crash" element={<CrashSim />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
