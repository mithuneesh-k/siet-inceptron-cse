import { useState, useEffect } from 'react';
import client from '../api/client';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function StudentActionModal({ student, onClose, onSaved, showToast }) {
  const isEdit = !!student;
  const [form, setForm] = useState({
    name: student?.name || '',
    roll_no: student?.roll_no || '',
    reg_no: student?.reg_no || '',
    email: student?.email || '',
    class: student?.class || '',
    batch: student?.batch || '',
    date_of_birth: student?.date_of_birth || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let res;
      if (isEdit) {
        res = await client.patch(`/admin/students/${student.id}`, form);
      } else {
        res = await client.post('/admin/students', form);
      }
      onSaved(res.data, isEdit);
      onClose();
      showToast(isEdit ? '✅ Student updated!' : '✅ Student added!');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? '✏️ Edit Student' : '➕ Add New Student'}
          </h2>
          <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="MITHUNEESH K"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="student@srishakthi.ac.in"
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Roll No *</label>
              <input
                className="form-input"
                value={form.roll_no}
                onChange={e => set('roll_no', e.target.value)}
                placeholder="25CS144"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reg No</label>
              <input
                className="form-input"
                value={form.reg_no}
                onChange={e => set('reg_no', e.target.value)}
                placeholder="714025104144"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Class</label>
              <select
                className="form-select"
                value={form.class}
                onChange={e => set('class', e.target.value)}
              >
                <option value="">Select class…</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Batch</label>
              <input
                className="form-input"
                value={form.batch}
                onChange={e => set('batch', e.target.value)}
                placeholder="2025-2029"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input
              className="form-input"
              type="date"
              value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
