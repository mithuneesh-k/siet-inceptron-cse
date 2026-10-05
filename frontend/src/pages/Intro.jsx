import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import SwitchMode from '../components/ui/switch-mode';
import { ArrowRight, ChevronDown } from 'lucide-react';

export default function Intro() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const animFrameIdRef = useRef(null);
  const isCompletedRef = useRef(false);

  const experienceRef = useRef(null);
  const overlayRef = useRef(null);
  const artworkContainerRef = useRef(null);
  const hintRef = useRef(null);
  const canvasRef = useRef(null);

  // Parallax Refs
  const parallaxFarRef = useRef(null);
  const parallaxMidRef = useRef(null);
  const parallaxCubeRef = useRef(null);
  const parallaxCtaRef = useRef(null);

  // Transition function to navigate to /showcase
  const goToShowcase = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    navigate('/showcase');
  }, [navigate]);

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
      dotColorFactor += (targetFactor - dotColorFactor) * 0.07;

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

  // Continuous Scroll-to-Enter Animation Loop (Zooms into 3D Cube & Navigates to /showcase)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      goToShowcase();
      return;
    }

    const animate = () => {
      if (isCompletedRef.current) return;

      const diff = targetProgressRef.current - currentProgressRef.current;
      currentProgressRef.current += diff * 0.08;

      const progress = currentProgressRef.current;

      const scale = 1 + Math.pow(progress, 1.2) * 2.5;
      const translateY = -progress * 10;

      if (artworkContainerRef.current) {
        artworkContainerRef.current.style.transform = `scale(${scale}) translateY(${translateY}%)`;
        artworkContainerRef.current.style.transformOrigin = '50% 42%';
      }

      if (overlayRef.current) {
        const overlayOpacity = Math.max(0, 1 - Math.pow(progress, 1.4));
        overlayRef.current.style.opacity = overlayOpacity;
      }

      if (progress >= 0.95 && targetProgressRef.current >= 0.9) {
        goToShowcase();
        return;
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    const handleWheel = (e) => {
      if (isCompletedRef.current) return;
      e.preventDefault();
      const delta = e.deltaY * 0.0025;
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
      const deltaY = (touchStartY - touchY) * 0.004;
      touchStartY = touchY;

      targetProgressRef.current = Math.min(1, Math.max(0, targetProgressRef.current + deltaY));
      if (targetProgressRef.current > 0.05) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      if (isCompletedRef.current) return;
      if (['ArrowDown', 'PageDown', 'Space', 'Enter'].includes(e.key)) {
        e.preventDefault();
        targetProgressRef.current = Math.min(1, targetProgressRef.current + 0.35);
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
  }, [goToShowcase]);

  return (
    <div ref={experienceRef} className="login-experience">
      
      {/* Interactive Dot Grid Canvas */}
      <canvas ref={canvasRef} className="intro-dot-canvas" />

      {/* Floating Theme Mode Switcher */}
      <div className="top-theme-switcher-wrapper">
        <SwitchMode width={72} height={36} />
      </div>

      {/* STAGE 1: INTRO VIEWPORT OVERLAY */}
      <div ref={overlayRef} className="intro-viewport">
        <div ref={artworkContainerRef} className="intro-artwork-container">
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

        {/* Bottom-Right Action Group */}
        <div ref={parallaxCtaRef} className="intro-bottom-right-group">
          <div className="intro-glass-pill">
            <span className="intro-pill-dot" />
            <span>CSE Achievement Portal • SIET</span>
          </div>

          <button
            type="button"
            className="intro-welcome-btn"
            onClick={goToShowcase}
            onTouchStart={goToShowcase}
          >
            <span>WELCOME TO PORTAL</span>
            <ArrowRight size={20} className="intro-btn-icon" />
          </button>
        </div>

        {/* Bottom-Center Scroll Cue */}
        <div
          ref={hintRef}
          className="intro-scroll-hint"
          onClick={goToShowcase}
          onTouchStart={goToShowcase}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToShowcase()}
        >
          <span>OR SCROLL TO ENTER</span>
          <ChevronDown size={14} className="intro-hint-arrow" />
        </div>
      </div>

      <style>{`
        .login-experience {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: var(--bg-primary, #05070b);
          color: #ffffff;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .intro-dot-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .top-theme-switcher-wrapper {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }

        .intro-viewport {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 10;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .intro-artwork-container {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
        }

        .intro-cube-tilt-wrapper,
        .intro-cube-float-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .intro-artwork {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 0;
          transition: opacity 800ms ease;
        }

        .intro-artwork.active {
          opacity: 1;
        }

        .intro-bottom-right-group {
          position: absolute;
          right: clamp(28px, 4vw, 70px);
          bottom: clamp(28px, 5vh, 60px);
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          z-index: 20;
        }

        .intro-glass-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          color: #ffffff;
        }

        .intro-pill-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6fd000;
          box-shadow: 0 0 8px rgba(111, 208, 0, 0.6);
        }

        .intro-welcome-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: clamp(290px, 24vw, 360px);
          height: 60px;
          padding: 0 30px;
          background: linear-gradient(135deg, #8be000 0%, #6fd000 100%);
          color: #05070b;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.04em;
          border: 1.5px solid #ffffff;
          border-radius: 9999px;
          cursor: pointer;
          opacity: 1;
          box-shadow: 0 12px 35px rgba(139, 224, 0, 0.6);
          transition: transform 200ms ease, box-shadow 200ms ease;
          text-transform: uppercase;
          z-index: 50;
        }

        .intro-welcome-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 16px 45px rgba(139, 224, 0, 0.75);
        }

        .intro-scroll-hint {
          position: absolute;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          z-index: 15;
          cursor: pointer;
        }

        .intro-hint-arrow {
          animation: chevronBounce 1.6s ease-in-out infinite;
        }

        @keyframes chevronBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
}
