import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function IntroVideoOverlay() {
  const { theme } = useTheme();
  const [showIntro, setShowIntro] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const videoRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const isEndingRef = useRef(false);

  const videoSrc = theme === 'dark' ? '/videos/darkmain.mp4' : '/videos/light (2).mp4';

  // Expose global helper for dev testing
  useEffect(() => {
    window.__clearIntroSession = () => {
      sessionStorage.removeItem('inceptron_intro_played');
      console.log('[INTRO] Session storage key removed. Reload to view intro.');
    };
  }, []);

  useEffect(() => {
    // Check if intro has already played in this session
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('reset_intro')) {
        sessionStorage.removeItem('inceptron_intro_played');
      }

      const played = sessionStorage.getItem('inceptron_intro_played');
      if (played === 'true') {
        setShowIntro(false);
        return;
      }
    }

    // Intro needs to play
    setShowIntro(true);
  }, []);

  const finishIntro = useCallback(() => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    try {
      sessionStorage.setItem('inceptron_intro_played', 'true');
    } catch {
      // Ignore quota/storage errors
    }

    setIsFading(true);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setShowIntro(false);
    }, 600); // match fade transition
  }, []);

  useEffect(() => {
    if (!showIntro) return;

    // Safety timeout: Video duration is ~4.01s. Set fallback to 5.5s
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      finishIntro();
    }, 5500);

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [showIntro, finishIntro]);

  const handleVideoLoadedData = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback if needed
      });
    }
  };

  const handleVideoEnded = () => {
    finishIntro();
  };

  const handleVideoError = () => {
    finishIntro();
  };

  if (!showIntro) return null;

  return (
    <div
      className="intro-video-overlay-wrapper"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isFading ? 0 : 1,
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        autoPlay
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={handleVideoLoadedData}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      <button
        type="button"
        onClick={finishIntro}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 100000,
          padding: '8px 20px',
          borderRadius: '30px',
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s ease, background 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
          e.currentTarget.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.55)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Skip Intro →
      </button>
    </div>
  );
}
