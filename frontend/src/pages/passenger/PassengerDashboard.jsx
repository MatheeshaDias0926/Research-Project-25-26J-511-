import { useState, useEffect } from "react";
import {
  Bus,
  MapPin,
  Users,
  TrendingUp,
  Search,
  Navigation,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import { toast } from "react-toastify";
import "./PassengerDashboard.css";

export default function PassengerDashboard() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchPlate, setSearchPlate] = useState("");
  const [searching, setSearching] = useState(false);

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

  const searchByLicensePlate = async (e) => {
    e.preventDefault();
    if (!searchPlate.trim()) {
      toast.warning("Please enter a license plate");
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/bus/plate/${searchPlate.trim()}`);
      await fetchBusStatus(response.data._id);
      toast.success(`Found bus: ${response.data.licensePlate}`);
      setSearchPlate("");
    } catch (error) {
      toast.error(`Bus with plate "${searchPlate}" not found`);
    } finally {
      setSearching(false);
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
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="spinner h-20 w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="page-header animate-fadeIn">
          <h1 className="page-title bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🚌 Passenger Dashboard
          </h1>
          <p className="page-subtitle">
            Track buses in real-time and get occupancy predictions
          </p>
        </div>

        {/* Search Bar */}
        <div
          className="mb-8 animate-fadeIn"
          style={{ animationDelay: "0.05s" }}
        >
          <form onSubmit={searchByLicensePlate} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                placeholder="Search bus by license plate (e.g., NP-1234)"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="btn-primary px-8 py-3 flex items-center gap-2 disabled:opacity-50"
            >
              {searching ? (
                <>
                  <div className="spinner h-5 w-5 border-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bus List */}
        <div
          className="section-header animate-fadeIn"
          style={{ animationDelay: "0.1s" }}
        >
          <Bus className="h-7 w-7 text-blue-600" />
          <h2 className="section-title">Available Buses</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {buses.map((bus, index) => (
            <div
              key={bus._id}
              onClick={() => fetchBusStatus(bus._id)}
              className={`card-hover relative overflow-hidden animate-fadeIn ${
                selectedBus?._id === bus._id
                  ? "ring-4 ring-blue-500 shadow-2xl scale-105"
                  : "hover:scale-105"
              }`}
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              {/* Gradient Background Effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-3xl opacity-10"></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                    <Bus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {bus.licensePlate}
                    </h3>
                    <p className="text-sm font-medium text-indigo-600">
                      Route {bus.routeId}
                    </p>
                  </div>
                </div>
                {selectedBus?._id === bus._id && (
                  <span className="badge badge-success animate-pulse-custom">
                    ✓ Selected
                  </span>
                )}
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Capacity
                  </span>
                  <span className="font-bold text-gray-900">
                    {bus.capacity} passengers
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Status
                  </span>
                  <span
                    className={`badge ${
                      bus.status === "active"
                        ? "badge-success"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {bus.status === "active" ? "🟢 Active" : "⚪ Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Bus Details */}
        {selectedBus && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fadeIn">
            <div className="stats-card stats-card-blue">
              <div className="section-header mb-6">
                <Navigation className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Current Status
                </h2>
              </div>

              {selectedBus.latestData ? (
                <div className="space-y-5">
                  {/* Occupancy Progress */}
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        Occupancy
                      </span>
                      <span className="font-bold text-lg text-gray-900">
                        {selectedBus.latestData.currentOccupancy} /{" "}
                        {selectedBus.capacity}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${getOccupancyColor(
                          selectedBus.latestData.currentOccupancy,
                          selectedBus.capacity
                        )} shadow-lg`}
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
                    <div className="mt-2 text-xs text-gray-500 text-center font-medium">
                      {Math.round(
                        (selectedBus.latestData.currentOccupancy /
                          selectedBus.capacity) *
                          100
                      )}
                      % Full
                    </div>
                  </div>

                  {/* Location & Speed */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-100 hover:border-blue-300 transition-colors">
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        📍 Location
                      </p>
                      <p className="font-bold text-sm text-gray-900 break-all">
                        {selectedBus.latestData.gps.lat.toFixed(4)},{" "}
                        {selectedBus.latestData.gps.lon.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-green-100 hover:border-green-300 transition-colors">
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        ⚡ Speed
                      </p>
                      <p className="font-bold text-2xl text-gray-900">
                        {selectedBus.latestData.speed || 0}
                        <span className="text-sm text-gray-500 ml-1">km/h</span>
                      </p>
                    </div>
                  </div>

                  {/* Footboard Status */}
                  <div
                    className={`p-4 rounded-xl shadow-sm border-2 ${
                      selectedBus.latestData.footboardStatus
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-green-50 border-green-300"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Footboard Status
                    </p>
                    <p
                      className={`font-bold text-lg ${
                        selectedBus.latestData.footboardStatus
                          ? "text-yellow-700"
                          : "text-green-700"
                      }`}
                    >
                      {selectedBus.latestData.footboardStatus
                        ? "⚠️ Passengers on footboard"
                        : "✅ Safe & Secure"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">
                    📊 No real-time data available
                  </p>
                </div>
              )}
            </div>

            <div className="stats-card stats-card-purple">
              <div className="section-header mb-6">
                <TrendingUp className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  Occupancy Prediction
                </h2>
              </div>

              <button
                onClick={getPrediction}
                className="w-full btn-primary text-lg py-4 mb-6 shadow-xl hover:shadow-2xl"
              >
                🔮 Get AI Prediction
              </button>

              {prediction && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Prediction Result */}
                  <div className="gradient-primary p-6 rounded-2xl shadow-xl text-white">
                    <p className="text-sm font-medium opacity-90 mb-2">
                      Predicted Occupancy
                    </p>
                    <p className="text-5xl font-extrabold mb-3">
                      {Math.round(prediction.predictedOccupancy)}
                    </p>
                    <p className="text-lg opacity-90">passengers</p>
                    <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                      <p className="text-sm font-medium">
                        Confidence:{" "}
                        <span className="font-bold">
                          {(prediction.confidence * 100).toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div
                    className={`p-4 rounded-xl border-2 ${
                      prediction.predictedOccupancy < selectedBus.capacity * 0.7
                        ? "bg-green-50 border-green-300"
                        : prediction.predictedOccupancy <
                          selectedBus.capacity * 0.9
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Users
                        className={`h-5 w-5 mt-0.5 ${
                          prediction.predictedOccupancy <
                          selectedBus.capacity * 0.7
                            ? "text-green-600"
                            : prediction.predictedOccupancy <
                              selectedBus.capacity * 0.9
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          prediction.predictedOccupancy <
                          selectedBus.capacity * 0.7
                            ? "text-green-700"
                            : prediction.predictedOccupancy <
                              selectedBus.capacity * 0.9
                            ? "text-yellow-700"
                            : "text-red-700"
                        }`}
                      >
                        {prediction.predictedOccupancy <
                        selectedBus.capacity * 0.7
                          ? "✅ Bus will have good availability"
                          : prediction.predictedOccupancy <
                            selectedBus.capacity * 0.9
                          ? "⚠️ Bus will be moderately crowded"
                          : "🚫 Bus will be very crowded"}
                      </span>
                    </div>
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
