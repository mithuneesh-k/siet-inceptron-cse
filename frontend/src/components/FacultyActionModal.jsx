import { useState } from 'react';
import client from '../api/client';
import { Shield, Key, Copy, Check, AlertCircle } from 'lucide-react';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function FacultyActionModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: '',
    username: '',
    employee_id: '',
    email: '',
    designation: 'Assistant Professor',
    department: 'CSE',
    advising_class: '',
    advising_batch: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      return showToast('Full Name and Email are required', 'error');
    }

    if (form.password && form.password.length < 8) {
      return showToast('Password must be at least 8 characters long', 'error');
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        username: form.username ? form.username.trim().toLowerCase() : undefined,
        employee_id: form.employee_id ? form.employee_id.trim().toUpperCase() : undefined,
        designation: form.designation.trim(),
        department: form.department.trim(),
        advising_class: form.advising_class || null,
        advising_batch: form.advising_batch || null,
        password: form.password || undefined
      };

      const res = await client.post('/admin/faculty', payload);
      showToast('Faculty account created successfully!', 'success');
      setCreatedResult(res.data);
      if (onSaved) onSaved();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to create faculty account.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdResult) return;
    const text = `SIET Inceptron Faculty Account:\nUsername: ${createdResult.username}\nEmployee ID: ${createdResult.employee_id}\nEmail: ${createdResult.email}\nTemporary Password: ${createdResult.temporary_password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} style={{ color: 'var(--color-green, #10b981)' }} />
            {createdResult ? 'Faculty Account Created' : 'Add Authorized Faculty'}
          </h2>
          <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {createdResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="alert alert-success" style={{ fontSize: 13 }}>
              ✅ Faculty account provisioned successfully. Share these credentials securely with the faculty member.
            </div>

            <div style={{
              background: 'var(--bg-input, #0f172a)',
              padding: 16,
              borderRadius: 10,
              border: '1px solid var(--border, #334155)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13
            }}>
              <div><strong>Name:</strong> {createdResult.name}</div>
              <div><strong>Username:</strong> <code style={{ color: '#38bdf8' }}>{createdResult.username}</code></div>
              <div><strong>Employee ID:</strong> <code style={{ color: '#a78bfa' }}>{createdResult.employee_id}</code></div>
              <div><strong>Email:</strong> {createdResult.email}</div>
              <div><strong>Designation:</strong> {createdResult.designation || 'Faculty'}</div>
              <div>
                <strong>Initial Password:</strong>{' '}
                <code style={{ background: '#1e293b', padding: '3px 8px', borderRadius: 4, color: '#34d399', fontWeight: 700 }}>
                  {createdResult.temporary_password}
                </code>
              </div>
            </div>

            <div className="alert alert-info" style={{ fontSize: 12 }}>
              🔒 The faculty member will be required to change this password upon their first login.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={copyCredentials} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                id="faculty-name-input"
                className="form-input" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                placeholder="e.g. Dr. K. E. Kannammal"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  id="faculty-username-input"
                  className="form-input" 
                  value={form.username} 
                  onChange={e => setForm({ ...form, username: e.target.value })} 
                  placeholder="e.g. kannammal"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employee / Faculty ID</label>
                <input 
                  id="faculty-emp-id-input"
                  className="form-input" 
                  value={form.employee_id} 
                  onChange={e => setForm({ ...form, employee_id: e.target.value })} 
                  placeholder="e.g. FAC004"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input 
                id="faculty-email-input"
                className="form-input" 
                type="email"
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })} 
                placeholder="faculty@siet.ac.in"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  placeholder="CSE"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Advising Section (Optional)</label>
                <select
                  className="form-select"
                  value={form.advising_class}
                  onChange={e => setForm({ ...form, advising_class: e.target.value })}
                >
                  <option value="">None / Dept-wide</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Advising Batch (Optional)</label>
                <input
                  className="form-input"
                  value={form.advising_batch}
                  onChange={e => setForm({ ...form, advising_batch: e.target.value })}
                  placeholder="e.g. 2025-2029"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Custom Initial Password (Optional)</label>
              <input 
                className="form-input" 
                type="password"
                value={form.password} 
                onChange={e => setForm({ ...form, password: e.target.value })} 
                placeholder="Leave blank to auto-generate secure password"
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                If left blank, a secure individual 12-character hexadecimal password will be generated automatically.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button 
                id="submit-add-faculty"
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Add Faculty Member'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
