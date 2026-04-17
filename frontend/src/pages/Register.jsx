import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D'];
const YEARS = [1, 2, 3, 4];

const getBatchString = (year) => {
  const joinYear = 2026 - parseInt(year);
  return `Batch ${String(joinYear).slice(-2)}-${String(joinYear + 4).slice(-2)}`;
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', roll_no: '', year: '3', class: 'CSE-A', email: '', password: '', github: '', linkedin: '', bio: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await register(form);
      navigate('/profile/' + (await import('../api/client').then(m => m.default.get('/users'))).data[0]?.id);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card card animate-fadeInUp" style={{ maxWidth: '520px' }}>
        <div className="auth-logo">
          <div style={{ width: 52, height: 52, background: 'var(--gradient-primary)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 8px 25px rgba(124,58,237,0.4)', margin: '0 auto 16px' }}>⚡</div>
          <h1 className="auth-title">Join SIET CSE Portal</h1>
          <p className="auth-subtitle">Create your achievement profile</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input id="reg-name" type="text" className="form-input" placeholder="e.g. Arjun Krishnaswamy" value={form.name} onChange={set('name')} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input id="reg-roll" type="text" className="form-input" placeholder="CSE2022001" value={form.roll_no} onChange={set('roll_no')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input id="reg-email" type="email" className="form-input" placeholder="you@SIET.edu" value={form.email} onChange={set('email')} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <select id="reg-year" className="form-select" value={form.year} onChange={set('year')}>
                {YEARS.map(y => <option key={y} value={y}>{getBatchString(y)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section *</label>
              <select id="reg-class" className="form-select" value={form.class} onChange={set('class')}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input id="reg-password" type="password" className="form-input" placeholder="At least 6 characters" value={form.password} onChange={set('password')} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">GitHub (optional)</label>
              <input type="text" className="form-input" placeholder="username" value={form.github} onChange={set('github')} />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn (optional)</label>
              <input type="text" className="form-input" placeholder="profile-slug" value={form.linkedin} onChange={set('linkedin')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio (optional)</label>
            <textarea className="form-input" placeholder="Tell something about yourself..." value={form.bio} onChange={set('bio')} rows={2} style={{ resize: 'vertical' }} />
          </div>

          <button id="reg-submit" type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} disabled={loading}>
            {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
          </button>
        </form>

        <p className="auth-link">Already registered? <Link to="/login">Sign in</Link></p>
      </div>

      <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 80px 24px 40px; position: relative; }
        .auth-bg { position: fixed; inset: 0; background: var(--gradient-hero); z-index: -1; }
        .auth-orb { position: absolute; border-radius: 50%; filter: blur(80px); }
        .auth-orb-1 { width: 400px; height: 400px; background: rgba(124,58,237,0.15); top: -100px; left: -100px; }
        .auth-orb-2 { width: 350px; height: 350px; background: rgba(59,130,246,0.12); bottom: 0; right: -80px; }
        .auth-card { width: 100%; padding: 40px 36px; }
        .auth-logo { text-align: center; margin-bottom: 28px; }
        .auth-title { font-size: 26px; font-weight: 800; font-family: 'Sekuya', sans-serif; margin-bottom: 6px; }
        .auth-subtitle { font-size: 14px; color: var(--color-text-muted); }
        .auth-link { text-align: center; font-size: 14px; color: var(--color-text-muted); margin-top: 20px; }
        .auth-link a { color: var(--color-violet-light); font-weight: 600; }
      `}</style>
    </div>
  );
}
