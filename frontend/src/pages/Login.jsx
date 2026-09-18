import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle, ChevronDown } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cinematic Scroll-to-Enter Transition Animation State
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const animFrameIdRef = useRef(null);
  const isCompletedRef = useRef(false);

  const overlayRef = useRef(null);
  const artworkRef = useRef(null);
  const loginStageRef = useRef(null);
  const hintRef = useRef(null);

  const handleEnterPortal = () => {
    targetProgressRef.current = 1;
  };

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      isCompletedRef.current = true;
      if (overlayRef.current) overlayRef.current.style.display = 'none';
      if (loginStageRef.current) loginStageRef.current.style.opacity = '1';
      return;
    }

    // Animation Render Loop (60fps lerp)
    const animate = () => {
      if (isCompletedRef.current) return;

      const diff = targetProgressRef.current - currentProgressRef.current;
      // Medium speed lerp rate (0.045 for smooth, medium-paced cinematic zoom transition)
      currentProgressRef.current += diff * 0.045;

      const progress = currentProgressRef.current;

      // 1. Zoom Transform targeting inner cube center (slightly higher up at 50% X, 30% Y)
      const scale = 1 + Math.pow(progress, 1.3) * 6.5;
      const translateY = -progress * 8;

      if (artworkRef.current) {
        artworkRef.current.style.transform = `scale(${scale}) translateY(${translateY}%)`;
        artworkRef.current.style.transformOrigin = '50% 30%';
      }

      // 2. Opacity Fades
      let artworkOpacity = 1;
      if (progress > 0.70) {
        artworkOpacity = 1 - (progress - 0.70) / 0.30;
      }

      if (overlayRef.current) {
        overlayRef.current.style.opacity = Math.max(0, artworkOpacity);
      }

      let loginOpacity = 0;
      if (progress > 0.65) {
        loginOpacity = (progress - 0.65) / 0.35;
      }

      if (loginStageRef.current) {
        loginStageRef.current.style.opacity = Math.min(1, loginOpacity);
      }

      // Actions wrapper & blue button fade out smoothly as zoom starts
      if (hintRef.current) {
        hintRef.current.style.opacity = Math.max(0, 1 - progress * 4);
        if (progress > 0.2) {
          hintRef.current.style.pointerEvents = 'none';
        }
      }

      // Completion check
      if (progress >= 0.995 && targetProgressRef.current >= 0.99) {
        isCompletedRef.current = true;
        if (overlayRef.current) {
          overlayRef.current.style.display = 'none';
          overlayRef.current.style.pointerEvents = 'none';
        }
        if (loginStageRef.current) {
          loginStageRef.current.style.opacity = '1';
          loginStageRef.current.style.pointerEvents = 'auto';
        }
        return;
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Event Listeners
    const handleWheel = (e) => {
      if (isCompletedRef.current) return;
      e.preventDefault();

      const delta = e.deltaY * 0.0015;
      targetProgressRef.current = Math.min(1, Math.max(0, targetProgressRef.current + delta));
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => {
      if (isCompletedRef.current) return;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (isCompletedRef.current) return;
      const touchY = e.touches[0].clientY;
      const deltaY = (touchStartY - touchY) * 0.003;
      touchStartY = touchY;

      targetProgressRef.current = Math.min(1, Math.max(0, targetProgressRef.current + deltaY));
      if (targetProgressRef.current > 0 && targetProgressRef.current < 1) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      if (isCompletedRef.current) return;
      if (['ArrowDown', 'PageDown', 'Space', 'Enter'].includes(e.key)) {
        e.preventDefault();
        targetProgressRef.current = Math.min(1, targetProgressRef.current + 0.25);
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, targetProgressRef.current - 0.25);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      {/* STEP 1-4: FULL-SCREEN CINEMATIC INTRO VIEWPORT OVERLAY */}
      <div ref={overlayRef} className="intro-viewport">
        <img
          ref={artworkRef}
          src="/main.png"
          alt="SIET Inceptron Artwork"
          className="intro-artwork"
        />
        <div ref={hintRef} className="intro-actions-wrapper">
          <button
            type="button"
            className="intro-welcome-btn"
            onClick={handleEnterPortal}
            aria-label="Welcome to Portal"
          >
            <span>Welcome to Portal</span>
            <ArrowRight size={20} className="intro-btn-icon" />
          </button>
          <div className="intro-scroll-hint">
            <span>Or scroll to enter</span>
            <ChevronDown size={14} className="intro-hint-arrow" />
          </div>
        </div>
      </div>

      {/* STEP 5: LOGIN STAGE REVEALED UNDERNEATH */}
      <div ref={loginStageRef} className="login-stage">
        <div className="auth-07-container">
          {/* LEFT PANEL: Halftone Artwork Section */}
          <div className="auth-07-left-panel">
            {/* LAYER 1: Primary High-Resolution Static Artwork Image (Full Bleed Option A) */}
            <img
              src="/main.png"
              alt="SIET Inceptron Halftone Artwork"
              className="auth-07-art-image"
            />
          </div>

          {/* RIGHT PANEL: Authentication Form */}
          <div className="auth-07-form-wrapper">
            <div className="auth-07-card">
              {/* Mobile Header */}
              <div className="auth-07-mobile-header">
                <img src="/real inceptron.png" alt="SIET Inceptron Logo" className="auth-07-mobile-logo" />
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
                    Register No
                  </label>
                  <div className="auth-07-input-wrapper">
                    <User size={18} className="auth-07-input-icon" />
                    <input
                      id="login-email"
                      type="text"
                      className="auth-07-input"
                      placeholder="e.g. 714025104173"
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
                    onClick={() => setForm({ email: '714025104144', password: '25CS144' })}
                  >
                    <span className="auth-07-demo-badge">Mithuneesh</span>
                    <span className="auth-07-demo-val">714025104144</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Intro Cinematic Viewport Overlay & Actions */
        .login-experience {
          position: relative;
          width: 100vw;
          min-height: 100vh;
          background: #09090b;
          overflow: hidden;
        }

        .intro-viewport {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 100;
          background: #000000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .intro-artwork {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%; /* Shifted slightly up */
          will-change: transform, opacity;
          transform-origin: 50% 30%;
        }

        .intro-actions-wrapper {
          position: absolute;
          bottom: 44px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          z-index: 105;
          pointer-events: auto;
          transition: opacity 0.3s ease;
        }

        .intro-welcome-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 36px;
          background: #84cc16;
          color: #09090b;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 
            0 10px 30px -5px rgba(132, 204, 22, 0.6),
            0 0 22px rgba(132, 204, 22, 0.45);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .intro-welcome-btn:hover {
          background: #93d926;
          transform: translateY(-3px) scale(1.04);
          box-shadow: 
            0 16px 38px -4px rgba(132, 204, 22, 0.75),
            0 0 35px rgba(132, 204, 22, 0.6);
        }

        .intro-welcome-btn:active {
          transform: translateY(0) scale(0.97);
        }

        .intro-btn-icon {
          color: #09090b;
          transition: transform 0.2s ease;
        }

        .intro-welcome-btn:hover .intro-btn-icon {
          transform: translateX(4px);
        }

        .intro-scroll-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .intro-hint-arrow {
          animation: introBounce 1.8s infinite;
        }

        @keyframes introBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(5px); }
          60% { transform: translateY(2.5px); }
        }

        /* Auth-07 Dual-Panel Architecture */
        .auth-07-container {
          position: relative;
          display: flex;
          height: 100vh;
          width: 100vw;
          max-width: 100%;
          background-color: #09090b;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
          overflow: hidden;
        }

        /* LEFT PANEL: Artwork Container */
        .auth-07-left-panel {
          position: relative;
          flex: 1.15;
          height: 100vh;
          background-color: #000000;
          overflow: hidden;
          padding: 0;
          margin: 0;
          border-right: 1px solid #18181b;
        }

        /* LAYER 1: Primary Static Image */
        .auth-07-art-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
          opacity: 1;
          visibility: visible;
          z-index: 1;
          filter: contrast(1.05);
        }

        /* LAYER 3: RIGHT PANEL: Authentication Form Wrapper */
        .auth-07-form-wrapper {
          position: relative;
          z-index: 10;
          flex: 0.85;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          height: 100vh;
          background: #09090b;
          overflow-y: auto;
        }

        .auth-07-card {
          width: 100%;
          max-width: 420px;
          background: #09090b;
          padding: 20px 0px;
          border-radius: 0px;
          border: none;
          box-shadow: none;
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
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .auth-07-card-header {
          margin-bottom: 32px;
          text-align: left;
        }

        .auth-07-card-title {
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 34px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.03em;
          margin-bottom: 10px;
          line-height: 1.15;
        }

        .auth-07-card-subtitle {
          font-size: 15px;
          color: #94a3b8;
          font-weight: 400;
        }

        /* Error Alert */
        .auth-07-error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
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
          margin-bottom: 22px;
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
        }

        .auth-07-forgot-pass {
          font-size: 13.5px;
          font-weight: 600;
          color: #84cc16;
          cursor: pointer;
          transition: opacity 0.2s ease;
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
          color: #71717a;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .auth-07-input {
          width: 100%;
          padding: 14px 18px 14px 46px;
          border: 1px solid #27272a;
          border-radius: 12px;
          font-size: 15px;
          color: #ffffff;
          background: #141417;
          transition: all 0.2s ease;
        }

        .auth-07-input:-webkit-autofill,
        .auth-07-input:-webkit-autofill:hover,
        .auth-07-input:-webkit-autofill:focus,
        .auth-07-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #141417 inset !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        .auth-07-input-password {
          padding-right: 46px;
        }

        .auth-07-input::placeholder {
          color: #52525b;
          opacity: 1;
        }

        .auth-07-input:focus {
          outline: none;
          border-color: #84cc16;
          background: #18181c;
          box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.15);
        }

        .auth-07-input-wrapper:focus-within .auth-07-input-icon {
          color: #84cc16;
        }

        .auth-07-password-toggle {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: #71717a;
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
          margin-bottom: 24px;
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
          background-color: #27272a;
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
          background-color: #3f3f46;
        }

        .auth-07-toggle-switch input:checked + .auth-07-toggle-slider:before {
          transform: translateX(20px);
        }

        .auth-07-remember-label {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Submit Button */
        .auth-07-submit-btn {
          width: 100%;
          padding: 15px;
          margin-top: 4px;
          background: #84cc16;
          color: #09090b;
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 20px rgba(132, 204, 22, 0.25);
          transition: all 0.2s ease;
        }

        .auth-07-submit-btn:hover:not(:disabled) {
          background: #93d926;
          box-shadow: 0 6px 24px rgba(132, 204, 22, 0.4);
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
          border: 2px solid rgba(9, 9, 11, 0.3);
          border-top-color: #09090b;
          border-radius: 50%;
          animation: auth07Spin 0.7s linear infinite;
        }

        @keyframes auth07Spin {
          to { transform: rotate(360deg); }
        }

        /* Demo / Test Credentials Section */
        .auth-07-demo-section {
          margin-top: 32px;
        }

        .auth-07-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin-bottom: 20px;
        }

        .auth-07-divider::before,
        .auth-07-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #27272a;
        }

        .auth-07-divider span {
          padding: 0 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #71717a;
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
          padding: 12px 16px;
          background: #141417;
          border: 1px solid #27272a;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .auth-07-demo-btn:hover {
          background: #1a1a1e;
          border-color: #84cc16;
          transform: translateY(-1px);
        }

        .auth-07-demo-badge {
          font-size: 12px;
          font-weight: 700;
          color: #84cc16;
        }

        .auth-07-demo-val {
          font-size: 12px;
          font-family: monospace;
          color: #e4e4e7;
          font-weight: 600;
          background: #27272a;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #3f3f46;
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
            background: #09090b;
          }

          .auth-07-card {
            padding: 36px 20px;
            background: #09090b;
          }
        }

        @media (max-width: 480px) {
          .auth-07-card-title {
            font-size: 28px;
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
