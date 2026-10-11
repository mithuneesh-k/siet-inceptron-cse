import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SwitchMode from '../components/ui/switch-mode';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="login-experience">
      {/* Top Navigation Controls */}
      <div className="login-top-controls">
        <Link to="/showcase" className="login-back-btn">
          <ArrowLeft size={16} />
          <span>Back to Showcase</span>
        </Link>
        <SwitchMode width={72} height={36} />
      </div>

      {/* LOGIN STAGE: DUAL PANEL LAYOUT */}
      <div className="login-stage">
        <div className="auth-07-container">
          {/* LEFT PANEL: Dual-Artwork Full Screen Cover Panel */}
          <div className="auth-07-left-panel">
            <div className="auth-07-panel-artwork-bg">
              <img
                src="/main.png"
                alt="SIET Inceptron Dark Artwork"
                className={`login-hero-image login-hero-image-dark ${theme === 'dark' ? 'active' : ''}`}
              />
              <img
                src="/module.png"
                alt="SIET Inceptron Light Artwork"
                className={`login-hero-image login-hero-image-light ${theme === 'light' ? 'active' : ''}`}
              />
              <div className="login-left-overlay" />
            </div>

            <div className="auth-07-logo-wrapper">
              <h2 className="auth-07-left-heading">SIET INCEPTRON</h2>
              <p className="auth-07-left-subheading">Department of Computer Science & Engineering</p>
            </div>
          </div>

          {/* RIGHT PANEL: Authentication Form */}
          <div className="auth-07-form-wrapper">
            <div className="auth-07-card">
              {/* Mobile Header */}
              <div className="auth-07-mobile-header">
                <img
                  src={theme === 'dark' ? '/dark.png?v=2' : '/inceptron-logo.png?v=2'}
                  alt="SIET Inceptron Logo"
                  className="auth-07-mobile-logo"
                />
                <span className="auth-07-mobile-brand">SIET INCEPTRON</span>
              </div>

              <div className="auth-07-card-header">
                <h2 className="auth-07-card-title">Welcome back</h2>
                <p className="auth-07-card-subtitle">Sign in to pick up right where you left off.</p>
              </div>

              {error && (
                <div className="auth-07-error-alert" role="alert">
                  <AlertCircle size={18} className="auth-07-error-icon" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-07-form">
                <div className="auth-07-field">
                  <label htmlFor="login-email" className="auth-07-label">
                    Email / Register No
                  </label>
                  <div className="auth-07-input-wrapper">
                    <User size={18} className="auth-07-input-icon" />
                    <input
                      id="login-email"
                      type="text"
                      className="auth-07-input"
                      placeholder="e.g. hodcse@siet.ac.in or 714025104173"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="auth-07-field">
                  <div className="auth-07-label-row">
                    <label htmlFor="login-password" className="auth-07-label">
                      Password
                    </label>
                    <span className="auth-07-forgot-pass">Forgot password?</span>
                  </div>
                  <div className="auth-07-input-wrapper">
                    <Lock size={18} className="auth-07-input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-07-input auth-07-input-password"
                      placeholder="••••••••••••"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="auth-07-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Keep me signed in toggle */}
                <div className="auth-07-remember-row">
                  <label className="auth-07-toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="auth-07-toggle-slider"></span>
                  </label>
                  <span className="auth-07-remember-label">Keep me signed in for 30 days</span>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  className="auth-07-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="auth-07-spinner" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Test Credentials Helper */}
              <div className="auth-07-demo-section">
                <div className="auth-07-divider">
                  <span>TEST CREDENTIALS</span>
                </div>
                <div className="auth-07-demo-buttons">
                  <button
                    type="button"
                    className="auth-07-demo-btn"
                    onClick={() => setForm({ email: 'admin@siet.ac.in', password: 'password123' })}
                  >
                    <span className="auth-07-demo-badge">Admin</span>
                    <span className="auth-07-demo-val">admin@siet.ac.in</span>
                  </button>
                  <button
                    type="button"
                    className="auth-07-demo-btn"
                    onClick={() => setForm({ email: 'hodcse@siet.ac.in', password: 'password123' })}
                  >
                    <span className="auth-07-demo-badge">Faculty</span>
                    <span className="auth-07-demo-val">hodcse@siet.ac.in</span>
                  </button>
                  <button
                    type="button"
                    className="auth-07-demo-btn"
                    onClick={() => setForm({ email: '714025104144', password: '25CS144' })}
                  >
                    <span className="auth-07-demo-badge">Student</span>
                    <span className="auth-07-demo-val">714025104144</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-experience {
          position: relative;
          width: 100vw;
          min-height: 100vh;
          background: var(--bg-primary, #05070b);
          color: var(--color-text, #ffffff);
          overflow: hidden;
          transition: background-color 750ms cubic-bezier(0.22, 1, 0.36, 1), color 550ms ease;
        }

        .login-top-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .login-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        }

        .login-back-btn:hover {
          background: rgba(30, 41, 59, 0.9);
          transform: translateX(-2px);
          color: var(--color-green, #84cc16);
          border-color: rgba(132, 204, 22, 0.4);
        }

        [data-theme="light"] .login-back-btn {
          color: #0f172a;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        [data-theme="light"] .login-back-btn:hover {
          background: #ffffff;
          color: var(--theme-primary, #2A7D14);
          border-color: var(--theme-primary, #2A7D14);
        }

        .login-stage {
          position: relative;
          width: 100vw;
          height: 100vh;
        }

        /* Light Theme Overrides */
        [data-theme="light"] .login-experience {
          background: #ffffff !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .auth-07-container {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .auth-07-left-panel {
          background-color: #f8fafc !important;
          border-right-color: #e2e8f0 !important;
        }

        [data-theme="light"] .auth-07-form-wrapper {
          background: #f8fafc !important;
        }

        [data-theme="light"] .auth-07-card {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        }

        [data-theme="light"] .auth-07-card-title { color: #0f172a !important; }
        [data-theme="light"] .auth-07-card-subtitle { color: #64748b !important; }
        [data-theme="light"] .auth-07-label { color: #1e293b !important; }
        [data-theme="light"] .auth-07-mobile-brand { color: #0f172a !important; }

        [data-theme="light"] .auth-07-input {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .auth-07-input:-webkit-autofill,
        [data-theme="light"] .auth-07-input:-webkit-autofill:hover,
        [data-theme="light"] .auth-07-input:-webkit-autofill:focus,
        [data-theme="light"] .auth-07-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f8fafc inset !important;
          -webkit-text-fill-color: #0f172a !important;
        }

        [data-theme="light"] .auth-07-input::placeholder { color: #94a3b8 !important; }

        [data-theme="light"] .auth-07-input:focus {
          border-color: var(--theme-primary, #2A7D14) !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px var(--theme-focus, rgba(42, 125, 20, 0.15)) !important;
        }

        [data-theme="light"] .auth-07-toggle-slider { background-color: #cbd5e1 !important; }
        [data-theme="light"] .auth-07-remember-label { color: #475569 !important; }
        [data-theme="light"] .auth-07-forgot-pass { color: var(--theme-primary, #2A7D14) !important; }

        [data-theme="light"] .auth-07-divider::before,
        [data-theme="light"] .auth-07-divider::after { border-bottom-color: #e2e8f0 !important; }
        [data-theme="light"] .auth-07-divider span { color: #64748b !important; }

        [data-theme="light"] .auth-07-demo-btn {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
        }

        [data-theme="light"] .auth-07-demo-btn:hover {
          background: var(--bg-hover, #f8fafc) !important;
          border-color: var(--theme-primary, #2A7D14) !important;
        }

        [data-theme="light"] .auth-07-demo-badge { color: var(--color-text, #0f172a) !important; }

        [data-theme="light"] .auth-07-demo-val {
          background: var(--theme-soft, #f0fdf4) !important;
          color: var(--theme-primary, #2A7D14) !important;
          border: 1px solid var(--theme-border, #cbd5e1) !important;
        }

        [data-theme="light"] .auth-07-input-icon,
        [data-theme="light"] .auth-07-password-toggle { color: #64748b !important; }
        [data-theme="light"] .auth-07-password-toggle:hover { color: #0f172a !important; }

        [data-theme="light"] .auth-07-submit-btn {
          background: var(--btn-primary-bg) !important;
          color: var(--btn-primary-color, #070a0f) !important;
          font-weight: 800 !important;
          box-shadow: 0 4px 18px var(--green-200) !important;
        }

        /* Auth-07 Dual-Panel Architecture */
        .auth-07-container {
          position: relative;
          display: flex;
          height: 100vh;
          width: 100vw;
          max-width: 100%;
          background-color: #05070b;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
          overflow: hidden;
          transition: background-color 750ms cubic-bezier(0.22, 1, 0.36, 1), color 550ms ease;
        }

        /* LEFT PANEL: Full Screen Cover Artwork Panel */
        .auth-07-left-panel {
          position: relative;
          flex: 1.15;
          height: 100%;
          background-color: #070a0f;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 56px 40px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: background-color 750ms cubic-bezier(0.22, 1, 0.36, 1), border-color 650ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .auth-07-panel-artwork-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .login-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: none;
          opacity: 0;
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .login-hero-image.active {
          opacity: 1;
        }

        .login-left-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.02),
            rgba(0, 0, 0, 0.18)
          );
          pointer-events: none;
        }

        .auth-07-logo-wrapper {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 440px;
          width: 100%;
        }

        .auth-07-left-heading {
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
          transition: color 550ms ease;
        }

        [data-theme="light"] .auth-07-left-heading {
          color: #ffffff !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7) !important;
        }

        .auth-07-left-subheading {
          font-size: 14.5px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
          line-height: 1.5;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
          transition: color 550ms ease;
        }

        [data-theme="light"] .auth-07-left-subheading {
          color: rgba(255, 255, 255, 0.9) !important;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7) !important;
        }

        /* RIGHT PANEL: Authentication Form Wrapper */
        .auth-07-form-wrapper {
          position: relative;
          z-index: 10;
          flex: 0.85;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          height: 100%;
          background: #05070b;
          overflow-y: auto;
          transition: background-color 750ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Dark Premium Card Panel */
        .auth-07-card {
          width: 100%;
          max-width: 440px;
          background: #0b0f15;
          padding: 36px 32px;
          border-radius: 20px;
          border: 1px solid #1f2430;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.08);
          transition: background-color 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease;
        }

        .auth-07-mobile-header {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .auth-07-mobile-logo {
          height: 38px;
          width: auto;
          object-fit: contain;
        }

        .auth-07-mobile-brand {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 800;
          font-size: 18px;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .auth-07-card-header {
          margin-bottom: 28px;
          text-align: left;
        }

        .auth-07-card-title {
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
          line-height: 1.15;
          transition: color 0.45s ease;
        }

        .auth-07-card-subtitle {
          font-size: 14.5px;
          color: #9ca3af;
          font-weight: 400;
          transition: color 0.45s ease;
        }

        /* Error Alert */
        .auth-07-error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 13.5px;
          font-weight: 500;
          margin-bottom: 22px;
          animation: auth07FadeIn 0.25s ease;
        }

        .auth-07-error-icon {
          flex-shrink: 0;
          color: #ef4444;
        }

        @keyframes auth07FadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Form Structure */
        .auth-07-form {
          display: flex;
          flex-direction: column;
        }

        .auth-07-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }

        .auth-07-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .auth-07-label {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0;
          text-transform: none;
          transition: color 0.45s ease;
        }

        .auth-07-forgot-pass {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-green, #84cc16);
          cursor: pointer;
          transition: opacity 0.2s ease, color 0.45s ease;
        }

        .auth-07-forgot-pass:hover {
          opacity: 0.85;
          text-decoration: underline;
        }

        .auth-07-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-07-input-icon {
          position: absolute;
          left: 16px;
          color: #6b7280;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .auth-07-input {
          width: 100%;
          padding: 14px 18px 14px 46px;
          border: 1px solid #232833;
          border-radius: 12px;
          font-size: 15px;
          color: #ffffff;
          background: #11141c;
          transition: background-color 0.45s ease, border-color 0.45s ease, color 0.45s ease;
        }

        .auth-07-input:-webkit-autofill,
        .auth-07-input:-webkit-autofill:hover,
        .auth-07-input:-webkit-autofill:focus,
        .auth-07-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #11141c inset !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        .auth-07-input-password {
          padding-right: 46px;
        }

        .auth-07-input::placeholder {
          color: #6b7280;
          opacity: 1;
        }

        .auth-07-input:focus {
          outline: none;
          border-color: var(--color-green, #84cc16);
          background: #151924;
          box-shadow: 0 0 0 3px var(--green-200, rgba(132, 204, 22, 0.2));
        }

        .auth-07-input-wrapper:focus-within .auth-07-input-icon {
          color: var(--color-green, #84cc16);
        }

        .auth-07-password-toggle {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: #6b7280;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 6px;
          transition: color 0.2s ease;
        }

        .auth-07-password-toggle:hover {
          color: #ffffff;
        }

        /* Remember Me Switch */
        .auth-07-remember-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 2px;
          margin-bottom: 22px;
        }

        .auth-07-toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .auth-07-toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .auth-07-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #232833;
          transition: 0.3s;
          border-radius: 24px;
        }

        .auth-07-toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: #ffffff;
          transition: 0.3s;
          border-radius: 50%;
        }

        .auth-07-toggle-switch input:checked + .auth-07-toggle-slider {
          background-color: var(--color-green, #84cc16);
        }

        .auth-07-toggle-switch input:checked + .auth-07-toggle-slider:before {
          transform: translateX(20px);
          background-color: #0a0a0a;
        }

        .auth-07-remember-label {
          font-size: 14px;
          color: #9ca3af;
          font-weight: 500;
          transition: color 0.45s ease;
        }

        /* Submit Button */
        .auth-07-submit-btn {
          width: 100%;
          padding: 15px;
          margin-top: 4px;
          background: var(--btn-primary-bg, #84cc16);
          color: var(--btn-primary-color, #0a0a0a);
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 20px rgba(132, 204, 22, 0.35);
          transition: all 0.2s ease;
        }

        .auth-07-submit-btn:hover:not(:disabled) {
          background: #93d926;
          box-shadow: 0 6px 28px rgba(132, 204, 22, 0.5);
          transform: translateY(-1px);
        }

        .auth-07-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-07-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .auth-07-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(10, 10, 10, 0.3);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: auth07Spin 0.7s linear infinite;
        }

        @keyframes auth07Spin {
          to { transform: rotate(360deg); }
        }

        /* Demo / Test Credentials Section */
        .auth-07-demo-section {
          margin-top: 28px;
        }

        .auth-07-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin-bottom: 18px;
        }

        .auth-07-divider::before,
        .auth-07-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #232833;
          transition: border-color 0.45s ease;
        }

        .auth-07-divider span {
          padding: 0 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--color-text-muted, #94a3b8);
          text-transform: uppercase;
          transition: color 0.45s ease;
        }

        .auth-07-demo-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .auth-07-demo-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #11141c;
          border: 1px solid #232833;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.45s ease, border-color 0.45s ease, transform 0.2s ease;
        }

        .auth-07-demo-btn:hover {
          background: #161a26;
          border-color: var(--theme-primary, #84cc16);
          transform: translateY(-1px);
        }

        .auth-07-demo-badge {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text, #f1f5f9);
          transition: color 0.45s ease;
        }

        .auth-07-demo-val {
          font-size: 12px;
          font-family: monospace;
          color: var(--theme-primary, #84cc16);
          font-weight: 600;
          background: var(--theme-soft, rgba(132, 204, 22, 0.12));
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--theme-border, rgba(132, 204, 22, 0.25));
          transition: background-color 0.45s ease, border-color 0.45s ease, color 0.45s ease;
        }

        /* RESPONSIVE DESIGN FOR MOBILE & TABLET */
        @media (max-width: 868px) {
          .auth-07-container {
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }

          .auth-07-left-panel {
            display: none;
          }

          .auth-07-mobile-header {
            display: flex;
          }

          .auth-07-form-wrapper {
            width: 100%;
            height: auto;
            min-height: 100vh;
            justify-content: center;
            padding: 80px 16px 24px;
            background: #05070b;
          }

          .auth-07-card {
            padding: 28px 20px;
            background: #0b0f15;
            border-radius: 16px;
          }
        }

        @media (max-width: 480px) {
          .auth-07-card-title {
            font-size: 26px;
          }

          .auth-07-demo-btn {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .auth-07-demo-val {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
