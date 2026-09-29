import { useState, useEffect, useRef, useCallback } from 'react';

const TOTAL_FRAMES = 120;
const AUTO_ROTATION_MS = 6200; // 6.2 seconds per 360° rotation (calm, premium motion)
const POINTER_SENSITIVITY = 0.18; // Much slower, controlled manual cursor rotation (0.18 frames/px)
const MANUAL_SMOOTHING = 0.15; // Smooth interpolation coefficient
const MAX_MANUAL_STEP_PER_FRAME = 3.0; // Velocity cap per render step to prevent multi-spin frame explosions
const DEAD_ZONE_PX = 1.5; // Ignore micro-jitter under 1.5px

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
  const currentFrameFloatRef = useRef(0);
  const lastXRef = useRef(null);
  const lastDrawnFrameRef = useRef(-1);
  const animFrameRef = useRef(null);
  const isFirstFrameDrawnRef = useRef(false);

  // High-performance canvas bounds & visibility refs
  const widthRef = useRef(0);
  const heightRef = useRef(0);
  const isVisibleRef = useRef(true);
  const lastTimestampRef = useRef(null);

  const themeKey = theme === 'dark' ? 'dark' : 'light';

  // 1. Update backing canvas resolution ONLY when container bounds change
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    widthRef.current = rect.width;
    heightRef.current = rect.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, []);

  // 2. Render specific frame to canvas (Zero DOM reflow inside draw call)
  const drawFrameToCanvas = useCallback((frameIdx) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    const w = widthRef.current;
    const h = heightRef.current;

    if (!canvas || w <= 0 || h <= 0 || frames.length === 0) return;

    const rawIdx = ((Math.round(frameIdx) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
    let img = frames[rawIdx];

    // Fallback to last valid frame if requested frame is still decoding
    if (!img || !img.complete) {
      const fallbackIdx = lastDrawnFrameRef.current >= 0 ? lastDrawnFrameRef.current : 0;
      img = frames[fallbackIdx];
    }
    if (!img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = canvas.width;
    const targetH = canvas.height;

    ctx.clearRect(0, 0, targetW, targetH);

    const imgAspect = img.width / img.height;
    const containerAspect = w / h;

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

  // 3. Continuous time-based animation loop (Deterministic auto + smoothed, capped manual)
  const loop = useCallback(() => {
    if (!isVisibleRef.current) {
      animFrameRef.current = requestAnimationFrame(loop);
      return;
    }

    const now = performance.now();
    const delta = Math.min(now - (lastTimestampRef.current || now), 64);
    lastTimestampRef.current = now;

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      if (!isManualActiveRef.current) {
        // AUTO MODE: Continuous 6.2-second rotation
        const frameIncrement = (delta / AUTO_ROTATION_MS) * TOTAL_FRAMES;
        currentFrameFloatRef.current = ((currentFrameFloatRef.current + frameIncrement) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES;
        targetFrameRef.current = currentFrameFloatRef.current;
      } else {
        // MANUAL MODE: Smooth catch-up toward target with shortest path & velocity cap
        let target = targetFrameRef.current;
        target = ((target % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;

        let difference = target - currentFrameFloatRef.current;
        if (difference > TOTAL_FRAMES / 2) difference -= TOTAL_FRAMES;
        if (difference < -TOTAL_FRAMES / 2) difference += TOTAL_FRAMES;

        let step = difference * MANUAL_SMOOTHING;
        if (step > MAX_MANUAL_STEP_PER_FRAME) step = MAX_MANUAL_STEP_PER_FRAME;
        if (step < -MAX_MANUAL_STEP_PER_FRAME) step = -MAX_MANUAL_STEP_PER_FRAME;

        if (Math.abs(difference) > 0.01) {
          currentFrameFloatRef.current = ((currentFrameFloatRef.current + step) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES;
        } else {
          currentFrameFloatRef.current = target;
        }
      }
    }

    const currentFrame = ((Math.floor(currentFrameFloatRef.current) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
    if (currentFrame !== lastDrawnFrameRef.current) {
      drawFrameToCanvas(currentFrame);
    }

    animFrameRef.current = requestAnimationFrame(loop);
  }, [drawFrameToCanvas]);

  // 4. Preload frame sequence & setup observers
  useEffect(() => {
    let isCancelled = false;
    loadedCountRef.current = 0;
    framesRef.current = [];
    lastDrawnFrameRef.current = -1;
    lastTimestampRef.current = null;

    updateCanvasSize();

    const loadedImages = new Array(TOTAL_FRAMES);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const numStr = String(i).padStart(3, '0');
      img.src = `/hero-frames/${themeKey}/frame-${numStr}.webp`;

      img.onload = () => {
        if (isCancelled) return;
        loadedImages[i] = img;
        loadedCountRef.current += 1;

        // Draw active or initial frame as soon as available
        const currentTargetIdx = ((Math.floor(currentFrameFloatRef.current) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
        if (i === currentTargetIdx || (i === 0 && !isFirstFrameDrawnRef.current)) {
          drawFrameToCanvas(i);
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

    // Setup ResizeObserver for layout shifts
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
        const activeIdx = lastDrawnFrameRef.current >= 0 ? lastDrawnFrameRef.current : 0;
        drawFrameToCanvas(activeIdx);
      });
      resizeObserver.observe(containerRef.current);
    }

    // Setup IntersectionObserver for off-screen CPU optimization
    let intersectionObserver = null;
    if (typeof IntersectionObserver !== 'undefined' && containerRef.current) {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          lastTimestampRef.current = performance.now();
        }
      }, { threshold: 0.05 });
      intersectionObserver.observe(containerRef.current);
    }

    // Visibility change handler for hidden browser tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isVisibleRef.current = false;
      } else {
        isVisibleRef.current = true;
        lastTimestampRef.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [themeKey, updateCanvasSize, drawFrameToCanvas, loop]);

  // 5. Pointer Interaction Handlers
  const handlePointerEnter = (e) => {
    if (e.pointerType === 'touch' || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) {
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    lastXRef.current = e.clientX;
    targetFrameRef.current = currentFrameFloatRef.current;
  };

  const handlePointerMove = (e) => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (lastXRef.current !== null) {
      const deltaX = e.clientX - lastXRef.current;
      // Ignore micro-jitter below 1.5px
      if (Math.abs(deltaX) >= DEAD_ZONE_PX) {
        isManualActiveRef.current = true;
        const deltaFrames = deltaX * POINTER_SENSITIVITY;
        targetFrameRef.current = ((targetFrameRef.current + deltaFrames) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES;
        lastXRef.current = e.clientX;
      }
    } else {
      lastXRef.current = e.clientX;
    }

    // Schedule auto-rotation resumption after 1.2s of inactivity
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isManualActiveRef.current = false;
      lastXRef.current = null;
    }, 1200);
  };

  const handlePointerLeave = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
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
