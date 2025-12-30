import React, { useEffect, useState } from 'react';
import { getHospitals, createHospital, updateHospital, deleteHospital } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../AdminDashboard.css';

const HospitalsPage = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', hospital_code: '', type: 'government', district: '', province: '', address: '',
    phone: '', email: '', latitude: '', longitude: '', emergency_hotline: '', ambulance_count: 0,
    bed_capacity: '', has_trauma_unit: false, has_icu: false, contact_person: '', status: 'active'
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const data = await getHospitals();
      setHospitals(data.hospitals);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const hospitalData = {
        ...formData,
        location: { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) },
        ambulance_count: parseInt(formData.ambulance_count),
        bed_capacity: formData.bed_capacity ? parseInt(formData.bed_capacity) : undefined
      };
      delete hospitalData.latitude;
      delete hospitalData.longitude;

      if (editing) {
        await updateHospital(editing._id, hospitalData);
      } else {
        await createHospital(hospitalData);
      }
      setShowModal(false);
      resetForm();
      fetchHospitals();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this hospital?')) {
      try {
        await deleteHospital(id);
        fetchHospitals();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (hospital) => {
    setEditing(hospital);
    setFormData({
      name: hospital.name, hospital_code: hospital.hospital_code, type: hospital.type,
      district: hospital.district, province: hospital.province, address: hospital.address,
      phone: hospital.phone, email: hospital.email || '', latitude: hospital.location?.latitude || '',
      longitude: hospital.location?.longitude || '', emergency_hotline: hospital.emergency_hotline,
      ambulance_count: hospital.ambulance_count || 0, bed_capacity: hospital.bed_capacity || '',
      has_trauma_unit: hospital.has_trauma_unit, has_icu: hospital.has_icu,
      contact_person: hospital.contact_person || '', status: hospital.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', hospital_code: '', type: 'government', district: '', province: '', address: '', phone: '', email: '', latitude: '', longitude: '', emergency_hotline: '', ambulance_count: 0, bed_capacity: '', has_trauma_unit: false, has_icu: false, contact_person: '', status: 'active' });
    setEditing(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Hospitals Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Hospital</button>
      </div>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Code</th><th>Type</th><th>District</th><th>Emergency Hotline</th><th>Ambulances</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {hospitals.map(h => (
            <tr key={h._id}>
              <td>{h.name}</td><td>{h.hospital_code}</td><td>{h.type}</td><td>{h.district}</td>
              <td>{h.emergency_hotline}</td><td>{h.ambulance_count}</td>
              <td><span className={`status-badge ${h.status}`}>{h.status}</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(h)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(h._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <h2>{editing ? 'Edit Hospital' : 'Add Hospital'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="text" placeholder="Hospital Code" value={formData.hospital_code} onChange={e => setFormData({...formData, hospital_code: e.target.value})} required />
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                <option value="government">Government</option>
                <option value="private">Private</option>
                <option value="teaching">Teaching</option>
              </select>
              <input type="text" placeholder="District" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} required />
              <input type="text" placeholder="Province" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} required />
              <input type="text" placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="number" step="any" placeholder="Latitude" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} required />
              <input type="number" step="any" placeholder="Longitude" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} required />
              <input type="tel" placeholder="Emergency Hotline" value={formData.emergency_hotline} onChange={e => setFormData({...formData, emergency_hotline: e.target.value})} required />
              <input type="number" placeholder="Ambulance Count" value={formData.ambulance_count} onChange={e => setFormData({...formData, ambulance_count: e.target.value})} />
              <input type="number" placeholder="Bed Capacity" value={formData.bed_capacity} onChange={e => setFormData({...formData, bed_capacity: e.target.value})} />
              <label><input type="checkbox" checked={formData.has_trauma_unit} onChange={e => setFormData({...formData, has_trauma_unit: e.target.checked})} /> Has Trauma Unit</label>
              <label><input type="checkbox" checked={formData.has_icu} onChange={e => setFormData({...formData, has_icu: e.target.checked})} /> Has ICU</label>
              <input type="text" placeholder="Contact Person" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
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

export default HospitalsPage;
