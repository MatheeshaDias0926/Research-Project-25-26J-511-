import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";
import "./BusLogsViewer.css";

export default function BusLogsViewer({ busId, licensePlate }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    if (busId) {
      fetchLogs();
    }
  }, [busId, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get(`/bus/${busId}/logs`, { params });

      // Handle different response structures
      if (response.data.logs) {
        setLogs(response.data.logs);
        setTotalPages(response.data.totalPages || 1);
      } else if (Array.isArray(response.data)) {
        setLogs(response.data);
        setTotalPages(Math.ceil(response.data.length / limit));
      } else {
        setLogs([]);
        setTotalPages(1);
      }
    } catch (error) {
      toast.error("Failed to fetch bus logs");
      console.error("Fetch logs error:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setPage(1);
    fetchLogs();
  };

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast.warning("No logs to export");
      return;
    }

    const headers = [
      "Timestamp",
      "GPS Latitude",
      "GPS Longitude",
      "Occupancy",
      "Speed",
      "Violations",
    ];
    const csvData = logs.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.gpsLocation?.coordinates?.[1] || "N/A",
      log.gpsLocation?.coordinates?.[0] || "N/A",
      `${log.occupancy || 0}`,
      `${log.speed || 0} km/h`,
      log.violations?.length || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bus_logs_${licensePlate}_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  return (
    <div className="bus-logs-viewer">
      <div className="logs-header">
        <div className="logs-title">
          <Clock className="logs-icon" />
          <h3>Bus Data Logs - {licensePlate}</h3>
        </div>
        <button
          onClick={exportToCSV}
          className="export-btn"
          disabled={logs.length === 0}
        >
          <Download className="export-icon" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} className="logs-filters">
        <div className="filter-group">
          <Calendar className="filter-icon" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="filter-input"
            placeholder="Start Date"
          />
        </div>
        <div className="filter-group">
          <Calendar className="filter-icon" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="filter-input"
            placeholder="End Date"
          />
        </div>
        <button type="submit" className="filter-btn">
          Apply Filter
        </button>
        <button
          type="button"
          onClick={handleClearFilters}
          className="clear-btn"
        >
          Clear
        </button>
      </form>

      {/* Logs Table */}
      {loading ? (
        <div className="logs-loading">
          <div className="spinner"></div>
          <p>Loading logs...</p>
        </div>
      ) : logs.length > 0 ? (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>
                    <Clock className="th-icon" />
                    Timestamp
                  </th>
                  <th>
                    <MapPin className="th-icon" />
                    GPS Location
                  </th>
                  <th>
                    <Users className="th-icon" />
                    Occupancy
                  </th>
                  <th>
                    <Gauge className="th-icon" />
                    Speed
                  </th>
                  <th>
                    <AlertTriangle className="th-icon" />
                    Violations
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log._id || index}>
                    <td className="timestamp-cell">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="gps-cell">
                      {log.gpsLocation?.coordinates ? (
                        <span className="gps-coords">
                          {log.gpsLocation.coordinates[1].toFixed(4)},{" "}
                          {log.gpsLocation.coordinates[0].toFixed(4)}
                        </span>
                      ) : (
                        <span className="no-data">N/A</span>
                      )}
                    </td>
                    <td className="occupancy-cell">
                      <span
                        className={`occupancy-badge ${getOccupancyClass(
                          log.occupancy,
                          log.bus?.capacity
                        )}`}
                      >
                        {log.occupancy || 0}
                      </span>
                    </td>
                    <td className="speed-cell">
                      <span className="speed-value">{log.speed || 0} km/h</span>
                    </td>
                    <td className="violations-cell">
                      {log.violations && log.violations.length > 0 ? (
                        <span className="violations-badge">
                          {log.violations.length}
                        </span>
                      ) : (
                        <span className="no-violations">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="logs-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="pagination-btn"
            >
              <ChevronLeft className="pagination-icon" />
              Previous
            </button>
            <span className="pagination-info">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="pagination-btn"
            >
              Next
              <ChevronRight className="pagination-icon" />
            </button>
          </div>
        </>
      ) : (
        <div className="no-logs">
          <Clock className="no-logs-icon" />
          <p>No logs found for this bus</p>
          {(startDate || endDate) && (
            <button onClick={handleClearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to determine occupancy class
function getOccupancyClass(occupancy, capacity) {
  if (!capacity) return "occupancy-normal";
  const percentage = (occupancy / capacity) * 100;
  if (percentage >= 90) return "occupancy-critical";
  if (percentage >= 70) return "occupancy-high";
  return "occupancy-normal";
}
