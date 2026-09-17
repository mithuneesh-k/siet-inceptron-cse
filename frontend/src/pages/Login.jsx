import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import HalftoneInteractiveHero from '../components/HalftoneInteractiveHero';

export default function Login() {
  const { login } = useAuth();
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
    <div className="auth-07-container">
      {/* LEFT PANEL: Black-and-White Interactive Halftone Artwork */}
      <div className="auth-07-left-panel">
        <div className="auth-07-artwork-box">
          <HalftoneInteractiveHero src="/real inceptron clean.png" scale={0.88} />
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Form */}
      <div className="auth-07-form-wrapper">
        <div className="auth-07-card">
          {/* Mobile Header */}
          <div className="auth-07-mobile-header">
            <img src="/real inceptron clean.png" alt="SIET Inceptron Logo" className="auth-07-mobile-logo" />
            <span className="auth-07-mobile-brand">SIET INCEPTRON</span>
          </div>

          <div className="auth-07-card-header">
            <h2 className="auth-07-card-title">Welcome Back</h2>
            <p className="auth-07-card-subtitle">Sign in to your SIET Inceptron account</p>
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
                REGISTER NO
              </label>
              <div className="auth-07-input-wrapper">
                <User size={18} className="auth-07-input-icon" />
                <input
                  id="login-email"
                  type="text"
                  className="auth-07-input"
                  placeholder="714025104173"
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
                  PASSWORD
                </label>
              </div>
              <div className="auth-07-input-wrapper">
                <Lock size={18} className="auth-07-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-07-input auth-07-input-password"
                  placeholder="••••••••"
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
                onClick={() => setForm({ email: '714025104144', password: '25CS144' })}
              >
                <span className="auth-07-demo-badge">Mithuneesh</span>
                <span className="auth-07-demo-val">714025104144</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Auth-07 Split Layout Architecture */
        .auth-07-container {
          position: relative;
          display: flex;
          height: 100vh;
          width: 100vw;
          max-width: 100%;
          background-color: #f4f5f7;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #111111;
          overflow: hidden;
        }

        /* LEFT PANEL: Halftone Artwork Container */
        .auth-07-left-panel {
          position: relative;
          flex: 1.15;
          height: 100vh;
          background-color: #edeef0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          border-right: 1px solid #e2e4e8;
        }

        /* Responsive Enlarged Artwork Box occupying 75-90% of left panel */
        .auth-07-artwork-box {
          position: relative;
          width: min(88%, 760px);
          height: min(82vh, 640px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Hero Canvas Overlay bounded strictly inside artwork box */
        .auth-07-hero {
          position: relative;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        /* RIGHT PANEL: Authentication Form Wrapper */
        .auth-07-form-wrapper {
          position: relative;
          z-index: 2;
          flex: 0.85;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          height: 100vh;
          background: #ffffff;
          overflow-y: auto;
        }

        .auth-07-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          padding: 40px 36px;
          border-radius: 20px;
          border: 1px solid #eaeaea;
          box-shadow:
            0 20px 40px -15px rgba(0, 0, 0, 0.07),
            0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .auth-07-mobile-header {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 28px;
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
          color: #111111;
          letter-spacing: -0.01em;
        }

        .auth-07-card-header {
          margin-bottom: 28px;
          text-align: left;
        }

        .auth-07-card-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #111111;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .auth-07-card-subtitle {
          font-size: 14px;
          color: #666666;
        }

        /* Error Alert */
        .auth-07-error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 14px;
          color: #991b1b;
          font-size: 13.5px;
          font-weight: 500;
          margin-bottom: 22px;
          animation: auth07FadeIn 0.25s ease;
        }

        .auth-07-error-icon {
          flex-shrink: 0;
          color: #dc2626;
        }

        @keyframes auth07FadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Form Structure */
        .auth-07-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .auth-07-field {
          display: flex;
          flex-direction: column;
        }

        .auth-07-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .auth-07-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #222222;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .auth-07-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-07-input-icon {
          position: absolute;
          left: 16px;
          color: #777777;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .auth-07-input {
          width: 100%;
          padding: 13px 18px 13px 46px;
          border: 1.5px solid #e5e5e5;
          border-radius: 14px;
          font-size: 15px;
          color: #111111;
          background: #ffffff;
          transition: all 0.2s ease;
        }

        .auth-07-input:-webkit-autofill,
        .auth-07-input:-webkit-autofill:hover,
        .auth-07-input:-webkit-autofill:focus,
        .auth-07-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
          -webkit-text-fill-color: #111111 !important;
        }

        .auth-07-input-password {
          padding-right: 46px;
        }

        .auth-07-input::placeholder {
          color: #999999;
          opacity: 1;
        }

        .auth-07-input:focus {
          outline: none;
          border-color: #111111;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.06);
        }

        .auth-07-input-wrapper:focus-within .auth-07-input-icon {
          color: #111111;
        }

        .auth-07-password-toggle {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: #777777;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 6px;
          transition: color 0.2s ease;
        }

        .auth-07-password-toggle:hover {
          color: #111111;
        }

        /* Submit Button */
        .auth-07-submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 6px;
          background: #111111;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          transition: all 0.2s ease;
        }

        .auth-07-submit-btn:hover:not(:disabled) {
          background: #000000;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
          transform: translateY(-1px);
        }

        .auth-07-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .auth-07-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .auth-07-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
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
          border-bottom: 1px solid #e5e5e5;
        }

        .auth-07-divider span {
          padding: 0 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #888888;
          text-transform: uppercase;
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
          padding: 10px 14px;
          background: #f8f8f7;
          border: 1.5px solid #e5e5e5;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .auth-07-demo-btn:hover {
          background: #efefed;
          border-color: #111111;
          transform: translateY(-1px);
        }

        .auth-07-demo-badge {
          font-size: 12px;
          font-weight: 700;
          color: #111111;
        }

        .auth-07-demo-val {
          font-size: 12px;
          font-family: monospace;
          color: #444444;
          font-weight: 600;
          background: #ffffff;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid #dcdcdc;
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
            padding: 24px 16px;
            background: #f4f5f7;
          }

          .auth-07-card {
            padding: 36px 24px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.98);
          }
        }

        @media (max-width: 480px) {
          .auth-07-card {
            padding: 28px 20px;
          }

          .auth-07-card-title {
            font-size: 24px;
          }

          .auth-07-demo-btn {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .auth-07-demo-val {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
