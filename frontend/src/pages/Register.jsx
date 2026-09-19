import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];
const YEARS = [1, 2, 3, 4];

const getBatchString = (year) => {
  const joinYear = 2026 - parseInt(year);
  return `Batch ${String(joinYear).slice(-2)}-${String(joinYear + 4).slice(-2)}`;
};

export default function Register() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    roll_no: '', 
    year: '3', 
    class: 'CSE-A', 
    email: '', 
    password: '', 
    github: '', 
    linkedin: '', 
    twitter: '',
    instagram: '',
    portfolio: '',
    bio: '' 
  });
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
      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card card animate-fadeInUp" style={{ maxWidth: '520px' }}>
        <div className="auth-logo">
          <div style={{ width: 140, height: 140, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={theme === 'dark' ? '/dark.png' : '/inceptron-logo.jpeg'} alt="Inceptron Logo" className="logo-blend" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
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
              <label className="form-label">REGISTER NO *</label>
              <input id="reg-roll" type="text" className="form-input" placeholder="714025104173" value={form.roll_no} onChange={set('roll_no')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input id="reg-email" type="email" className="form-input" placeholder="you@SIET.edu" value={form.email} onChange={set('email')} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <CustomSelect
                value={form.year}
                onChange={val => setForm(f => ({ ...f, year: val }))}
                options={YEARS.map(y => ({ value: String(y), label: getBatchString(y) }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Section *</label>
              <CustomSelect
                value={form.class}
                onChange={val => setForm(f => ({ ...f, class: val }))}
                options={CLASSES.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input id="reg-password" type="password" className="form-input" placeholder="At least 6 characters" value={form.password} onChange={set('password')} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">GitHub URL (optional)</label>
              <input type="text" className="form-input" placeholder="https://github.com/yourname" value={form.github} onChange={set('github')} />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn URL (optional)</label>
              <input type="text" className="form-input" placeholder="https://linkedin.com/in/yourname" value={form.linkedin} onChange={set('linkedin')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Twitter/X URL (optional)</label>
              <input type="text" className="form-input" placeholder="https://twitter.com/..." value={form.twitter || ''} onChange={set('twitter')} />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram URL (optional)</label>
              <input type="text" className="form-input" placeholder="https://instagram.com/..." value={form.instagram || ''} onChange={set('instagram')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Portfolio URL (optional)</label>
            <input type="text" className="form-input" placeholder="https://yourportfolio.com" value={form.portfolio || ''} onChange={set('portfolio')} />
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
        .auth-page { min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 80px 24px 40px; position: relative; background: var(--bg-primary); color: var(--color-text); }
        .login-theme-toggle { position: fixed; top: 24px; right: 24px; z-index: 200; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--border-strong); background: var(--bg-card); color: var(--color-green); display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(10px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); transition: all 0.25s ease; }
        .login-theme-toggle:hover { transform: scale(1.08) rotate(12deg); border-color: var(--color-green); }
        .auth-bg { position: fixed; inset: 0; background: var(--bg-primary); z-index: -1; }
        .auth-card { width: 100%; padding: 40px 36px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
        .auth-logo { text-align: center; margin-bottom: 28px; }
        .auth-title { font-size: 26px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; margin-bottom: 6px; color: var(--color-text); }
        .auth-subtitle { font-size: 14px; color: var(--color-text-muted); }
        .auth-link { text-align: center; font-size: 14px; color: var(--color-text-muted); margin-top: 20px; }
        .auth-link a { color: var(--color-green); font-weight: 600; }
      `}</style>
    </div>
  );
}
