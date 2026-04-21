import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div className="auth-card card animate-fadeInUp">
        <div className="auth-logo">
          <div style={{ width: 80, height: 80, margin: '0 auto 16px' }}>
            <img src="/inceptron-navbar-logo.png" alt="Inceptron Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your SIET Inceptron account</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label">Email / Roll No / Register No</label>
            <input id="login-email" type="text" className="form-input" placeholder="e.g. 24CS001, 714024104001 or email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="login-password" type="password" className="form-input" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>

          <button id="login-submit" type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In →'}
          </button>
        </form>

        <div className="auth-demo">
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Test Credentials</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="demo-btn" onClick={() => setForm({ email: 'admin@siet.ac.in', password: 'password123' })}>👨‍🏫 Admin</button>
            <button className="demo-btn" onClick={() => setForm({ email: '25cs144@siet.ac.in', password: 'password123' })}>💻 Mithuneesh</button>
          </div>
        </div>


      </div>

      <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 80px 24px 24px; position: relative; }
        .auth-bg { position: fixed; inset: 0; background: var(--bg-primary); z-index: -1; }
        
        .auth-card { width: 100%; max-width: 420px; padding: 40px 36px; border: 1.5px solid var(--border); box-shadow: none; background: #fff; }
        
        .auth-logo { text-align: center; margin-bottom: 28px; }
        .auth-title { font-size: 26px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; margin-bottom: 6px; color: var(--color-green); }
        .auth-subtitle { font-size: 14px; color: var(--color-text-muted); }
        
        .auth-link { text-align: center; font-size: 14px; color: var(--color-text-muted); margin-top: 20px; }
        .auth-link a { color: var(--color-green); font-weight: 700; text-decoration: none; }
        .auth-link a:hover { text-decoration: underline; }
        
        .demo-btn { padding: 6px 14px; background: #fff; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--color-text-muted); cursor: pointer; transition: all var(--transition); font-weight: 600; }
        .demo-btn:hover { background: var(--green-50); color: var(--color-green); border-color: var(--color-green); }
      `}</style>
    </div>
  );
}
