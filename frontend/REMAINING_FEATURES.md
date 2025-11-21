# Remaining Features Implementation Guide

## ✅ Completed Features (3/8)

### 1. Bus Search by License Plate ✅

- **Location:** `PassengerDashboard.jsx`
- **API:** `GET /api/bus/plate/:licensePlate`
- **Features:** Search bar with icon, error handling, toast notifications

### 2. Maintenance Update/Delete CRUD ✅

- **Location:** `ConductorDashboard.jsx`
- **API:** `PUT /api/maintenance/:id`, `DELETE /api/maintenance/:id`
- **Features:** Inline editing, delete confirmation, status dropdown

### 3. Admin Dashboard ✅

- **Location:** `AdminDashboard.jsx` + `AdminDashboard.css`
- **API:** `GET /api/bus`, `POST /api/bus`, `PUT /api/bus/:id`, `DELETE /api/bus/:id`
- **Features:** Bus CRUD, search, tabbed interface, modal forms
- **Routing:** Added admin role route in `App.jsx`

---

## 🔄 Pending Features (5/8)

### 4. Bus Logs Viewer Component

**Priority:** Medium | **Complexity:** Medium

#### Requirements:

- Display historical data logs for buses
- Pagination support
- Date range filtering
- Export functionality (optional)

#### API Endpoint:

```
GET /api/bus/:busId/logs
Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=20
```

#### Implementation Steps:

1. Create `BusLogsViewer.jsx` component in `/frontend/src/components/`
2. Create corresponding CSS file
3. Add state management for:
   - logs array
   - pagination (page, totalPages, limit)
   - date filters (startDate, endDate)
   - loading state
4. Implement API integration using axios
5. Add to PassengerDashboard, ConductorDashboard, and AuthorityDashboard
6. Features to include:
   - Table view with columns: Timestamp, GPS, Occupancy, Speed, Violations
   - Date range picker
   - "Load More" or pagination buttons
   - Export to CSV button (optional)

#### Sample Component Structure:

```jsx
import { useState, useEffect } from "react";
import { Calendar, Download, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../services/api";
import "./BusLogsViewer.css";

export default function BusLogsViewer({ busId }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get(`/bus/${busId}/logs`, { params });
      setLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  // Add table rendering, pagination controls, date filters
  return (
    <div className="bus-logs-viewer">
      {/* Date filters */}
      {/* Logs table */}
      {/* Pagination */}
    </div>
  );
}
```

---

### 5. Data Visualization Charts

**Priority:** High | **Complexity:** Medium-High

#### Requirements:

- Violation trends over time (line chart)
- Occupancy patterns by hour (area chart)
- Maintenance statistics by status (pie chart)
- Bus utilization metrics (bar chart)

#### Libraries:

- recharts (already installed ✅)

#### Implementation Steps:

1. Create `Charts` folder in `/frontend/src/components/`
2. Create individual chart components:

   - `ViolationTrendsChart.jsx` - Line chart showing violations over time
   - `OccupancyPatternsChart.jsx` - Area chart showing occupancy by hour
   - `MaintenanceStatsChart.jsx` - Pie chart showing maintenance by status
   - `BusUtilizationChart.jsx` - Bar chart showing bus activity metrics

3. Add to AuthorityDashboard.jsx:

   ```jsx
   import ViolationTrendsChart from "../../components/Charts/ViolationTrendsChart";
   import OccupancyPatternsChart from "../../components/Charts/OccupancyPatternsChart";
   import MaintenanceStatsChart from "../../components/Charts/MaintenanceStatsChart";
   import BusUtilizationChart from "../../components/Charts/BusUtilizationChart";
   ```

4. Fetch analytics data (may need new backend endpoints):
   - `GET /api/analytics/violations` - Violation data grouped by date
   - `GET /api/analytics/occupancy` - Occupancy data by hour
   - `GET /api/analytics/maintenance` - Maintenance count by status
   - `GET /api/analytics/utilization` - Bus activity metrics

#### Sample Chart Component:

```jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ViolationTrendsChart({ data }) {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Violation Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="violations"
            stroke="#ef4444"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 6. Map Integration with Leaflet

**Priority:** High | **Complexity:** Medium

#### Requirements:

- Display all buses on map with real-time GPS locations
- Custom bus markers with color coding by status
- Popup showing bus details on marker click
- Route visualization (optional)
- Auto-refresh every 30 seconds

#### Libraries:

- leaflet (already installed ✅)
- react-leaflet (already installed ✅)

#### Implementation Steps:

1. Create `BusMap.jsx` component in `/frontend/src/components/`
2. Create `BusMap.css` for map styling
3. Import Leaflet CSS in component:
   ```jsx
   import "leaflet/dist/leaflet.css";
   ```
4. Add to PassengerDashboard and AuthorityDashboard
5. Features to include:
   - MapContainer with center and zoom
   - TileLayer (OpenStreetMap)
   - Markers for each bus with custom icons
   - Popup with bus details (licensePlate, occupancy, speed)
   - Legend showing marker colors
   - Refresh button

#### Sample Component:

```jsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./BusMap.css";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function BusMap({ buses }) {
  const defaultCenter = [6.9271, 79.8612]; // Colombo, Sri Lanka

  return (
    <div className="bus-map-container">
      <MapContainer center={defaultCenter} zoom={13} className="bus-map">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {buses.map(
          (bus) =>
            bus.currentLocation?.coordinates && (
              <Marker
                key={bus._id}
                position={[
                  bus.currentLocation.coordinates[1],
                  bus.currentLocation.coordinates[0],
                ]}
              >
                <Popup>
                  <div>
                    <strong>{bus.licensePlate}</strong>
                    <br />
                    Route: {bus.routeId}
                    <br />
                    Occupancy: {bus.currentOccupancy}/{bus.capacity}
                  </div>
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  );
}
```

#### Required CSS:

```css
.bus-map-container {
  width: 100%;
  height: 500px;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.bus-map {
  width: 100%;
  height: 100%;
}
```

---

### 7. Violation Resolution Workflow

**Priority:** Medium | **Complexity:** Low

#### Requirements:

- "Resolve" button on each violation in Authority Dashboard
- Resolution form modal with:
  - Resolution notes (textarea)
  - Resolution date (auto-filled)
  - Resolved by (auto-filled from auth context)
- Update violation status to "resolved"
- Display resolution details in violation card

#### API Endpoint:

```
PUT /api/violations/:id/resolve
Body: { resolutionNotes: string }
```

#### Implementation Steps:

1. Update `AuthorityDashboard.jsx`
2. Add state for:
   - `resolvingViolation` - ID of violation being resolved
   - `resolutionNotes` - textarea content
3. Add functions:
   - `startResolving(violationId)` - Opens resolution form
   - `handleResolveViolation()` - Submits resolution
   - `cancelResolving()` - Closes form
4. Update violation card UI to show:
   - "Resolve" button if status !== "resolved"
   - Resolution details if status === "resolved"

#### Sample Implementation:

```jsx
// Add to AuthorityDashboard.jsx state
const [resolvingViolation, setResolvingViolation] = useState(null);
const [resolutionNotes, setResolutionNotes] = useState("");

// Add function
const handleResolveViolation = async (violationId) => {
  if (!resolutionNotes.trim()) {
    toast.warning("Please enter resolution notes");
    return;
  }

  try {
    await api.put(`/violations/${violationId}/resolve`, {
      resolutionNotes: resolutionNotes.trim(),
    });
    toast.success("Violation resolved successfully");
    setResolvingViolation(null);
    setResolutionNotes("");
    fetchViolations();
  } catch (error) {
    toast.error("Failed to resolve violation");
  }
};

// Update UI in violation card
{
  violation.status === "resolved" ? (
    <div className="resolution-info">
      <span className="resolved-badge">✓ Resolved</span>
      <p className="resolution-notes">{violation.resolutionNotes}</p>
      <span className="resolution-date">
        {new Date(violation.resolvedAt).toLocaleString()}
      </span>
    </div>
  ) : resolvingViolation === violation._id ? (
    <div className="resolution-form">
      <textarea
        value={resolutionNotes}
        onChange={(e) => setResolutionNotes(e.target.value)}
        placeholder="Enter resolution notes..."
        className="resolution-textarea"
        rows={3}
      />
      <div className="resolution-actions">
        <button onClick={() => handleResolveViolation(violation._id)}>
          Submit Resolution
        </button>
        <button onClick={() => setResolvingViolation(null)}>Cancel</button>
      </div>
    </div>
  ) : (
    <button onClick={() => setResolvingViolation(violation._id)}>
      Resolve Violation
    </button>
  );
}
```

---

### 8. WebSocket Real-time Updates

**Priority:** Medium | **Complexity:** High

#### Requirements:

- Real-time bus status updates
- Real-time violation alerts
- Real-time maintenance log updates
- Connection status indicator
- Auto-reconnection on disconnect

#### Library:

- socket.io-client (already installed ✅)

#### Implementation Steps:

**Step 1: Create Socket Context**

Create `/frontend/src/context/SocketContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to backend WebSocket server
    const newSocket = io("http://localhost:3000", {
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setConnected(true);
      toast.success("Real-time updates connected", {
        autoClose: 2000,
        position: "bottom-right",
      });
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
      toast.warning("Real-time updates disconnected", {
        autoClose: 2000,
        position: "bottom-right",
      });
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const value = {
    socket,
    connected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
```

**Step 2: Update main.jsx**

Wrap App with SocketProvider:

```jsx
import { SocketProvider } from "./context/SocketContext";

<AuthProvider>
  <SocketProvider>
    <App />
  </SocketProvider>
</AuthProvider>;
```

**Step 3: Use Socket in Dashboards**

Example for PassengerDashboard.jsx:

```jsx
import { useSocket } from "../../context/SocketContext";

export default function PassengerDashboard() {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for bus status updates
    socket.on("busStatusUpdate", (data) => {
      console.log("Bus status updated:", data);
      // Update bus state
      setBuses((prevBuses) =>
        prevBuses.map((bus) =>
          bus._id === data.busId ? { ...bus, ...data.updates } : bus
        )
      );
    });

    // Listen for new violations
    socket.on("newViolation", (violation) => {
      toast.warning(`New violation: ${violation.type}`, {
        autoClose: 5000,
      });
    });

    return () => {
      socket.off("busStatusUpdate");
      socket.off("newViolation");
    };
  }, [socket]);

  // Add connection indicator to UI
  return (
    <div>
      {/* Connection Status Indicator */}
      <div
        className={`connection-status ${
          connected ? "connected" : "disconnected"
        }`}
      >
        <div className="status-dot"></div>
        {connected ? "Live" : "Offline"}
      </div>

      {/* Rest of dashboard */}
    </div>
  );
}
```

**Step 4: Add CSS for Connection Indicator**

```css
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.connection-status.connected {
  background: #d1fae5;
  color: #065f46;
}

.connection-status.disconnected {
  background: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

**Step 5: Backend Socket.io Setup (if not already implemented)**

The backend needs to emit events:

- `busStatusUpdate` - When bus data changes (GPS, occupancy, etc.)
- `newViolation` - When new violation is detected
- `maintenanceUpdate` - When maintenance log is updated

---

## 📊 Implementation Priority Order

1. **Map Integration (Feature 6)** - High visual impact, high user value
2. **Charts (Feature 5)** - Authority dashboard enhancement
3. **Violation Resolution (Feature 7)** - Completes authority workflow
4. **Bus Logs Viewer (Feature 4)** - Historical data access
5. **WebSocket (Feature 8)** - Real-time enhancement (requires backend changes)

---

## 🛠️ Backend API Gaps

The following endpoints may need to be created on the backend:

### Analytics Endpoints:

- `GET /api/analytics/violations` - Violation trends data
- `GET /api/analytics/occupancy` - Occupancy patterns
- `GET /api/analytics/maintenance` - Maintenance statistics
- `GET /api/analytics/utilization` - Bus utilization metrics

### Violation Resolution:

- `PUT /api/violations/:id/resolve` - Mark violation as resolved

### Bus Logs:

- `GET /api/bus/:busId/logs` - Get historical data logs with pagination

### WebSocket Events (Socket.io):

- Emit `busStatusUpdate` when bus data changes
- Emit `newViolation` when violation detected
- Emit `maintenanceUpdate` when maintenance log updated

---

## 🧪 Testing Checklist

For each feature, test:

- ✅ API integration works correctly
- ✅ Loading states display properly
- ✅ Error handling with toast notifications
- ✅ Responsive design on mobile/tablet
- ✅ Data refreshes correctly
- ✅ User interactions are smooth
- ✅ Authentication/authorization is enforced

---

## 📦 Package Dependencies

All required packages are already installed:

- ✅ recharts - Charts
- ✅ leaflet - Maps
- ✅ react-leaflet - React wrapper for Leaflet
- ✅ socket.io-client - WebSocket client

---

## 📝 Notes

- Follow existing code patterns from completed features
- Maintain consistent styling with current dashboards
- Use toast notifications for user feedback
- Add proper error handling for all API calls
- Implement loading states for async operations
- Make components responsive
- Add proper TypeScript types (if migrating to TS in future)

---

**Status:** 3/8 features completed (37.5%)
**Next:** Implement Feature 6 (Map Integration) for immediate visual impact
