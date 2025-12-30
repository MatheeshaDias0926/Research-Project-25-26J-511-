import React, { useEffect, useState } from 'react';
import { getBuses, createBus, updateBus, deleteBus } from '../../services/busService';
import { getUsers, getDrivers, getConductors } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../AdminDashboard.css';

const BusesPage = () => {
  const [buses, setBuses] = useState([]);
  const [busOwners, setBusOwners] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    bus_id: '', bus_number: '', vehicle_number: '', ownership_type: 'Private',
    registration_number: '', route: '', model: '', no_of_seats: '',
    owner_id: '', driver_id: '', conductor_id: '', sensor_status: 'active'
  });

  useEffect(() => {
    Promise.all([fetchBuses(), fetchBusOwners(), fetchDrivers(), fetchConductors()]);
  }, []);

  const fetchBuses = async () => {
    try {
      const data = await getBuses();
      setBuses(data.buses || data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusOwners = async () => {
    try {
      const data = await getUsers('busowner');
      setBusOwners(data.users || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await getDrivers();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchConductors = async () => {
    try {
      const data = await getConductors();
      setConductors(data.conductors || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const busData = {
        ...formData,
        no_of_seats: parseInt(formData.no_of_seats)
      };

      if (editing) {
        await updateBus(editing._id, busData);
      } else {
        await createBus(busData);
      }

      setShowModal(false);
      resetForm();
      fetchBuses();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this bus?')) {
      try {
        await deleteBus(id);
        fetchBuses();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (bus) => {
    setEditing(bus);
    setFormData({
      bus_id: bus.bus_id, bus_number: bus.bus_number, vehicle_number: bus.vehicle_number,
      ownership_type: bus.ownership_type, registration_number: bus.registration_number,
      route: bus.route || '', model: bus.model || '', no_of_seats: bus.no_of_seats,
      owner_id: bus.owner_id?._id || bus.owner_id,
      driver_id: bus.driver_id?._id || '',
      conductor_id: bus.conductor_id?._id || '',
      sensor_status: bus.sensor_status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ bus_id: '', bus_number: '', vehicle_number: '', ownership_type: 'Private', registration_number: '', route: '', model: '', no_of_seats: '', owner_id: '', driver_id: '', conductor_id: '', sensor_status: 'active' });
    setEditing(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Bus Fleet Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Bus</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Bus Number</th>
            <th>Vehicle No</th>
            <th>Type</th>
            <th>Seats</th>
            <th>Owner</th>
            <th>Driver</th>
            <th>Conductor</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {buses.map(bus => (
            <tr key={bus._id}>
              <td><strong>{bus.bus_number}</strong></td>
              <td>{bus.vehicle_number}</td>
              <td>{bus.ownership_type}</td>
              <td>{bus.no_of_seats}</td>
              <td>{bus.owner_id?.name || '-'}</td>
              <td>{bus.driver_id?.name || '-'}</td>
              <td>{bus.conductor_id?.name || '-'}</td>
              <td><span className={`status-badge ${bus.sensor_status}`}>{bus.sensor_status}</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(bus)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(bus._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <h2>{editing ? 'Edit Bus' : 'Add Bus'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Bus ID" value={formData.bus_id} onChange={e => setFormData({...formData, bus_id: e.target.value})} required />
              <input type="text" placeholder="Bus Number" value={formData.bus_number} onChange={e => setFormData({...formData, bus_number: e.target.value})} required />
              <input type="text" placeholder="Vehicle Number" value={formData.vehicle_number} onChange={e => setFormData({...formData, vehicle_number: e.target.value})} required />
              <select value={formData.ownership_type} onChange={e => setFormData({...formData, ownership_type: e.target.value})} required>
                <option value="Private">Private</option>
                <option value="CTB">CTB</option>
              </select>
              <input type="text" placeholder="Registration Number" value={formData.registration_number} onChange={e => setFormData({...formData, registration_number: e.target.value})} required />
              <input type="text" placeholder="Route" value={formData.route} onChange={e => setFormData({...formData, route: e.target.value})} />
              <input type="text" placeholder="Model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
              <input type="number" placeholder="Number of Seats" value={formData.no_of_seats} onChange={e => setFormData({...formData, no_of_seats: e.target.value})} required />
              <select value={formData.owner_id} onChange={e => setFormData({...formData, owner_id: e.target.value})} required>
                <option value="">Select Owner</option>
                {busOwners.map(owner => <option key={owner._id} value={owner._id}>{owner.name}</option>)}
              </select>
              <select value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})}>
                <option value="">No Driver Assigned</option>
                {drivers.filter(d => !d.assigned_bus || d.assigned_bus._id === editing?._id).map(driver => <option key={driver._id} value={driver._id}>{driver.name}</option>)}
              </select>
              <select value={formData.conductor_id} onChange={e => setFormData({...formData, conductor_id: e.target.value})}>
                <option value="">No Conductor Assigned</option>
                {conductors.filter(c => !c.assigned_bus || c.assigned_bus._id === editing?._id).map(conductor => <option key={conductor._id} value={conductor._id}>{conductor.name}</option>)}
              </select>
              <select value={formData.sensor_status} onChange={e => setFormData({...formData, sensor_status: e.target.value})} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusesPage;
