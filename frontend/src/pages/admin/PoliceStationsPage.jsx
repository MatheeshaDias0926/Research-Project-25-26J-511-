import React, { useEffect, useState } from 'react';
import { getPoliceStations, createPoliceStation, updatePoliceStation, deletePoliceStation } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../AdminDashboard.css';

const PoliceStationsPage = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', station_code: '', district: '', province: '', address: '',
    phone: '', email: '', latitude: '', longitude: '', officer_in_charge: '',
    contact_person: '', emergency_hotline: '', status: 'active'
  });

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const data = await getPoliceStations();
      setStations(data.policeStations);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const stationData = {
        ...formData,
        location: { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) }
      };
      delete stationData.latitude;
      delete stationData.longitude;

      if (editing) {
        await updatePoliceStation(editing._id, stationData);
      } else {
        await createPoliceStation(stationData);
      }
      setShowModal(false);
      resetForm();
      fetchStations();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this police station?')) {
      try {
        await deletePoliceStation(id);
        fetchStations();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (station) => {
    setEditing(station);
    setFormData({
      name: station.name, station_code: station.station_code, district: station.district,
      province: station.province, address: station.address, phone: station.phone,
      email: station.email || '', latitude: station.location?.latitude || '',
      longitude: station.location?.longitude || '', officer_in_charge: station.officer_in_charge || '',
      contact_person: station.contact_person || '', emergency_hotline: station.emergency_hotline || '',
      status: station.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', station_code: '', district: '', province: '', address: '', phone: '', email: '', latitude: '', longitude: '', officer_in_charge: '', contact_person: '', emergency_hotline: '', status: 'active' });
    setEditing(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Police Stations Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Police Station</button>
      </div>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Code</th><th>District</th><th>Phone</th><th>Emergency Hotline</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {stations.map(s => (
            <tr key={s._id}>
              <td>{s.name}</td><td>{s.station_code}</td><td>{s.district}</td><td>{s.phone}</td>
              <td>{s.emergency_hotline || '-'}</td>
              <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(s)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(s._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editing ? 'Edit Police Station' : 'Add Police Station'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="text" placeholder="Station Code" value={formData.station_code} onChange={e => setFormData({...formData, station_code: e.target.value})} required />
              <input type="text" placeholder="District" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} required />
              <input type="text" placeholder="Province" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} required />
              <input type="text" placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="number" step="any" placeholder="Latitude" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} required />
              <input type="number" step="any" placeholder="Longitude" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} required />
              <input type="text" placeholder="Officer in Charge" value={formData.officer_in_charge} onChange={e => setFormData({...formData, officer_in_charge: e.target.value})} />
              <input type="text" placeholder="Contact Person" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
              <input type="tel" placeholder="Emergency Hotline" value={formData.emergency_hotline} onChange={e => setFormData({...formData, emergency_hotline: e.target.value})} />
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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

export default PoliceStationsPage;
