import { useState } from 'react';
import client from '../api/client';

export default function FacultyActionModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    designation: '',
    department: 'CSE'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return showToast('Name and Email are required', 'error');
    
    setLoading(true);
    try {
      // We'll need a backend route for this. I'll create POST /api/admin/faculty
      await client.post('/admin/faculty', form);
      showToast('Faculty member added successfully');
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add faculty', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <h2 className="modal-title">👨‍🏫 Add New Faculty</h2>
          <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input 
              className="form-input" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              placeholder="e.g. DR. K E KANNAMMAL"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              className="form-input" 
              type="email"
              value={form.email} 
              onChange={e => setForm({ ...form, email: e.target.value })} 
              placeholder="faculty@siet.ac.in"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Designation</label>
            <input 
              className="form-input" 
              value={form.designation} 
              onChange={e => setForm({ ...form, designation: e.target.value })} 
              placeholder="e.g. Assistant Professor"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <input 
              className="form-input" 
              value={form.department} 
              onChange={e => setForm({ ...form, department: e.target.value })} 
              placeholder="e.g. CSE"
            />
          </div>

          <div className="alert alert-info" style={{ fontSize: 12 }}>
            💡 Default password will be <b>password123</b>. Faculty can change it after logging in.
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Faculty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
