import { useState, useEffect } from "react";
import {
  AlertTriangle,
  MapPin,
  TrendingUp,
  Bus,
  Wrench,
  BarChart3,
} from "lucide-react";
import Navbar from "../../components/Navbar";
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

  useEffect(() => {
    fetchAllData();
  }, []);

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
          console.error(`Failed to fetch violations for bus ${bus._id}`);
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
    } catch (error) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
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

                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(violation.timestamp).toLocaleString()}
                    </span>
                    {violation.resolved && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Resolved
                      </span>
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
      </div>
    </div>
  );
}
