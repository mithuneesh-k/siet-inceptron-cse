import { useEffect, useRef } from 'react';

export default function HalftoneInteractiveHero({ src = '/real inceptron clean.png', scale = 0.88 }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    // Check prefers-reduced-motion & mobile screens
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

      // Create offscreen canvas to sample image pixels at high resolution
      const sampleW = 640;
      const sampleH = Math.round((sampleW / img.naturalWidth) * img.naturalHeight);
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(img, 0, 0, sampleW, sampleH);

      const imgData = offCtx.getImageData(0, 0, sampleW, sampleH).data;

      // Fit contained in artwork container area with controlled scale factor
      const containerAspect = width / height;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let fullW = width;
      let fullH = height;

      if (containerAspect > imgAspect) {
        fullH = height;
        fullW = height * imgAspect;
      } else {
        fullW = width;
        fullH = width / imgAspect;
      }

      const imgW = fullW * scale;
      const imgH = fullH * scale;
      const imgX = (width - imgW) / 2; // Centered in container
      const imgY = (height - imgH) / 2;

      // Fine grid step for high-density particle sampling across artwork & INCEPTRON wordmark
      const gridStep = width > 600 ? 5 : 6;
      const particles = [];

      for (let y = 0; y < height; y += gridStep) {
        for (let x = 0; x < width; x += gridStep) {
          const sampleX = Math.floor(((x - imgX) / imgW) * sampleW);
          const sampleY = Math.floor(((y - imgY) / imgH) * sampleH);

          if (sampleX >= 0 && sampleX < sampleW && sampleY >= 0 && sampleY < sampleH) {
            const idx = (sampleY * sampleW + sampleX) * 4;

            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];

            if (a < 20) continue;

            const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

            // Generate halftone dots consistently across artwork & INCEPTRON text
            if (brightness > 0.92) {
              continue;
            }

            const maxRadius = gridStep * 0.42;
            const radius = Math.max(0.4, (1 - brightness) * maxRadius);

            if (radius > 0.35) {
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
    const interactionRadius = 120;
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

        // Render dot with crisp halftone dark tone
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 20, 22, 0.85)';
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Global Window Event Handlers
    const handleMouseMove = (e) => {
      if (!container) return;
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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, [src, scale]);

  return (
    <div
      ref={containerRef}
      className="auth-07-hero"
      aria-label="Inceptron Artwork"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
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
