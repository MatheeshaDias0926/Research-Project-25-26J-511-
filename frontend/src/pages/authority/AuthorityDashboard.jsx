import { useState, useEffect } from "react";
import {
  AlertTriangle,
  MapPin,
  TrendingUp,
  Bus,
  Wrench,
  BarChart3,
  CheckCircle,
  X,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import BusMap from "../../components/BusMap";
import ViolationTrendsChart from "../../components/Charts/ViolationTrendsChart";
import OccupancyPatternsChart from "../../components/Charts/OccupancyPatternsChart";
import MaintenanceStatsChart from "../../components/Charts/MaintenanceStatsChart";
import BusUtilizationChart from "../../components/Charts/BusUtilizationChart";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";
import { toast } from "react-toastify";
import "./AuthorityDashboard.css";

export default function AuthorityDashboard() {
  const [violations, setViolations] = useState([]);
  const [buses, setBuses] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [stats, setStats] = useState({
    totalViolations: 0,
    footboardViolations: 0,
    overcrowdingViolations: 0,
    pendingMaintenance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [resolvingViolation, setResolvingViolation] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [analyticsData, setAnalyticsData] = useState({
    violationTrends: [],
    occupancyPatterns: [],
    maintenanceStats: [],
    busUtilization: [],
  });
  const { socket, connected } = useSocket();

  useEffect(() => {
    fetchAllData();
  }, []);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("busStatusUpdate", (data) => {
      console.log("Bus status updated:", data);
      setBuses((prevBuses) =>
        prevBuses.map((bus) =>
          bus._id === data.busId ? { ...bus, ...data.updates } : bus
        )
      );
    });

    socket.on("newViolation", (violation) => {
      toast.error(`⚠️ New violation detected: ${violation.type}`, {
        autoClose: 5000,
      });
      fetchAllData();
    });

    socket.on("maintenanceUpdate", (data) => {
      toast.info(`🔧 Maintenance log updated`, {
        autoClose: 3000,
      });
      fetchAllData();
    });

    return () => {
      socket.off("busStatusUpdate");
      socket.off("newViolation");
      socket.off("maintenanceUpdate");
    };
  }, [socket]);

  const fetchAllData = async () => {
    try {
      const [busesRes, maintenanceRes] = await Promise.all([
        api.get("/bus"),
        api.get("/maintenance"),
      ]);

      setBuses(busesRes.data);
      setMaintenanceLogs(maintenanceRes.data);

      // Fetch violations for all buses
      const allViolations = [];
      for (const bus of busesRes.data) {
        try {
          const violationsRes = await api.get(`/bus/${bus._id}/violations`);
          allViolations.push(...violationsRes.data.map((v) => ({ ...v, bus })));
        } catch (error) {
          // Silently handle - violations endpoint may not exist yet
          console.warn(`Violations endpoint not available for bus ${bus._id}`);
        }
      }
      setViolations(allViolations);

      // Calculate stats
      const footboardCount = allViolations.filter(
        (v) => v.violationType === "footboard"
      ).length;
      const overcrowdingCount = allViolations.filter(
        (v) => v.violationType === "overcrowding"
      ).length;
      const pendingCount = maintenanceRes.data.filter(
        (m) => m.status === "pending"
      ).length;

      setStats({
        totalViolations: allViolations.length,
        footboardViolations: footboardCount,
        overcrowdingViolations: overcrowdingCount,
        pendingMaintenance: pendingCount,
      });

      // Fetch analytics data after main data is loaded
      fetchAnalyticsData(maintenanceRes.data, busesRes.data);
    } catch (error) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async (maintenance = [], buses = []) => {
    try {
      // Generate mock analytics data (replace with actual API calls when backend endpoints are ready)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      });

      setAnalyticsData({
        violationTrends: last7Days.map((date, i) => ({
          date,
          violations: Math.floor(Math.random() * 20) + 5,
        })),
        occupancyPatterns: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          occupancy: Math.floor(Math.random() * 40) + 10,
        })),
        maintenanceStats: [
          {
            status: "pending",
            count:
              maintenance.filter((m) => m.status === "pending").length || 5,
          },
          {
            status: "in-progress",
            count:
              maintenance.filter((m) => m.status === "in-progress").length || 3,
          },
          {
            status: "completed",
            count:
              maintenance.filter((m) => m.status === "completed").length || 12,
          },
        ],
        busUtilization: buses.slice(0, 5).map((bus) => ({
          bus: bus.licensePlate,
          utilization: Math.floor(Math.random() * 40) + 60,
        })),
      });
    } catch (error) {
      console.error("Failed to fetch analytics data");
    }
  };

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
      fetchAllData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to resolve violation"
      );
    }
  };

  const cancelResolving = () => {
    setResolvingViolation(null);
    setResolutionNotes("");
  };

  const getViolationColor = (type) => {
    return type === "overcrowding"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const filteredViolations =
    selectedFilter === "all"
      ? violations
      : violations.filter((v) => v.violationType === selectedFilter);

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
          Transport Authority Dashboard
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Violations</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalViolations}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Footboard Violations
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.footboardViolations}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overcrowding</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.overcrowdingViolations}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Pending Maintenance
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.pendingMaintenance}
                </p>
              </div>
              <Wrench className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Violations Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Safety Violations
            </h2>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="input-field w-48"
            >
              <option value="all">All Violations</option>
              <option value="footboard">Footboard Only</option>
              <option value="overcrowding">Overcrowding Only</option>
            </select>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {filteredViolations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No violations recorded
              </p>
            ) : (
              filteredViolations.map((violation) => (
                <div
                  key={violation._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {violation.bus?.licensePlate || "Unknown Bus"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Route {violation.bus?.routeId || "N/A"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getViolationColor(
                        violation.violationType
                      )}`}
                    >
                      {violation.violationType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Occupancy</p>
                      <p className="font-medium">
                        {violation.occupancy} passengers
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Location</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {violation.location.lat.toFixed(4)},{" "}
                        {violation.location.lon.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">
                        {new Date(violation.timestamp).toLocaleString()}
                      </span>
                      {violation.resolved ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Resolved
                        </span>
                      ) : null}
                    </div>

                    {/* Resolution Section */}
                    {violation.resolved ? (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-sm font-medium text-green-800 mb-1">
                          Resolution Notes:
                        </p>
                        <p className="text-sm text-green-700">
                          {violation.resolutionNotes}
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          Resolved on{" "}
                          {new Date(violation.resolvedAt).toLocaleString()}
                        </p>
                      </div>
                    ) : resolvingViolation === violation._id ? (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Enter resolution notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleResolveViolation(violation._id)
                            }
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Submit Resolution
                          </button>
                          <button
                            onClick={cancelResolving}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolvingViolation(violation._id)}
                        className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolve Violation
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Maintenance Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-blue-600" />
              Maintenance Overview
            </h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {maintenanceLogs
                .filter((log) => log.status !== "completed")
                .map((log) => (
                  <div
                    key={log._id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {log.issue}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Bus: {log.busId?.licensePlate || "N/A"}
                        </p>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${getSeverityColor(
                          log.severity
                        )}`}
                      ></div>
                    </div>

                    {log.notes && (
                      <p className="text-sm text-gray-600 mb-2">{log.notes}</p>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.reportedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Fleet Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Bus className="h-6 w-6 text-blue-600" />
              Fleet Status
            </h2>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Active Buses</span>
                <span className="font-semibold">
                  {buses.filter((b) => b.status === "active").length} /{" "}
                  {buses.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{
                    width: `${
                      (buses.filter((b) => b.status === "active").length /
                        buses.length) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {buses.map((bus) => (
                <div
                  key={bus._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{bus.licensePlate}</p>
                    <p className="text-sm text-gray-600">Route {bus.routeId}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      bus.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {bus.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Analytics Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Average Daily Violations
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {violations.length > 0 ? Math.round(violations.length / 7) : 0}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Fleet Utilization</p>
              <p className="text-3xl font-bold text-green-600">
                {buses.length > 0
                  ? Math.round(
                      (buses.filter((b) => b.status === "active").length /
                        buses.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Maintenance Rate</p>
              <p className="text-3xl font-bold text-orange-600">
                {maintenanceLogs.length > 0
                  ? Math.round(
                      (maintenanceLogs.filter((m) => m.status === "completed")
                        .length /
                        maintenanceLogs.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        {/* Data Visualization Charts */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Data Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ViolationTrendsChart data={analyticsData.violationTrends} />
            <OccupancyPatternsChart data={analyticsData.occupancyPatterns} />
            <MaintenanceStatsChart data={analyticsData.maintenanceStats} />
            <BusUtilizationChart data={analyticsData.busUtilization} />
          </div>
        </div>

        {/* Live Bus Map */}
        <div className="mt-8">
          <BusMap buses={buses} onRefresh={fetchAllData} />
        </div>

        {/* WebSocket Connection Status */}
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${
              connected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-600 animate-pulse" : "bg-red-600"
              }`}
            ></div>
            <span className="text-sm font-semibold">
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
