import React, { useEffect, useState } from 'react';
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../AdminDashboard.css';

const DriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', nic: '', license_number: '', phone: '', email: '', address: '',
    date_of_birth: '', license_expiry: '', status: 'active'
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const data = await getDrivers();
      setDrivers(data.drivers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateDriver(editing._id, formData);
      } else {
        await createDriver(formData);
      }
      setShowModal(false);
      resetForm();
      fetchDrivers();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this driver?')) {
      try {
        await deleteDriver(id);
        fetchDrivers();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (driver) => {
    setEditing(driver);
    setFormData({
      name: driver.name, nic: driver.nic, license_number: driver.license_number,
      phone: driver.phone, email: driver.email || '', address: driver.address || '',
      date_of_birth: driver.date_of_birth ? driver.date_of_birth.split('T')[0] : '',
      license_expiry: driver.license_expiry ? driver.license_expiry.split('T')[0] : '',
      status: driver.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', nic: '', license_number: '', phone: '', email: '', address: '', date_of_birth: '', license_expiry: '', status: 'active' });
    setEditing(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Drivers Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Driver</button>
      </div>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>NIC</th><th>License No</th><th>Phone</th><th>Assigned Bus</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {drivers.map(d => (
            <tr key={d._id}>
              <td>{d.name}</td><td>{d.nic}</td><td>{d.license_number}</td><td>{d.phone}</td>
              <td>{d.assigned_bus?.bus_number || '-'}</td>
              <td><span className={`status-badge ${d.status}`}>{d.status}</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(d)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(d._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editing ? 'Edit Driver' : 'Add Driver'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="text" placeholder="NIC" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} required />
              <input type="text" placeholder="License Number" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} required />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
              <input type="email" placeholder="Email (Optional)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Address (Optional)" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              <div>
                <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>Date of Birth (Optional)</label>
                <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>License Expiry Date *</label>
                <input type="date" value={formData.license_expiry} onChange={e => setFormData({...formData, license_expiry: e.target.value})} required />
              </div>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
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

export default DriversPage;
