import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../AdminDashboard.css';

const BusOwnersPage = () => {
  const [busOwners, setBusOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    phone: ''
  });

  useEffect(() => {
    fetchBusOwners();
  }, []);

  const fetchBusOwners = async () => {
    try {
      const data = await getUsers('busowner');
      setBusOwners(data.users);
    } catch (error) {
      console.error('Failed to fetch bus owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = { ...formData, role: 'busowner' };
      if (editingOwner) {
        await updateUser(editingOwner._id, userData);
      } else {
        await createUser(userData);
      }
      setShowModal(false);
      resetForm();
      fetchBusOwners();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bus owner?')) {
      try {
        await deleteUser(id);
        fetchBusOwners();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleEdit = (owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email,
      password: '',
      organization: owner.organization,
      phone: owner.phone || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', organization: '', phone: '' });
    setEditingOwner(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Bus Owners Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add Bus Owner
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Organization</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {busOwners.map(owner => (
            <tr key={owner._id}>
              <td>{owner.name}</td>
              <td>{owner.email}</td>
              <td>{owner.organization}</td>
              <td>{owner.phone || '-'}</td>
              <td><span className={`status-badge ${owner.is_active ? 'active' : 'inactive'}`}>{owner.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(owner)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(owner._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingOwner ? 'Edit Bus Owner' : 'Add New Bus Owner'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              <input type="password" placeholder={editingOwner ? 'Password (leave blank to keep current)' : 'Password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingOwner} />
              <input type="text" placeholder="Organization" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} required />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingOwner ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusOwnersPage;
