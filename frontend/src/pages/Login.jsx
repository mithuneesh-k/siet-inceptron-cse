import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle, ChevronDown, Sun, Moon } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const experienceRef = useRef(null);
  const overlayRef = useRef(null);
  const artworkContainerRef = useRef(null);
  const loginStageRef = useRef(null);
  const hintRef = useRef(null);
  const canvasRef = useRef(null);

  // Canonical transition trigger function for button click / keyboard activation
  const triggerEnterPortal = () => {
    targetProgressRef.current = 1;
    isCompletedRef.current = false;
    if (overlayRef.current) {
      overlayRef.current.style.display = 'flex';
      overlayRef.current.style.pointerEvents = 'auto';
    }
  };

  // Interactive Dot Grid Canvas (Repels dots when cursor moves over using spring-back physics)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = experienceRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');

    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const gap = 32;
    const particles = [];
    for (let x = gap / 2; x < width; x += gap) {
      for (let y = gap / 2; y < height; y += gap) {
        particles.push({
          baseX: x,
          baseY: y,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          radius: 1.5,
        });
      }
    }

    const mouse = { x: -1000, y: -1000, radius: 130, active: false };

    const updatePointer = (e) => {
      if (isMobile) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;

      if (clientX !== undefined && clientY !== undefined) {
        mouse.x = clientX - rect.left;
        mouse.y = clientY - rect.top;
        mouse.active = true;
      }
    };

    const deactivatePointer = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles.length = 0;
      for (let x = gap / 2; x < width; x += gap) {
        for (let y = gap / 2; y < height; y += gap) {
          particles.push({
            baseX: x,
            baseY: y,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            radius: 1.5,
          });
        }
      }
    };

    container.addEventListener('mousemove', updatePointer);
    container.addEventListener('mouseleave', deactivatePointer);
    container.addEventListener('touchmove', updatePointer, { passive: true });
    container.addEventListener('touchend', deactivatePointer);
    window.addEventListener('resize', handleResize);

    let frameId;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const progress = currentProgressRef.current;
      const canvasOpacity = Math.max(0, 1 - progress * 4);
      if (canvasRef.current) {
        canvasRef.current.style.opacity = canvasOpacity;
      }

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.22)' : 'rgba(255, 255, 255, 0.22)';

      const spring = 0.06;
      const friction = 0.88;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius && distance > 0) {
            const force = (mouse.radius - distance) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            const targetX = p.baseX + Math.cos(angle) * force * 24;
            const targetY = p.baseY + Math.sin(angle) * force * 24;

            p.vx += (targetX - p.x) * 0.12;
            p.vy += (targetY - p.y) * 0.12;
          }
        }

        // Return spring physics
        p.vx += (p.baseX - p.x) * spring;
        p.vy += (p.baseY - p.y) * spring;
        p.vx *= friction;
        p.vy *= friction;

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('mousemove', updatePointer);
      container.removeEventListener('mouseleave', deactivatePointer);
      container.removeEventListener('touchmove', updatePointer);
      container.removeEventListener('touchend', deactivatePointer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
      currentProgressRef.current += diff * 0.045;

      const progress = currentProgressRef.current;

      // 1. Zoom Transform targeting inner cube center (50% X, 30% Y)
      const scale = 1 + Math.pow(progress, 1.3) * 6.5;
      const translateY = -progress * 8;

      if (artworkContainerRef.current) {
        artworkContainerRef.current.style.transform = `scale(${scale}) translateY(${translateY}%)`;
        artworkContainerRef.current.style.transformOrigin = '50% 30%';
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

      // Actions wrapper & hint fade out smoothly as zoom starts
      if (hintRef.current) {
        hintRef.current.style.opacity = Math.max(0, 1 - progress * 4);
        if (progress > 0.15) {
          hintRef.current.style.pointerEvents = 'none';
        } else {
          hintRef.current.style.pointerEvents = 'auto';
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

    // Event Listeners for Scroll and Keyboard Navigation
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
        // If focusing on input fields, don't trigger intro transition
        if (['INPUT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement !== hintRef.current?.querySelector('button')) {
          return;
        }
        e.preventDefault();
        targetProgressRef.current = Math.min(1, targetProgressRef.current + 0.25);
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        if (['INPUT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
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
    <div ref={experienceRef} className="login-experience">
      {/* Floating Theme Toggle Button */}
      <button
        type="button"
        className={`login-theme-toggle ${theme}`}
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        <span className="theme-toggle-icon-wrap">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </span>
      </button>

      {/* INTRO CINEMATIC VIEWPORT OVERLAY */}
      <div ref={overlayRef} className="intro-viewport">
        <div ref={artworkContainerRef} className="intro-artwork-container">
          <img
            src="/main.png"
            alt="SIET Inceptron Dark Intro Artwork"
            className={`intro-artwork intro-artwork-dark ${theme === 'dark' ? 'active' : ''}`}
          />
          <img
            src="/module.png"
            alt="SIET Inceptron Light Intro Artwork"
            className={`intro-artwork intro-artwork-light ${theme === 'light' ? 'active' : ''}`}
          />
        </div>

        <canvas ref={canvasRef} className="intro-particle-canvas" />

        <div ref={hintRef} className="intro-actions-wrapper">
          <button
            type="button"
            className="intro-welcome-btn"
            onClick={triggerEnterPortal}
          >
            <span>Welcome to Portal</span>
            <ArrowRight size={20} className="intro-btn-icon" />
          </button>
          <div className="intro-scroll-hint">
            <span>OR SCROLL TO ENTER</span>
            <ChevronDown size={14} className="intro-hint-arrow" />
          </div>
        </div>
      </div>

      {/* LOGIN STAGE: DUAL PANEL LAYOUT */}
      <div ref={loginStageRef} className="login-stage" style={{ opacity: 0, pointerEvents: 'none' }}>
        <div className="auth-07-container">
          {/* LEFT PANEL: Dual-Artwork Full Screen Cover Panel */}
          <div className="auth-07-left-panel">
            <div className="auth-07-panel-artwork-bg">
              <img
                src="/real inceptron widescreen.png"
                alt="SIET Inceptron Dark Artwork"
                className={`auth-07-bg-img auth-07-bg-dark ${theme === 'dark' ? 'active' : ''}`}
              />
              <img
                src="/2 nd photo.png"
                alt="SIET Inceptron Light Artwork"
                className={`auth-07-bg-img auth-07-bg-light ${theme === 'light' ? 'active' : ''}`}
              />
              <div className="auth-07-panel-gradient-overlay" />
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
                  src={theme === 'dark' ? '/real inceptron.png' : '/module.png'}
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
        /* ─── CSS Variables & Theme Transition Defaults ─── */
        :root, [data-theme="dark"] {
          --intro-hint-color: rgba(255, 255, 255, 0.85);
          --intro-hint-accent: #84cc16;
        }

        [data-theme="light"] {
          --intro-hint-color: #1e293b;
          --intro-hint-accent: #2A7D14;
        }

        .login-experience {
          position: relative;
          width: 100vw;
          min-height: 100vh;
          background: var(--bg-primary, #05070b);
          color: var(--color-text, #ffffff);
          overflow: hidden;
          transition: background-color 0.45s cubic-bezier(0.22, 1, 0.36, 1), color 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Micro-animated Floating Theme Toggle Button */
        .login-theme-toggle {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 200;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid var(--border-strong, rgba(255, 255, 255, 0.2));
          background: var(--bg-card, rgba(15, 23, 42, 0.85));
          color: var(--color-green, #84cc16);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          transition: transform 0.3s ease, border-color 0.4s ease, background-color 0.4s ease, color 0.4s ease;
        }

        .login-theme-toggle .theme-toggle-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .login-theme-toggle:hover {
          transform: scale(1.08);
          border-color: var(--color-green, #84cc16);
          box-shadow: 0 0 20px rgba(132, 204, 22, 0.4);
        }

        .login-theme-toggle:active .theme-toggle-icon-wrap {
          transform: rotate(180deg) scale(0.85);
        }

        /* Light Theme Overrides with Smooth Intermittent Transitions */
        [data-theme="light"] .login-experience {
          background: #ffffff !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .login-theme-toggle {
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #2A7D14 !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08) !important;
        }

        [data-theme="light"] .intro-viewport {
          background: #ffffff !important;
        }

        [data-theme="light"] .auth-07-container {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }

        [data-theme="light"] .auth-07-left-panel {
          background-color: #f8fafc !important;
          border-right-color: #e2e8f0 !important;
        }

        [data-theme="light"] .auth-07-form-wrapper {
          background: #ffffff !important;
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
          border-color: #2A7D14 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(42, 125, 20, 0.2) !important;
        }

        [data-theme="light"] .auth-07-toggle-slider { background-color: #cbd5e1 !important; }
        [data-theme="light"] .auth-07-remember-label { color: #475569 !important; }
        [data-theme="light"] .auth-07-forgot-pass { color: #2A7D14 !important; }

        [data-theme="light"] .auth-07-divider::before,
        [data-theme="light"] .auth-07-divider::after { border-bottom-color: #e2e8f0 !important; }
        [data-theme="light"] .auth-07-divider span { color: #64748b !important; }

        [data-theme="light"] .auth-07-demo-btn {
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }

        [data-theme="light"] .auth-07-demo-btn:hover {
          background: #f1f5f9 !important;
          border-color: #2A7D14 !important;
        }

        [data-theme="light"] .auth-07-demo-badge { color: #2A7D14 !important; }

        [data-theme="light"] .auth-07-demo-val {
          background: #e2e8f0 !important;
          color: #0f172a !important;
          border: 1px solid #cbd5e1 !important;
        }

        [data-theme="light"] .auth-07-input-icon,
        [data-theme="light"] .auth-07-password-toggle { color: #64748b !important; }

        [data-theme="light"] .auth-07-password-toggle:hover { color: #0f172a !important; }

        [data-theme="light"] .auth-07-submit-btn {
          background: #84cc16 !important;
          color: #070a0f !important;
          font-weight: 800 !important;
          box-shadow: 0 4px 18px rgba(132, 204, 22, 0.4) !important;
        }

        [data-theme="light"] .auth-07-submit-btn:hover:not(:disabled) {
          background: #93d926 !important;
          box-shadow: 0 6px 24px rgba(132, 204, 22, 0.6) !important;
        }

        /* Intro Viewport */
        .intro-viewport {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 100;
          background: #05070b;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.45s ease;
        }

        .intro-artwork-container {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          will-change: transform, opacity;
          transform-origin: 50% 30%;
        }

        /* Dual-Artwork Crossfade Layering */
        .intro-artwork {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
          display: block;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .intro-artwork.active {
          opacity: 1;
          pointer-events: auto;
        }

        .intro-particle-canvas {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100%;
          pointer-events: none;
          z-index: 102;
          transition: opacity 0.3s ease;
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
          color: #0a0a0a;
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
          color: #0a0a0a;
          transition: transform 0.2s ease;
        }

        .intro-welcome-btn:hover .intro-btn-icon {
          transform: translateX(4px);
        }

        /* Scroll Hint Theme-Aware Contrast & Floating Motion */
        .intro-scroll-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--intro-hint-color);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .intro-hint-arrow {
          color: var(--intro-hint-accent);
          animation: introFloat 1.8s ease-in-out infinite;
        }

        @keyframes introFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
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
          transition: background-color 0.45s ease, color 0.45s ease;
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
          transition: background-color 0.45s ease, border-color 0.45s ease;
        }

        .auth-07-panel-artwork-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .auth-07-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s ease;
          pointer-events: none;
        }

        .auth-07-bg-img.active {
          opacity: 1;
          pointer-events: auto;
        }

        .auth-07-panel-gradient-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(to top, rgba(5, 7, 11, 0.92) 0%, rgba(5, 7, 11, 0.35) 45%, rgba(5, 7, 11, 0.05) 100%);
          transition: background 0.45s ease;
        }

        [data-theme="light"] .auth-07-panel-gradient-overlay {
          background: linear-gradient(to top, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.35) 45%, rgba(255, 255, 255, 0.05) 100%) !important;
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
          transition: color 0.45s ease;
        }

        [data-theme="light"] .auth-07-left-heading {
          color: #0f172a !important;
          text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8) !important;
        }

        .auth-07-left-subheading {
          font-size: 14.5px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
          line-height: 1.5;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
          transition: color 0.45s ease;
        }

        [data-theme="light"] .auth-07-left-subheading {
          color: #334155 !important;
          text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8) !important;
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
          transition: background-color 0.45s ease;
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
          color: #84cc16;
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
          border-color: #84cc16;
          background: #151924;
          box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.2);
        }

        .auth-07-input-wrapper:focus-within .auth-07-input-icon {
          color: #84cc16;
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
          background-color: #84cc16;
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
          background: #84cc16;
          color: #0a0a0a;
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
          color: #6b7280;
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
          border-color: #84cc16;
          transform: translateY(-1px);
        }

        .auth-07-demo-badge {
          font-size: 12px;
          font-weight: 700;
          color: #84cc16;
          transition: color 0.45s ease;
        }

        .auth-07-demo-val {
          font-size: 12px;
          font-family: monospace;
          color: #f3f4f6;
          font-weight: 600;
          background: #1a1e2b;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #2d3345;
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
            padding: 24px 16px;
            background: #05070b;
          }

          .auth-07-card {
            padding: 28px 20px;
            background: #0b0f15;
            border-radius: 16px;
          }

          .auth-07-logo-stack {
            max-width: 220px;
            height: 220px;
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

