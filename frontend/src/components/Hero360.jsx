import { useState, useEffect, useRef, useCallback } from 'react';

const TOTAL_FRAMES = 120;
const ROTATION_SENSITIVITY = 0.16;
const SMOOTHING = 0.12;
const AUTO_ROTATE_SPEED = 0.22;

export default function Hero360({ theme }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Animation and state refs
  const framesRef = useRef([]);
  const loadedCountRef = useRef(0);
  const isManualActiveRef = useRef(false);
  const idleTimerRef = useRef(null);
  const targetFrameRef = useRef(0);
  const displayFrameRef = useRef(0);
  const lastXRef = useRef(null);
  const lastDrawnFrameRef = useRef(-1);
  const animFrameRef = useRef(null);
  const isFirstFrameDrawnRef = useRef(false);

  const themeKey = theme === 'dark' ? 'dark' : 'light';

  // 1. Render specific frame to canvas with object-contain centering
  const drawFrameToCanvas = useCallback((frameIdx) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const frames = framesRef.current;

    if (!canvas || !container || frames.length === 0) return;

    const rawIdx = ((Math.round(frameIdx) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
    const img = frames[rawIdx];
    if (!img || !img.complete) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, targetW, targetH);

    const imgAspect = img.width / img.height;
    const containerAspect = rect.width / rect.height;

    let drawW, drawH, drawX, drawY;
    if (containerAspect > imgAspect) {
      drawH = targetH;
      drawW = targetH * imgAspect;
      drawX = (targetW - drawW) / 2;
      drawY = 0;
    } else {
      drawW = targetW;
      drawH = targetW / imgAspect;
      drawX = 0;
      drawY = (targetH - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    lastDrawnFrameRef.current = rawIdx;

    if (!isFirstFrameDrawnRef.current) {
      isFirstFrameDrawnRef.current = true;
      setIsCanvasReady(true);
    }
  }, []);

  // 2. Continuous animation loop (Auto-rotate + Inertia-smoothed Manual Interaction)
  const loop = useCallback(() => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      // Auto-rotation when manual cursor interaction is idle
      if (!isManualActiveRef.current) {
        targetFrameRef.current = ((targetFrameRef.current + AUTO_ROTATE_SPEED) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES;
      }
    }

    let target = targetFrameRef.current;
    target = ((target % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;

    let currentDisplay = displayFrameRef.current;

    // Shortest circular path calculation over 0 <-> 119 boundary
    let difference = target - currentDisplay;
    if (difference > TOTAL_FRAMES / 2) difference -= TOTAL_FRAMES;
    if (difference < -TOTAL_FRAMES / 2) difference += TOTAL_FRAMES;

    if (Math.abs(difference) > 0.005) {
      currentDisplay += difference * SMOOTHING;
      currentDisplay = ((currentDisplay % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
      displayFrameRef.current = currentDisplay;
    } else {
      displayFrameRef.current = target;
      currentDisplay = target;
    }

    const roundedFrame = ((Math.round(currentDisplay) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
    if (roundedFrame !== lastDrawnFrameRef.current) {
      drawFrameToCanvas(roundedFrame);
    }

    animFrameRef.current = requestAnimationFrame(loop);
  }, [drawFrameToCanvas]);

  // 3. Preload theme-aware frame sequence progressively & start auto-rotation loop
  useEffect(() => {
    let isCancelled = false;
    loadedCountRef.current = 0;
    framesRef.current = [];
    isFirstFrameDrawnRef.current = false;
    lastDrawnFrameRef.current = -1;
    setIsCanvasReady(false);

    const loadedImages = new Array(TOTAL_FRAMES);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const numStr = String(i).padStart(3, '0');
      img.src = `/hero-frames/${themeKey}/frame-${numStr}.webp`;

      img.onload = () => {
        if (isCancelled) return;
        loadedImages[i] = img;
        loadedCountRef.current += 1;

        if (i === 0) {
          drawFrameToCanvas(0);
        }
      };

      img.onerror = () => {
        if (isCancelled) return;
        console.warn(`Failed to load hero frame frame-${numStr}.webp for theme ${themeKey}`);
      };
    }

    framesRef.current = loadedImages;

    // Start auto-rotation animation loop immediately
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(loop);

    const handleResize = () => {
      const activeIdx = lastDrawnFrameRef.current >= 0 ? lastDrawnFrameRef.current : 0;
      drawFrameToCanvas(activeIdx);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [themeKey, drawFrameToCanvas, loop]);

  // 4. Pointer Interaction Handlers
  const handlePointerEnter = (e) => {
    if (e.pointerType === 'touch' || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) {
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    lastXRef.current = e.clientX;
  };

  const handlePointerMove = (e) => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (lastXRef.current !== null && containerRef.current) {
      const deltaX = e.clientX - lastXRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && Math.abs(deltaX) > 0.5) {
        isManualActiveRef.current = true;
        const deltaFrames = (deltaX / rect.width) * (TOTAL_FRAMES * ROTATION_SENSITIVITY * 4);
        targetFrameRef.current = ((targetFrameRef.current + deltaFrames) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES;
      }
    }
    lastXRef.current = e.clientX;

    // Schedule auto-rotation resumption after 1.2s of inactivity
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isManualActiveRef.current = false;
      lastXRef.current = null;
    }, 1200);
  };

  const handlePointerLeave = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Smoothly transition back to auto-rotation after leaving area
    idleTimerRef.current = setTimeout(() => {
      isManualActiveRef.current = false;
      lastXRef.current = null;
    }, 600);
  };

  const fallbackStaticImg = `/hero-frames/${themeKey}/frame-000.webp`;

  return (
    <div
      ref={containerRef}
      className="hero-360-container"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <img
        src={fallbackStaticImg}
        alt="Inceptron 360 Hero"
        className="hero-360-fallback"
        style={{
          opacity: isCanvasReady ? 0 : 1,
        }}
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        className="hero-360-canvas"
        style={{
          opacity: isCanvasReady ? 1 : 0,
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
