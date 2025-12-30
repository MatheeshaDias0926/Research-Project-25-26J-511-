import React, { useEffect, useState } from 'react';
import { getConductors, createConductor, updateConductor, deleteConductor } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../AdminDashboard.css';

const ConductorsPage = () => {
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', nic: '', phone: '', email: '', address: '',
    date_of_birth: '', status: 'active'
  });

  useEffect(() => {
    fetchConductors();
  }, []);

  const fetchConductors = async () => {
    try {
      const data = await getConductors();
      setConductors(data.conductors);
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
        await updateConductor(editing._id, formData);
      } else {
        await createConductor(formData);
      }
      setShowModal(false);
      resetForm();
      fetchConductors();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this conductor?')) {
      try {
        await deleteConductor(id);
        fetchConductors();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (conductor) => {
    setEditing(conductor);
    setFormData({
      name: conductor.name, nic: conductor.nic, phone: conductor.phone,
      email: conductor.email || '', address: conductor.address || '',
      date_of_birth: conductor.date_of_birth ? conductor.date_of_birth.split('T')[0] : '',
      status: conductor.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', nic: '', phone: '', email: '', address: '', date_of_birth: '', status: 'active' });
    setEditing(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Conductors Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Conductor</button>
      </div>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>NIC</th><th>Phone</th><th>Assigned Bus</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {conductors.map(c => (
            <tr key={c._id}>
              <td>{c.name}</td><td>{c.nic}</td><td>{c.phone}</td>
              <td>{c.assigned_bus?.bus_number || '-'}</td>
              <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(c)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(c._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editing ? 'Edit Conductor' : 'Add Conductor'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="text" placeholder="NIC" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} required />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
              <input type="email" placeholder="Email (Optional)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Address (Optional)" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              <div>
                <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>Date of Birth (Optional)</label>
                <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
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

export default ConductorsPage;
