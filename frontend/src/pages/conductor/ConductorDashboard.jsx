import { useState, useEffect } from "react";
import { Bus, Wrench, AlertCircle, CheckCircle } from "lucide-react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import { toast } from "react-toastify";

export default function ConductorDashboard() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState("");
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [formData, setFormData] = useState({
    busId: "",
    issue: "",
    severity: "low",
    notes: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
    fetchMaintenanceLogs();
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

  const fetchMaintenanceLogs = async () => {
    try {
      const response = await api.get("/maintenance");
      setMaintenanceLogs(response.data);
    } catch (error) {
      toast.error("Failed to fetch maintenance logs");
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.busId) {
      toast.warning("Please select a bus");
      return;
    }

    try {
      await api.post("/maintenance", {
        busId: formData.busId,
        issue: formData.issue,
        severity: formData.severity,
        notes: formData.notes,
      });

      toast.success("Maintenance report submitted successfully");
      setFormData({
        busId: "",
        issue: "",
        severity: "low",
        notes: "",
      });
      setSelectedBus("");
      fetchMaintenanceLogs();
    } catch (error) {
      toast.error("Failed to submit maintenance report");
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
          Conductor Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Maintenance Report Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-blue-600" />
              Report Maintenance Issue
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Bus
                </label>
                <select
                  name="busId"
                  value={formData.busId}
                  onChange={(e) => {
                    handleInputChange(e);
                    setSelectedBus(e.target.value);
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Choose a bus...</option>
                  {buses.map((bus) => (
                    <option key={bus._id} value={bus._id}>
                      {bus.licensePlate} - Route {bus.routeId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type
                </label>
                <input
                  type="text"
                  name="issue"
                  value={formData.issue}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., Brake problem, Engine noise, Door malfunction"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="low">Low - Minor issue</option>
                  <option value="medium">Medium - Needs attention</option>
                  <option value="high">High - Important</option>
                  <option value="critical">Critical - Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="input-field"
                  placeholder="Provide detailed description of the issue..."
                ></textarea>
              </div>

              <button type="submit" className="w-full btn-primary">
                Submit Report
              </button>
            </form>
          </div>

          {/* Maintenance History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-blue-600" />
              Recent Maintenance Reports
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {maintenanceLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No maintenance reports yet
                </p>
              ) : (
                maintenanceLogs.slice(0, 10).map((log) => (
                  <div
                    key={log._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
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
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                          log.severity
                        )}`}
                      >
                        {log.severity}
                      </span>
                    </div>

                    {log.notes && (
                      <p className="text-sm text-gray-600 mb-2">{log.notes}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.reportedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {log.resolvedAt && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Resolved on{" "}
                        {new Date(log.resolvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bus Fleet Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Bus className="h-6 w-6 text-blue-600" />
            Bus Fleet Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buses.map((bus) => (
              <div
                key={bus._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{bus.licensePlate}</h3>
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
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Route: {bus.routeId}</p>
                  <p>Capacity: {bus.capacity} passengers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
