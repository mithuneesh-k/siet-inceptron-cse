import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SwitchMode from '../components/ui/switch-mode';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle, ChevronDown, Sun, Moon, Trophy, Zap, Award, Sparkles } from 'lucide-react';

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

  // Parallax & Cursor Glow Refs
  const parallaxFarRef = useRef(null);
  const parallaxMidRef = useRef(null);
  const parallaxCubeRef = useRef(null);
  const parallaxCtaRef = useRef(null);

  // Desktop Mouse Parallax & Cursor Glow Effect
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isMobile || prefersReducedMotion) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    let rafId = null;
    let target = { normX: 0, normY: 0 };
    let current = { x: 0, y: 0 };

    const handlePointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      const rect = overlay.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      // Update Cursor Glow CSS variables without React state
      overlay.style.setProperty('--mouse-x', `${relX.toFixed(1)}px`);
      overlay.style.setProperty('--mouse-y', `${relY.toFixed(1)}px`);

      const normX = Math.min(1, Math.max(-1, (relX - rect.width / 2) / (rect.width / 2)));
      const normY = Math.min(1, Math.max(-1, (relY - rect.height / 2) / (rect.height / 2)));

      target = { normX, normY };
    };

    const handlePointerLeave = () => {
      target = { normX: 0, normY: 0 };
    };

    overlay.addEventListener('pointermove', handlePointerMove);
    overlay.addEventListener('pointerleave', handlePointerLeave);

    const updateParallax = () => {
      current.x += (target.normX - current.x) * 0.08;
      current.y += (target.normY - current.y) * 0.08;

      const { x, y } = current;

      if (parallaxFarRef.current) {
        parallaxFarRef.current.style.transform = `translate3d(${(x * 2).toFixed(2)}px, ${(y * 2).toFixed(2)}px, 0)`;
      }
      if (parallaxMidRef.current) {
        parallaxMidRef.current.style.transform = `translate3d(${(x * 4).toFixed(2)}px, ${(y * 4).toFixed(2)}px, 0)`;
      }
      if (parallaxCubeRef.current) {
        parallaxCubeRef.current.style.transform = `perspective(1000px) rotateX(${(-y * 2.5).toFixed(2)}deg) rotateY(${(x * 2.5).toFixed(2)}deg) translate3d(${(x * 7).toFixed(2)}px, ${(y * 7).toFixed(2)}px, 0)`;
      }
      if (parallaxCtaRef.current) {
        parallaxCtaRef.current.style.transform = `translate3d(${(x * 2).toFixed(2)}px, ${(y * 2).toFixed(2)}px, 0)`;
      }

      rafId = requestAnimationFrame(updateParallax);
    };

    rafId = requestAnimationFrame(updateParallax);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      overlay.removeEventListener('pointermove', handlePointerMove);
      overlay.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  const isEnteringPortalRef = useRef(false);
  const [isEnteringPortal, setIsEnteringPortal] = useState(false);
  const navigationTimerRef = useRef(null);
  const didRevealRef = useRef(false);

  // Single deterministic portal revelation function
  const revealPortalNow = useCallback(() => {
    if (didRevealRef.current) return;
    didRevealRef.current = true;
    isCompletedRef.current = true;

    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
      overlayRef.current.style.pointerEvents = 'none';
      overlayRef.current.style.display = 'none';
    }
    if (loginStageRef.current) {
      loginStageRef.current.style.opacity = '1';
      loginStageRef.current.style.transform = 'translateY(0)';
      loginStageRef.current.style.pointerEvents = 'auto';
    }
    setIsEnteringPortal(false);
  }, []);

  // Simple, freeze-proof portal entry trigger (Part 1: Guaranteed 480ms transition)
  const triggerEnterPortal = useCallback(() => {
    if (isEnteringPortalRef.current || didRevealRef.current) return;
    isEnteringPortalRef.current = true;
    setIsEnteringPortal(true);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReducedMotion ? 200 : 480;

    if (overlayRef.current) {
      overlayRef.current.classList.add('is-entering-portal');
    }

    targetProgressRef.current = 1;

    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = setTimeout(() => {
      revealPortalNow();
    }, duration);
  }, [revealPortalNow]);

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
    let dotColorFactor = document.documentElement.getAttribute('data-theme') === 'light' ? 1 : 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const progress = currentProgressRef.current;
      const canvasOpacity = Math.max(0, 1 - progress * 4);
      if (canvasRef.current) {
        canvasRef.current.style.opacity = canvasOpacity;
      }

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const targetFactor = isLight ? 1 : 0;
      dotColorFactor += (targetFactor - dotColorFactor) * 0.07; // ~600ms lerp

      const r = Math.round(255 + (15 - 255) * dotColorFactor);
      const g = Math.round(255 + (23 - 255) * dotColorFactor);
      const b = Math.round(255 + (42 - 255) * dotColorFactor);
      const alpha = 0.18 + (0.02) * dotColorFactor;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;

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

    // Animation Render Loop (60fps lerp continuous smooth scroll transition)
    const animate = () => {
      if (isCompletedRef.current) return;

      const diff = targetProgressRef.current - currentProgressRef.current;
      currentProgressRef.current += diff * 0.055;

      const progress = currentProgressRef.current;

      // 1. Transform targeting inner cube center with subtle zoom & rise
      const scale = 1 + Math.pow(progress, 1.2) * 2.8;
      const translateY = -progress * 12;

      if (artworkContainerRef.current) {
        artworkContainerRef.current.style.transform = `scale(${scale}) translateY(${translateY}%)`;
        artworkContainerRef.current.style.transformOrigin = '50% 42%';
      }

      // 2. Smooth opacity fade for intro viewport overlay
      if (overlayRef.current && !isEnteringPortalRef.current) {
        const overlayOpacity = Math.max(0, 1 - Math.pow(progress, 1.4));
        overlayRef.current.style.opacity = overlayOpacity;
      }

      // 3. Continuous smooth reveal of loginStage: opacity 0 -> 1 & rises 30px -> 0px
      if (loginStageRef.current) {
        const loginOpacity = Math.min(1, Math.pow(progress, 0.9));
        const riseY = (1 - Math.min(1, progress)) * 30;
        loginStageRef.current.style.opacity = loginOpacity;
        loginStageRef.current.style.transform = `translateY(${riseY.toFixed(2)}px)`;
        if (progress > 0.15) {
          loginStageRef.current.style.pointerEvents = 'auto';
        }
      }

      // 4. Actions wrapper & scroll hint opacity stable while hero is active
      if (hintRef.current && !isEnteringPortalRef.current) {
        if (progress > 0.25) {
          hintRef.current.style.opacity = Math.max(0, 1 - (progress - 0.25) * 2.5);
          hintRef.current.style.pointerEvents = 'none';
        } else {
          hintRef.current.style.opacity = '1';
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
          loginStageRef.current.style.transform = 'translateY(0)';
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
      {/* Floating Theme Toggle Switch */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
        <SwitchMode width={72} height={36} />
      </div>

      {/* INTRO CINEMATIC VIEWPORT OVERLAY */}
      <div ref={overlayRef} className={`intro-viewport ${isEnteringPortal ? 'is-entering-portal' : ''}`}>
        <div ref={artworkContainerRef} className="intro-artwork-container">
          {/* Pointer Tilt & Floating Cube Visual Group */}
          <div ref={parallaxCubeRef} className="intro-cube-tilt-wrapper">
            <div className="intro-cube-float-wrapper">
              <video
                key="dark-bg-video"
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                className={`intro-artwork intro-artwork-dark ${theme === 'dark' ? 'active' : ''}`}
              >
                <source src="/videos/darkmain.mp4" type="video/mp4" />
                <source src="/videos/DARK MAIN.mp4" type="video/mp4" />
              </video>
              <video
                key="light-bg-video"
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                className={`intro-artwork intro-artwork-light ${theme === 'light' ? 'active' : ''}`}
              >
                <source src="/videos/light (2).mp4" type="video/mp4" />
                <source src="/videos/lightmain.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        {/* Bottom-Right Action Group: Pill directly above CTA Button covering video diamond */}
        <div ref={parallaxCtaRef} className="intro-bottom-right-group">
          <div className="intro-glass-pill">
            <span className="intro-pill-dot" />
            <span>CSE Achievement Portal • SIET</span>
          </div>

          <button
            type="button"
            className="intro-welcome-btn"
            onClick={triggerEnterPortal}
            onTouchStart={triggerEnterPortal}
            disabled={isEnteringPortal}
          >
            <span>WELCOME TO PORTAL</span>
            <ArrowRight size={20} className="intro-btn-icon" />
          </button>
        </div>

        {/* Bottom-Center Scroll Cue */}
        <div
          ref={hintRef}
          className="intro-scroll-hint"
          onClick={triggerEnterPortal}
          onTouchStart={triggerEnterPortal}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerEnterPortal()}
        >
          <span>OR SCROLL TO ENTER</span>
          <ChevronDown size={14} className="intro-hint-arrow" />
        </div>
      </div>

      {/* LOGIN STAGE: DUAL PANEL LAYOUT */}
      <div ref={loginStageRef} className="login-stage" style={{ opacity: 0, pointerEvents: 'none' }}>
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
          transition: background-color 750ms cubic-bezier(0.22, 1, 0.36, 1), color 550ms ease;
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
          transition: transform 0.25s ease, border-color 650ms cubic-bezier(0.22, 1, 0.36, 1), background-color 650ms cubic-bezier(0.22, 1, 0.36, 1), color 550ms ease, box-shadow 650ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .login-theme-toggle .theme-toggle-icon-wrap {
          position: relative;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-theme-toggle .theme-icon {
          position: absolute;
          inset: 0;
          transition: opacity 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .login-theme-toggle.dark .sun-icon {
          opacity: 1;
          transform: rotate(0deg) scale(1);
          color: #fbbf24;
        }

        .login-theme-toggle.dark .moon-icon {
          opacity: 0;
          transform: rotate(-90deg) scale(0.7);
          pointer-events: none;
        }

        .login-theme-toggle.light .sun-icon {
          opacity: 0;
          transform: rotate(90deg) scale(0.7);
          pointer-events: none;
        }

        .login-theme-toggle.light .moon-icon {
          opacity: 1;
          transform: rotate(0deg) scale(1);
          color: #0f172a;
        }

        .login-theme-toggle:hover {
          transform: scale(1.08);
          box-shadow: 0 0 20px rgba(132, 204, 22, 0.4);
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
          background: #0a0e17 !important;
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
          transition: background-color 750ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Task 5: Cursor Glow Overlay */
        .intro-cursor-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 102;
          transform: translate(-50%, -50%);
          left: var(--mouse-x, -500px);
          top: var(--mouse-y, -500px);
          background: radial-gradient(
            circle at center,
            rgba(132, 204, 22, 0.08) 0%,
            rgba(56, 189, 248, 0.04) 45%,
            transparent 70%
          );
          filter: blur(40px);
          transition: opacity 0.3s ease;
        }

        [data-theme="light"] .intro-cursor-glow {
          background: radial-gradient(
            circle at center,
            rgba(42, 125, 20, 0.06) 0%,
            rgba(56, 189, 248, 0.03) 45%,
            transparent 70%
          );
        }

        /* Task 1: Radial Light Bloom during Portal Entry */
        .intro-portal-bloom {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.6);
          width: min(650px, 90vw);
          height: min(650px, 90vw);
          border-radius: 50%;
          pointer-events: none;
          z-index: 104;
          opacity: 0;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(132, 204, 22, 0.65) 35%,
            rgba(255, 255, 255, 0.8) 65%,
            transparent 100%
          );
          filter: blur(25px);
          transition: opacity 300ms ease, transform 300ms ease;
        }

        [data-theme="dark"] .intro-portal-bloom {
          background: radial-gradient(
            circle at center,
            rgba(132, 204, 22, 0.75) 0%,
            rgba(6, 182, 212, 0.55) 40%,
            rgba(15, 23, 42, 0.9) 70%,
            transparent 100%
          );
        }

        .intro-viewport.is-entering-portal .intro-portal-bloom {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.4);
          transition: opacity 500ms ease 100ms, transform 550ms cubic-bezier(0.16, 1, 0.3, 1) 100ms;
        }

        .intro-viewport.is-entering-portal .intro-bottom-right-group {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 250ms ease, transform 250ms ease;
        }

        .intro-viewport.is-entering-portal .intro-scroll-hint {
          opacity: 0;
          transform: translate(-50%, 12px);
          transition: opacity 200ms ease 100ms, transform 200ms ease 100ms;
        }

        .intro-viewport.is-entering-portal .intro-cube-float-wrapper {
          transform: translateY(-10px) scale(1.08);
          transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1) 100ms;
        }

        .intro-viewport.is-entering-portal .intro-halo-bloom {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.35);
          filter: blur(40px);
          transition: opacity 450ms ease 100ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 100ms;
        }

        /* Task A: Cinematic Depth Vignette Overlay */
        .intro-vignette-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 101;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.02) 0%,
            rgba(0, 0, 0, 0.05) 55%,
            rgba(0, 20, 40, 0.18) 100%
          );
        }

        /* Task A & K: Staged Entrance & Artwork Container */
        .intro-artwork-container {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          transform-origin: 50% 30%;
          animation: heroBgEntrance 400ms ease-out forwards;
        }

        @keyframes heroBgEntrance {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* Task A: 3 Sky Depth Layers (Far, Mid, Front) */
        .intro-sky-far {
          position: absolute;
          inset: -5%;
          background: radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
          animation: skyDriftFar 36s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 0;
        }

        .intro-sky-mid {
          position: absolute;
          inset: -5%;
          background: radial-gradient(circle at 45% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
          animation: skyDriftMid 24s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 1;
        }

        .intro-sky-front {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 65%, rgba(255, 255, 255, 0.12) 100%);
          animation: skyDriftFront 16s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 4;
        }

        @keyframes skyDriftFar {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-10px) scale(1.02); }
        }

        @keyframes skyDriftMid {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-8px, -6px); }
        }

        @keyframes skyDriftFront {
          0% { transform: translateY(0); opacity: 0.7; }
          100% { transform: translateY(-5px); opacity: 0.95; }
        }

        /* Task E: Faint Light Rays */
        .intro-light-rays {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(700px, 90vw);
          height: min(700px, 90vw);
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            rgba(255, 255, 255, 0.04) 20deg,
            transparent 40deg,
            rgba(255, 255, 255, 0.06) 80deg,
            transparent 120deg,
            rgba(255, 255, 255, 0.05) 180deg,
            transparent 220deg,
            rgba(255, 255, 255, 0.04) 280deg,
            transparent 320deg
          );
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          mask-image: radial-gradient(circle at center, black 20%, transparent 70%);
          -webkit-mask-image: radial-gradient(circle at center, black 20%, transparent 70%);
          animation: raysBreathing 14s ease-in-out infinite alternate;
        }

        @keyframes raysBreathing {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.98); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) rotate(6deg) scale(1.03); opacity: 0.9; }
        }

        /* Task D: Soft Halo / Bloom Layer Behind Cube */
        .intro-halo-bloom {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(520px, 80vw);
          height: min(520px, 80vw);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.25) 0%,
            rgba(132, 204, 22, 0.16) 35%,
            rgba(56, 189, 248, 0.08) 60%,
            transparent 75%
          );
          filter: blur(30px);
          will-change: transform, opacity;
          animation: haloPulse 5s ease-in-out infinite alternate;
        }

        [data-theme="dark"] .intro-halo-bloom {
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(132, 204, 22, 0.22) 35%,
            rgba(56, 189, 248, 0.12) 60%,
            transparent 75%
          );
        }

        @keyframes haloPulse {
          0% { opacity: 0.55; transform: translate(-50%, -50%) scale(0.97); }
          100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.02); }
        }

        /* Task 2: Energy Rings behind cube */
        .intro-energy-ring-1,
        .intro-energy-ring-2 {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          will-change: transform, opacity;
        }

        .intro-energy-ring-1 {
          width: min(440px, 75vw);
          height: min(440px, 75vw);
          border: 1px solid rgba(132, 204, 22, 0.25);
          box-shadow: 0 0 30px rgba(132, 204, 22, 0.12), inset 0 0 20px rgba(132, 204, 22, 0.08);
          animation: energyRingPulse1 6s ease-in-out infinite alternate;
        }

        .intro-energy-ring-2 {
          width: min(560px, 85vw);
          height: min(560px, 85vw);
          border: 1px dashed rgba(56, 189, 248, 0.2);
          animation: energyRingPulse2 8s ease-in-out infinite alternate-reverse;
        }

        [data-theme="light"] .intro-energy-ring-1 {
          border-color: rgba(42, 125, 20, 0.3);
          box-shadow: 0 0 25px rgba(42, 125, 20, 0.1), inset 0 0 15px rgba(42, 125, 20, 0.05);
        }

        [data-theme="light"] .intro-energy-ring-2 {
          border-color: rgba(56, 189, 248, 0.25);
        }

        @keyframes energyRingPulse1 {
          0% { transform: translate(-50%, -50%) scale(0.96) rotate(0deg); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.04) rotate(180deg); opacity: 0.85; }
        }

        @keyframes energyRingPulse2 {
          0% { transform: translate(-50%, -50%) scale(0.98) rotate(0deg); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.03) rotate(-180deg); opacity: 0.7; }
        }

        /* Task 3: 3 Floating Feature Chips */
        .intro-feature-chips-wrapper {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(600px, 92vw);
          height: min(400px, 60vh);
          pointer-events: none;
          z-index: 3;
        }

        .intro-feature-chip {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          will-change: transform;
        }

        [data-theme="light"] .intro-feature-chip {
          background: rgba(255, 255, 255, 0.75);
          border-color: rgba(0, 0, 0, 0.1);
          color: #1e293b;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        .chip-icon {
          color: #84cc16;
          filter: drop-shadow(0 0 6px rgba(132, 204, 22, 0.6));
          flex-shrink: 0;
          transition: transform 0.3s ease, color 0.3s ease;
        }

        [data-theme="light"] .chip-icon {
          color: #2A7D14;
          filter: drop-shadow(0 0 5px rgba(42, 125, 20, 0.4));
        }

        .intro-feature-chip:hover .chip-icon {
          transform: scale(1.15) rotate(5deg);
        }

        .chip-1 {
          top: 15%;
          left: 5%;
          animation: chipFloat1 7s ease-in-out infinite alternate;
        }

        .chip-2 {
          top: 70%;
          right: 5%;
          animation: chipFloat2 8.5s ease-in-out infinite alternate;
        }

        .chip-3 {
          top: 80%;
          left: 10%;
          animation: chipFloat3 9s ease-in-out infinite alternate;
        }

        @keyframes chipFloat1 {
          0% { transform: translateY(0px) rotate(-1deg); }
          100% { transform: translateY(-10px) rotate(1deg); }
        }

        @keyframes chipFloat2 {
          0% { transform: translateY(0px) rotate(1deg); }
          100% { transform: translateY(-12px) rotate(-1deg); }
        }

        @keyframes chipFloat3 {
          0% { transform: translateY(0px) rotate(-0.5deg); }
          100% { transform: translateY(-8px) rotate(1.5deg); }
        }

        /* Task B & C: Pointer Tilt & Floating Cube Visual Group */
        .intro-cube-tilt-wrapper {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 3;
          pointer-events: none;
          transform-style: preserve-3d;
          animation: heroCubeEntrance 500ms cubic-bezier(0.16, 1, 0.3, 1) 150ms backwards;
        }

        @keyframes heroCubeEntrance {
          0% { opacity: 0; transform: translateY(10px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .intro-cube-float-wrapper {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          will-change: transform;
          animation: cubeFloatIdle 6.5s ease-in-out infinite alternate;
        }

        @keyframes cubeFloatIdle {
          0% {
            transform: translateY(0) rotateX(0deg) rotateY(0deg) scale(1);
          }
          50% {
            transform: translateY(-5px) rotateX(1deg) rotateY(-1deg) scale(1.005);
          }
          100% {
            transform: translateY(-8px) rotateX(-1.5deg) rotateY(1.5deg) scale(1.01);
          }
        }

        /* Dual-Artwork Crossfade Layering */
        .intro-artwork {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
          opacity: 0;
          transform: scale(1);
          transition: opacity 800ms cubic-bezier(0.22, 1, 0.36, 1), transform 800ms cubic-bezier(0.22, 1, 0.36, 1), filter 700ms ease;
          pointer-events: none;
        }

        .intro-artwork.active {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
          filter: blur(0);
        }

        [data-theme="dark"] .intro-artwork-dark,
        [data-theme="light"] .intro-artwork-light {
          object-fit: cover;
          object-position: center center;
        }

        [data-theme="dark"] .intro-artwork-dark.active,
        [data-theme="light"] .intro-artwork-light.active {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
          filter: blur(0);
        }

        /* Task G: Soft Wordmark Light Sweep */
        .intro-wordmark-sweep {
          position: absolute;
          top: 48%;
          left: -20%;
          width: 40%;
          height: 10%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.18) 50%,
            transparent 100%
          );
          transform: skewX(-25deg);
          pointer-events: none;
          z-index: 4;
          animation: wordmarkSweep 7.5s ease-in-out infinite 300ms;
        }

        @keyframes wordmarkSweep {
          0%, 75% { left: -30%; opacity: 0; }
          85% { opacity: 0.8; }
          100% { left: 130%; opacity: 0; }
        }

        /* Task F: 12 Ambient CSS Particles */
        .intro-particles-wrapper {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 102;
          overflow: hidden;
        }

        .intro-particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          will-change: transform, opacity;
          animation: particleDrift linear infinite alternate;
        }

        @keyframes particleDrift {
          0% { transform: translateY(0) translateX(0); opacity: 0.2; }
          100% { transform: translateY(-18px) translateX(6px); opacity: 0.45; }
        }

        .intro-particle-1  { top: 26%; left: 44%; width: 3px; height: 3px; background: rgba(255, 255, 255, 0.35); animation-duration: 9s; }
        .intro-particle-2  { top: 22%; left: 54%; width: 4px; height: 4px; background: rgba(132, 204, 22, 0.35); animation-duration: 11s; animation-delay: -2s; }
        .intro-particle-3  { top: 36%; left: 40%; width: 2px; height: 2px; background: rgba(56, 189, 248, 0.3); animation-duration: 7s; animation-delay: -4s; }
        .intro-particle-4  { top: 32%; left: 60%; width: 3px; height: 3px; background: rgba(255, 255, 255, 0.25); animation-duration: 10s; animation-delay: -1s; }
        .intro-particle-5  { top: 18%; left: 48%; width: 4px; height: 4px; background: rgba(244, 63, 94, 0.25); animation-duration: 13s; animation-delay: -3s; }
        .intro-particle-6  { top: 42%; left: 52%; width: 2px; height: 2px; background: rgba(255, 255, 255, 0.3); animation-duration: 8s; animation-delay: -5s; }
        .intro-particle-7  { top: 35%; left: 45%; width: 3px; height: 3px; background: rgba(56, 189, 248, 0.32); animation-duration: 12s; animation-delay: -6s; }
        .intro-particle-8  { top: 28%; left: 58%; width: 4px; height: 4px; background: rgba(132, 204, 22, 0.3); animation-duration: 9.5s; animation-delay: -2.5s; }
        .intro-particle-9  { top: 40%; left: 48%; width: 3px; height: 3px; background: rgba(255, 255, 255, 0.28); animation-duration: 10.5s; animation-delay: -3.5s; }
        .intro-particle-10 { top: 20%; left: 41%; width: 2px; height: 2px; background: rgba(244, 63, 94, 0.22); animation-duration: 8.5s; animation-delay: -1.5s; }
        .intro-particle-11 { top: 38%; left: 63%; width: 3px; height: 3px; background: rgba(132, 204, 22, 0.28); animation-duration: 11.5s; animation-delay: -4.5s; }
        .intro-particle-12 { top: 24%; left: 37%; width: 3px; height: 3px; background: rgba(56, 189, 248, 0.28); animation-duration: 9.8s; animation-delay: -0.5s; }

        .intro-particle-canvas {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100%;
          pointer-events: none;
          z-index: 103;
          transition: opacity 0.3s ease;
        }

        /* Bottom-Right Action Group covering video diamond */
        .intro-bottom-right-group {
          position: absolute;
          right: clamp(28px, 4vw, 70px);
          bottom: clamp(28px, 5vh, 60px);
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          z-index: 20;
          pointer-events: auto;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        /* Small Glass Pill directly above CTA button */
        .intro-glass-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.02em;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          user-select: none;
          animation: heroPillEntrance 400ms cubic-bezier(0.16, 1, 0.3, 1) 450ms backwards;
        }

        @keyframes heroPillEntrance {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        [data-theme="dark"] .intro-glass-pill,
        [data-theme="light"] .intro-glass-pill {
          background: rgba(15, 23, 42, 0.78);
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .intro-pill-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6fd000;
          box-shadow: 0 0 8px rgba(111, 208, 0, 0.6);
          flex-shrink: 0;
        }

        /* Premium CTA Button covering video diamond in bottom-right */
        .intro-welcome-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: clamp(300px, 22vw, 340px);
          height: clamp(56px, 6vh, 62px);
          padding: 0 28px;
          background: linear-gradient(135deg, #8be000 0%, #6fd000 100%);
          color: #0a0a0a;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 15px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 10px 35px rgba(120, 220, 0, 0.35);
          transition: transform 220ms ease, background 220ms ease, box-shadow 220ms ease;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          animation: heroCTAEntrance 450ms cubic-bezier(0.16, 1, 0.3, 1) 550ms backwards;
        }

        @keyframes heroCTAEntrance {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .intro-welcome-btn:hover {
          background: linear-gradient(135deg, #95eb00 0%, #78db00 100%);
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(120, 220, 0, 0.45);
        }

        .intro-welcome-btn:active {
          transform: translateY(0);
        }

        .intro-btn-icon {
          color: #0a0a0a;
          transition: transform 220ms ease;
        }

        .intro-welcome-btn:hover .intro-btn-icon {
          transform: translateX(4px);
        }

        /* Scroll Hint in Exact Bottom-Center */
        .intro-scroll-hint {
          position: absolute;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--intro-hint-color);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
          z-index: 15;
          cursor: pointer;
          transition: color 550ms ease, opacity 0.3s ease;
          animation: heroScrollCueEntrance 400ms cubic-bezier(0.16, 1, 0.3, 1) 700ms backwards;
        }

        @keyframes heroScrollCueEntrance {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .intro-hint-arrow {
          color: var(--intro-hint-accent);
          transition: color 550ms ease;
          animation: chevronBounce 1.6s ease-in-out infinite;
        }

        @keyframes chevronBounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          50% {
            transform: translateY(4px);
            opacity: 1;
          }
        }

        /* Task N: Reduced Motion Handling */
        @media (prefers-reduced-motion: reduce) {
          .intro-artwork-container,
          .intro-cube-tilt-wrapper,
          .intro-glass-pill,
          .intro-welcome-btn,
          .intro-scroll-hint {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .intro-sky-far,
          .intro-sky-mid,
          .intro-sky-front,
          .intro-light-rays,
          .intro-halo-bloom,
          .intro-energy-ring-1,
          .intro-energy-ring-2,
          .chip-1,
          .chip-2,
          .chip-3,
          .intro-cube-float-wrapper,
          .intro-wordmark-sweep,
          .intro-hint-arrow,
          .intro-particle {
            animation: none !important;
          }
          .intro-particles-wrapper,
          .intro-feature-chips-wrapper {
            display: none !important;
          }
        }

        /* Task O: Responsive scaling for small screens / mobile */
        @media (max-width: 1024px) {
          .intro-bottom-right-group {
            right: 24px;
            bottom: 42px;
          }
          .intro-welcome-btn {
            width: min(320px, 42vw);
          }
        }

        @media (max-width: 768px) {
          .intro-particles-wrapper,
          .intro-feature-chips-wrapper {
            display: none;
          }
          .intro-energy-ring-1,
          .intro-energy-ring-2 {
            opacity: 0.35;
          }
          .intro-halo-bloom {
            width: 320px;
            height: 320px;
          }
          .intro-light-rays {
            display: none;
          }
          .intro-bottom-right-group {
            left: 50%;
            right: auto;
            bottom: 72px;
            transform: translateX(-50%);
            align-items: center;
          }
          .intro-welcome-btn {
            width: min(88vw, 330px);
            height: 54px;
            padding: 0 20px;
            font-size: 14px;
          }
          .intro-scroll-hint {
            bottom: 20px;
          }
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

