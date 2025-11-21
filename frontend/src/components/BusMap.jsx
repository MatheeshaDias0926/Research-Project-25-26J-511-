import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, Users, Navigation } from "lucide-react";
import "./BusMap.css";

// Fix default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Create custom colored markers for different bus statuses
const createBusIcon = (status) => {
  const colors = {
    active: "#10b981",
    inactive: "#ef4444",
    maintenance: "#f59e0b",
    default: "#3b82f6",
  };

  const color = colors[status] || colors.default;

  return L.divIcon({
    className: "custom-bus-marker",
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
        <path d="M6 4v5h1V6h10v3h1V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2z"/>
        <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9H5zm2 2h2v2H7v-2zm8 0h2v2h-2v-2z"/>
      </svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

export default function BusMap({ buses, onRefresh }) {
  // Default center: Colombo, Sri Lanka
  const defaultCenter = [6.9271, 79.8612];

  // Filter buses that have location data
  const busesWithLocation = buses.filter(
    (bus) => bus.currentLocation?.coordinates?.length === 2
  );

  return (
    <div className="bus-map-wrapper">
      <div className="bus-map-header">
        <div className="map-title">
          <Navigation className="map-icon" />
          <h3>Live Bus Tracking</h3>
        </div>
        <div className="map-stats">
          <span className="stat-item">
            <Bus className="stat-icon" />
            {busesWithLocation.length} Buses Tracked
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="refresh-btn"
              title="Refresh Map"
            >
              <Navigation className="refresh-icon" />
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="bus-map-legend">
        <div className="legend-item">
          <span className="legend-dot legend-active"></span>
          <span>Active</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-maintenance"></span>
          <span>Maintenance</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-inactive"></span>
          <span>Inactive</span>
        </div>
      </div>

      <div className="bus-map-container">
        <MapContainer
          center={
            busesWithLocation.length > 0
              ? [
                  busesWithLocation[0].currentLocation.coordinates[1],
                  busesWithLocation[0].currentLocation.coordinates[0],
                ]
              : defaultCenter
          }
          zoom={13}
          className="bus-map"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {busesWithLocation.map((bus) => (
            <Marker
              key={bus._id}
              position={[
                bus.currentLocation.coordinates[1],
                bus.currentLocation.coordinates[0],
              ]}
              icon={createBusIcon(bus.status)}
            >
              <Popup>
                <div className="bus-popup">
                  <div className="popup-header">
                    <Bus className="popup-icon" />
                    <strong>{bus.licensePlate}</strong>
                  </div>
                  <div className="popup-details">
                    <div className="popup-row">
                      <span className="popup-label">Route:</span>
                      <span className="popup-value">{bus.routeId}</span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Status:</span>
                      <span className={`popup-status status-${bus.status}`}>
                        {bus.status}
                      </span>
                    </div>
                    <div className="popup-row">
                      <span className="popup-label">Occupancy:</span>
                      <span className="popup-value">
                        {bus.currentOccupancy || 0}/{bus.capacity}
                      </span>
                    </div>
                    {bus.currentSpeed && (
                      <div className="popup-row">
                        <span className="popup-label">Speed:</span>
                        <span className="popup-value">
                          {bus.currentSpeed} km/h
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="popup-footer">
                    <Users className="footer-icon" />
                    <span>
                      {Math.round(
                        ((bus.currentOccupancy || 0) / bus.capacity) * 100
                      )}
                      % Full
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {busesWithLocation.length === 0 && (
        <div className="no-location-overlay">
          <Navigation className="no-location-icon" />
          <p>No buses with GPS data available</p>
        </div>
      )}
    </div>
  );
}
