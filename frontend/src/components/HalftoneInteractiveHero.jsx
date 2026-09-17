import { useEffect, useRef } from 'react';

export default function HalftoneInteractiveHero({ src = '/real inceptron.png' }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    // 1. Check prefers-reduced-motion & touch/mobile screens
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 868 || ('ontouchstart' in window);

    if (prefersReducedMotion || isMobile) {
      return; // Static fallback via CSS
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;

    const initCanvasAndParticles = () => {
      if (!img.complete || img.naturalWidth === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      if (width === 0 || height === 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Create offscreen canvas to sample image pixels
      const offscreen = document.createElement('canvas');
      const sampleW = 320;
      const sampleH = Math.round((sampleW / img.naturalWidth) * img.naturalHeight);
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(img, 0, 0, sampleW, sampleH);

      const imgData = offCtx.getImageData(0, 0, sampleW, sampleH).data;

      // Calculate grid step for target particle count (~2,500 - 4,000 particles)
      const gridStep = width > 1200 ? 8 : 7;
      const particles = [];

      for (let y = 0; y < height; y += gridStep) {
        for (let x = 0; x < width; x += gridStep) {
          // Map (x, y) to offscreen image coordinate
          const sampleX = Math.floor((x / width) * sampleW);
          const sampleY = Math.floor((y / height) * sampleH);
          const idx = (sampleY * sampleW + sampleX) * 4;

          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          // Darker image areas = larger dots
          const maxRadius = gridStep * 0.46;
          const radius = (1 - brightness) * maxRadius;

          if (radius > 0.4) {
            particles.push({
              baseX: x,
              baseY: y,
              x: x,
              y: y,
              vx: 0,
              vy: 0,
              radius: radius,
              brightness: brightness
            });
          }
        }
      }

      particlesRef.current = particles;
    };

    img.onload = () => {
      initCanvasAndParticles();
    };

    if (img.complete) {
      initCanvasAndParticles();
    }

    // Spring physics configuration
    const springStrength = 0.05;
    const friction = 0.84;
    const interactionRadius = 110;
    const maxRepulsion = 12;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < interactionRadius && dist > 0) {
            const force = (1 - dist / interactionRadius) * maxRepulsion;
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle) * force * 0.35;
            p.vy += Math.sin(angle) * force * 0.35;
          }
        }

        // Spring force towards base position
        const ax = (p.baseX - p.x) * springStrength;
        const ay = (p.baseY - p.y) * springStrength;

        p.vx = (p.vx + ax) * friction;
        p.vy = (p.vy + ay) * friction;

        p.x += p.vx;
        p.y += p.vy;

        // Render dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#111111';
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Event handlers
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      initCanvasAndParticles();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="auth-07-hero"
      aria-label="Inceptron Artwork"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
