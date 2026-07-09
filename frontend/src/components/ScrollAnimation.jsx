import { useEffect, useRef, useState, useCallback } from 'react';
import FloatingNav from './FloatingNav';

const VIDEO_SRC = '/scroll-video.mp4';
const SCROLL_PX_PER_SECOND = 600;
const TARGET_FPS = 30;
const LERP_FACTOR = 0.1;

export default function ScrollAnimation() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafId = useRef(0);
  const resizeTimer = useRef(null);

  const framesRef = useRef([]);
  const totalFrames = useRef(0);

  const targetFrame = useRef(0);
  const currentFrame = useRef(0);
  const lastDrawnFrame = useRef(-1);

  const [isReady, setIsReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState('downloading');
  const [videoDuration, setVideoDuration] = useState(0);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    lastDrawnFrame.current = -1;
  }, []);

  const drawFrame = useCallback((frameIdx) => {
    const canvas = canvasRef.current;
    const frame = framesRef.current[frameIdx];
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasW = canvas.width / dpr;
    const canvasH = canvas.height / dpr;

    const imgW = frame.width;
    const imgH = frame.height;
    const scale = Math.max(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const offsetX = (canvasW - drawW) / 2;
    const offsetY = (canvasH - drawH) / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(frame, offsetX, offsetY, drawW, drawH);
  }, []);

  const renderLoop = useCallback(() => {
    const tick = () => {
      const container = containerRef.current;
      if (!container || totalFrames.current === 0) {
        rafId.current = requestAnimationFrame(tick);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const scrollableHeight = container.offsetHeight - window.innerHeight;
      let rawProgress = 0;
      if (scrollableHeight > 0) {
        rawProgress = -containerRect.top / scrollableHeight;
      }
      const progress = Math.max(0, Math.min(1, rawProgress));

      targetFrame.current = progress * (totalFrames.current - 1);

      const diff = targetFrame.current - currentFrame.current;
      if (Math.abs(diff) > 0.05) {
        currentFrame.current += diff * LERP_FACTOR;
      } else {
        currentFrame.current = targetFrame.current;
      }

      const frameIdx = Math.round(
        Math.max(0, Math.min(totalFrames.current - 1, currentFrame.current))
      );

      if (frameIdx !== lastDrawnFrame.current) {
        drawFrame(frameIdx);
        lastDrawnFrame.current = frameIdx;
      }

      rafId.current = requestAnimationFrame(tick);
    };
    tick();
  }, [drawFrame]);

  useEffect(() => {
    document.documentElement.style.overflow = 'visible';
    document.body.style.overflow = 'visible';
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function extractFrames() {
      const video = document.createElement('video');
      video.src = VIDEO_SRC;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video load failed'));
      });

      const duration = video.duration;
      setVideoDuration(duration);

      setLoadStage('downloading');
      await new Promise((resolve) => {
        const check = () => {
          if (video.readyState >= 4) {
            resolve();
            return;
          }
          if (video.buffered.length > 0) {
            const pct = Math.round(
              (video.buffered.end(video.buffered.length - 1) / duration) * 100
            );
            if (!cancelled) setLoadProgress(pct);
          }
          setTimeout(check, 100);
        };
        video.oncanplaythrough = () => resolve();
        check();
      });

      if (cancelled) return;

      setLoadStage('extracting');
      setLoadProgress(0);

      const frameCount = Math.ceil(duration * TARGET_FPS);
      totalFrames.current = frameCount;
      const frames = new Array(frameCount);

      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth;
      offscreen.height = video.videoHeight;
      const offCtx = offscreen.getContext('2d');

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;

        const time = (i / (frameCount - 1)) * duration;
        video.currentTime = time;

        await new Promise((resolve) => {
          video.onseeked = () => resolve();
        });

        offCtx.drawImage(video, 0, 0);

        const bitmap = await createImageBitmap(offscreen);
        frames[i] = bitmap;

        if (!cancelled) {
          setLoadProgress(Math.round(((i + 1) / frameCount) * 100));
        }
      }

      if (cancelled) return;

      framesRef.current = frames;
      setIsReady(true);
    }

    extractFrames().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    sizeCanvas();
    drawFrame(0);
    lastDrawnFrame.current = 0;
    rafId.current = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        sizeCanvas();
      }, 16);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize', handleResize);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
    };
  }, [isReady, sizeCanvas, renderLoop, drawFrame]);

  const scrollPxTotal = videoDuration
    ? Math.round(videoDuration * SCROLL_PX_PER_SECOND)
    : 5000;

  if (!isReady) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        gap: '12px',
      }}>
        <p style={{
          fontFamily: "'Space Grotesk', monospace",
          color: '#fff',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontWeight: 400,
        }}>
          {loadStage === 'downloading'
            ? `Buffering… ${loadProgress}%`
            : `Preparing… ${loadProgress}%`}
        </p>
        <div style={{
          width: '200px',
          height: '2px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '1px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${loadProgress}%`,
            height: '100%',
            background: 'rgba(255,255,255,0.7)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: `calc(${scrollPxTotal}px + 100vh)`,
      }}
    >
      <div style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            willChange: 'transform',
            display: 'block',
          }}
        />
        <FloatingNav />
      </div>
    </div>
  );
}
