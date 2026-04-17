import { useState } from 'react';
import client from '../api/client';
import CustomSelect from './CustomSelect';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];
// Assuming batches are roughly 202x-202y, let's provide some common ones or handle it dynamically
const BATCH_OPTIONS = ['2026-2030', '2025-2029', '2024-2028', '2023-2027', '2022-2026'];

export default function FacultyAdvisorModal({ faculty, onClose, onSaved, showToast }) {
  const [advisingClass, setAdvisingClass] = useState(faculty?.advising_class || '');
  const [advisingBatch, setAdvisingBatch] = useState(faculty?.advising_batch || '');
  const [designation, setDesignation] = useState(faculty?.designation || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.patch(`/admin/faculty/${faculty.id}`, {
        advising_class: advisingClass,
        advising_batch: advisingBatch,
        designation: designation
      });
      showToast('Faculty advisor mapping updated successfully');
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update faculty', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <h2 className="modal-title">âš™ï¸ Assign Advisor Role</h2>
          <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>âœ•</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ padding: '12px', background: 'var(--green-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{faculty.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{faculty.email}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Designation</label>
            <input 
              className="form-input" 
              value={designation} 
              onChange={e => setDesignation(e.target.value)} 
              placeholder="e.g. Assistant Professor, HOD"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Advising Section</label>
            <CustomSelect 
              value={advisingClass}
              onChange={setAdvisingClass}
              options={[{ value: '', label: 'None' }, ...CLASSES.map(c => ({ value: c, label: c }))]}
              placeholder="Select Section"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Advising Batch</label>
            <CustomSelect 
              value={advisingBatch}
              onChange={setAdvisingBatch}
              options={[{ value: '', label: 'None' }, ...BATCH_OPTIONS.map(b => ({ value: b, label: b }))]}
              placeholder="Select Batch"
            />
          </div>

          <div className="alert alert-info" style={{ fontSize: 12 }}>
            ðŸ’¡ Advisors have full admin access <b>only</b> for students in their assigned Batch and Section.
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Advisor Mapping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
