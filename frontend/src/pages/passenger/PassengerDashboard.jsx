import { useState, useEffect } from "react";
import { Bus, Navigation, Users, TrendingUp } from "lucide-react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import { toast } from "react-toastify";

export default function PassengerDashboard() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await api.get("/bus");
      setBuses(response.data);
    } catch (error) {
      toast.error("Failed to fetch buses");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusStatus = async (busId) => {
    try {
      const response = await api.get(`/bus/${busId}/status`);
      setSelectedBus(response.data);
    } catch (error) {
      toast.error("Failed to fetch bus status");
    }
  };

  const getPrediction = async () => {
    if (!selectedBus) {
      toast.warning("Please select a bus first");
      return;
    }

    try {
      const response = await api.post(`/bus/${selectedBus._id}/predict`, {
        routeId: selectedBus.routeId,
        stopId: 1,
        dayOfWeek: new Date().getDay(),
        timeOfDay: new Date().getHours(),
        weather: "clear",
      });
      setPrediction(response.data);
      toast.success("Prediction retrieved successfully");
    } catch (error) {
      toast.error("Failed to get prediction");
    }
  };

  const getOccupancyColor = (occupancy, capacity) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Passenger Dashboard
        </h1>

        {/* Bus List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {buses.map((bus) => (
            <div
              key={bus._id}
              onClick={() => fetchBusStatus(bus._id)}
              className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedBus?._id === bus._id ? "ring-2 ring-blue-600" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Bus className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {bus.licensePlate}
                    </h3>
                    <p className="text-sm text-gray-500">Route {bus.routeId}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Capacity</span>
                  <span className="font-medium">{bus.capacity} passengers</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bus.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {bus.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Bus Details */}
        {selectedBus && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Navigation className="h-6 w-6 text-blue-600" />
                Current Status
              </h2>

              {selectedBus.latestData ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Occupancy</span>
                      <span className="font-semibold">
                        {selectedBus.latestData.currentOccupancy} /{" "}
                        {selectedBus.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${getOccupancyColor(
                          selectedBus.latestData.currentOccupancy,
                          selectedBus.capacity
                        )}`}
                        style={{
                          width: `${Math.min(
                            (selectedBus.latestData.currentOccupancy /
                              selectedBus.capacity) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">
                        {selectedBus.latestData.gps.lat.toFixed(4)},{" "}
                        {selectedBus.latestData.gps.lon.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">Speed</p>
                      <p className="font-medium">
                        {selectedBus.latestData.speed || 0} km/h
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Footboard Status</p>
                    <p
                      className={`font-medium ${
                        selectedBus.latestData.footboardStatus
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {selectedBus.latestData.footboardStatus
                        ? "⚠️ Passengers on footboard"
                        : "✅ Safe"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No real-time data available</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Occupancy Prediction
              </h2>

              <button
                onClick={getPrediction}
                className="w-full btn-primary mb-4"
              >
                Get Prediction
              </button>

              {prediction && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Predicted Occupancy
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {Math.round(prediction.predictedOccupancy)} passengers
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>
                      {prediction.predictedOccupancy <
                      selectedBus.capacity * 0.7
                        ? "Bus will have good availability"
                        : prediction.predictedOccupancy <
                          selectedBus.capacity * 0.9
                        ? "Bus will be moderately crowded"
                        : "Bus will be very crowded"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
