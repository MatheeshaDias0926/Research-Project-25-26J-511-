import { useState, useEffect } from "react";
import {
  Bus,
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  BarChart3,
  Search,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";
import { toast } from "react-toastify";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("buses"); // buses, users, stats
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [searchPlate, setSearchPlate] = useState("");

  const [busFormData, setBusFormData] = useState({
    licensePlate: "",
    routeId: "",
    capacity: 50,
    status: "active",
  });

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

  const handleAddBus = async (e) => {
    e.preventDefault();
    try {
      await api.post("/bus", busFormData);
      toast.success("Bus added successfully");
      setShowAddBusModal(false);
      setBusFormData({
        licensePlate: "",
        routeId: "",
        capacity: 50,
        status: "active",
      });
      fetchBuses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add bus");
    }
  };

  const handleUpdateBus = async (busId) => {
    try {
      await api.put(`/bus/${busId}`, busFormData);
      toast.success("Bus updated successfully");
      setEditingBus(null);
      setBusFormData({
        licensePlate: "",
        routeId: "",
        capacity: 50,
        status: "active",
      });
      fetchBuses();
    } catch (error) {
      toast.error("Failed to update bus");
    }
  };

  const handleDeleteBus = async (busId) => {
    if (!window.confirm("Are you sure you want to delete this bus?")) {
      return;
    }

    try {
      await api.delete(`/bus/${busId}`);
      toast.success("Bus deleted successfully");
      fetchBuses();
    } catch (error) {
      toast.error("Failed to delete bus");
    }
  };

  const startEditingBus = (bus) => {
    setEditingBus(bus._id);
    setBusFormData({
      licensePlate: bus.licensePlate,
      routeId: bus.routeId,
      capacity: bus.capacity,
      status: bus.status,
    });
  };

  const cancelEditing = () => {
    setEditingBus(null);
    setBusFormData({
      licensePlate: "",
      routeId: "",
      capacity: 50,
      status: "active",
    });
  };

  const searchByLicensePlate = async (e) => {
    e.preventDefault();
    if (!searchPlate.trim()) {
      fetchBuses();
      return;
    }

    try {
      const response = await api.get(`/bus/plate/${searchPlate.trim()}`);
      setBuses([response.data]);
      toast.success(`Found bus: ${response.data.licensePlate}`);
    } catch (error) {
      toast.error(`Bus with plate "${searchPlate}" not found`);
      fetchBuses();
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="spinner h-20 w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <Navbar />

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <h1 className="admin-title">⚙️ Admin Dashboard</h1>
          <p className="admin-subtitle">
            Manage buses, users, and system settings
          </p>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            onClick={() => setActiveTab("buses")}
            className={`admin-tab ${
              activeTab === "buses" ? "admin-tab-active" : ""
            }`}
          >
            <Bus className="h-5 w-5" />
            Bus Management
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`admin-tab ${
              activeTab === "users" ? "admin-tab-active" : ""
            }`}
          >
            <Users className="h-5 w-5" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`admin-tab ${
              activeTab === "stats" ? "admin-tab-active" : ""
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            System Stats
          </button>
        </div>

        {/* Bus Management Tab */}
        {activeTab === "buses" && (
          <div className="admin-content">
            {/* Actions Bar */}
            <div className="admin-actions-bar">
              <form
                onSubmit={searchByLicensePlate}
                className="admin-search-form"
              >
                <div className="admin-search-input-wrapper">
                  <Search className="admin-search-icon" />
                  <input
                    type="text"
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value)}
                    placeholder="Search by license plate..."
                    className="admin-search-input"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchPlate("");
                    fetchBuses();
                  }}
                  className="btn-secondary"
                >
                  Clear
                </button>
              </form>
              <button
                onClick={() => setShowAddBusModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add New Bus
              </button>
            </div>

            {/* Bus List */}
            <div className="admin-bus-grid">
              {buses.map((bus) => (
                <div key={bus._id} className="admin-bus-card">
                  {editingBus === bus._id ? (
                    /* Edit Mode */
                    <div className="admin-edit-form">
                      <input
                        type="text"
                        value={busFormData.licensePlate}
                        onChange={(e) =>
                          setBusFormData({
                            ...busFormData,
                            licensePlate: e.target.value,
                          })
                        }
                        placeholder="License Plate"
                        className="admin-input"
                      />
                      <input
                        type="text"
                        value={busFormData.routeId}
                        onChange={(e) =>
                          setBusFormData({
                            ...busFormData,
                            routeId: e.target.value,
                          })
                        }
                        placeholder="Route ID"
                        className="admin-input"
                      />
                      <input
                        type="number"
                        value={busFormData.capacity}
                        onChange={(e) =>
                          setBusFormData({
                            ...busFormData,
                            capacity: parseInt(e.target.value),
                          })
                        }
                        placeholder="Capacity"
                        className="admin-input"
                      />
                      <select
                        value={busFormData.status}
                        onChange={(e) =>
                          setBusFormData({
                            ...busFormData,
                            status: e.target.value,
                          })
                        }
                        className="admin-input"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                      <div className="admin-edit-actions">
                        <button
                          onClick={() => handleUpdateBus(bus._id)}
                          className="btn-success"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="btn-secondary"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="admin-bus-header">
                        <div className="admin-bus-icon">
                          <Bus />
                        </div>
                        <div>
                          <h3 className="admin-bus-plate">
                            {bus.licensePlate}
                          </h3>
                          <p className="admin-bus-route">Route {bus.routeId}</p>
                        </div>
                      </div>
                      <div className="admin-bus-details">
                        <div className="admin-bus-detail">
                          <span>Capacity:</span>
                          <strong>{bus.capacity}</strong>
                        </div>
                        <div className="admin-bus-detail">
                          <span>Status:</span>
                          <span
                            className={`admin-status-badge admin-status-${bus.status}`}
                          >
                            {bus.status}
                          </span>
                        </div>
                      </div>
                      <div className="admin-bus-actions">
                        <button
                          onClick={() => startEditingBus(bus)}
                          className="admin-action-btn admin-action-edit"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBus(bus._id)}
                          className="admin-action-btn admin-action-delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div className="admin-content">
            <div className="admin-placeholder">
              <Users className="h-16 w-16 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700">
                User Management
              </h3>
              <p className="text-gray-500">
                User management features coming soon. You can manage users
                through the backend API.
              </p>
            </div>
          </div>
        )}

        {/* System Stats Tab */}
        {activeTab === "stats" && (
          <div className="admin-content">
            <div className="admin-placeholder">
              <BarChart3 className="h-16 w-16 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700">
                System Statistics
              </h3>
              <p className="text-gray-500">
                Detailed system statistics and analytics will be displayed here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Bus Modal */}
      {showAddBusModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowAddBusModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Add New Bus</h2>
              <button
                onClick={() => setShowAddBusModal(false)}
                className="admin-modal-close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddBus} className="admin-modal-form">
              <div className="admin-form-field">
                <label className="admin-form-label">License Plate</label>
                <input
                  type="text"
                  value={busFormData.licensePlate}
                  onChange={(e) =>
                    setBusFormData({
                      ...busFormData,
                      licensePlate: e.target.value,
                    })
                  }
                  placeholder="e.g., NP-1234"
                  className="admin-input"
                  required
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Route ID</label>
                <input
                  type="text"
                  value={busFormData.routeId}
                  onChange={(e) =>
                    setBusFormData({ ...busFormData, routeId: e.target.value })
                  }
                  placeholder="e.g., ROUTE-138"
                  className="admin-input"
                  required
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Capacity</label>
                <input
                  type="number"
                  value={busFormData.capacity}
                  onChange={(e) =>
                    setBusFormData({
                      ...busFormData,
                      capacity: parseInt(e.target.value),
                    })
                  }
                  placeholder="50"
                  min="1"
                  className="admin-input"
                  required
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Status</label>
                <select
                  value={busFormData.status}
                  onChange={(e) =>
                    setBusFormData({ ...busFormData, status: e.target.value })
                  }
                  className="admin-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="btn-primary">
                  <Plus className="h-5 w-5" />
                  Add Bus
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBusModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
