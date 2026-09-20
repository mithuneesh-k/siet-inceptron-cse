import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Trophy, Award, Briefcase, BookOpen, Rocket, ChevronLeft, ChevronRight, User, ExternalLink, Calendar, Zap
} from 'lucide-react';

export const ACHIEVEMENT_SWIPE_INTERVAL = 5000;

const TYPE_ICONS = {
  Hackathon: <Trophy size={18} />,
  Internship: <Briefcase size={18} />,
  Achievement: <Award size={18} />,
  Course: <BookOpen size={18} />,
  Project: <Rocket size={18} />,
  Certification: <Award size={18} />
};

export function CardSwipe({
  achievements = [],
  loading = false,
  intervalMs = ACHIEVEMENT_SWIPE_INTERVAL,
  className = ''
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const itemCount = achievements.length;

  // Auto-clamp index if achievements list length changes
  useEffect(() => {
    if (currentIndex >= itemCount && itemCount > 0) {
      setCurrentIndex(0);
    }
  }, [itemCount, currentIndex]);

  // Reset autoplay timer whenever user interacts or slide changes
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (itemCount <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setCurrentIndex(prev => (prev + 1) % itemCount);
      }
    }, intervalMs);
  }, [itemCount, isPaused, intervalMs]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  // Visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        startTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startTimer]);

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (itemCount <= 1) return;
    setCurrentIndex(prev => (prev + 1) % itemCount);
    startTimer();
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (itemCount <= 1) return;
    setCurrentIndex(prev => (prev - 1 + itemCount) % itemCount);
    startTimer();
  };

  const handleSelectDot = (idx, e) => {
    if (e) e.stopPropagation();
    setCurrentIndex(idx);
    startTimer();
  };

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colors
  const cardBg = isLight ? '#ffffff' : 'var(--bg-card, #0f172a)';
  const cardBorder = isLight ? '#d7e2d3' : 'var(--border, rgba(132, 204, 22, 0.22))';
  const cardShadow = isLight ? '0 8px 24px rgba(15, 23, 42, 0.08)' : '0 12px 30px rgba(0, 0, 0, 0.3)';
  const titleColor = isLight ? '#111827' : '#ffffff';
  const studentColor = isLight ? '#166534' : '#84cc16';
  const bodyColor = isLight ? '#4b5563' : '#cbd5e1';
  const metaColor = isLight ? '#6b7280' : '#94a3b8';

  const badgeBg = isLight ? '#f0fdf4' : 'rgba(132, 204, 22, 0.15)';
  const badgeColor = isLight ? '#166534' : '#84cc16';
  const badgeBorder = isLight ? '#bbf7d0' : 'rgba(132, 204, 22, 0.3)';

  if (loading) {
    return (
      <div
        className={`card-swipe-skeleton ${className}`}
        style={{
          width: '100%',
          maxWidth: 420,
          minHeight: 280,
          background: cardBg,
          border: `1.5px solid ${cardBorder}`,
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: metaColor
        }}
      >
        <Zap size={24} className="spin" />
        <div style={{ fontSize: 13, fontWeight: 600 }}>Loading achievements...</div>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div
        className={`card-swipe-empty ${className}`}
        style={{
          width: '100%',
          maxWidth: 420,
          minHeight: 240,
          background: cardBg,
          border: `1.5px solid ${cardBorder}`,
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 8,
          color: metaColor
        }}
      >
        <Trophy size={32} style={{ opacity: 0.5, marginBottom: 4 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: titleColor }}>No recent achievements recorded.</div>
        <div style={{ fontSize: 12.5 }}>Approved achievements will appear here automatically.</div>
      </div>
    );
  }

  const currentAch = achievements[currentIndex] || {};
  const currentIcon = TYPE_ICONS[currentAch.type] || <Award size={18} />;

  return (
    <div
      className={`card-swipe-container ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      style={{
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        margin: '0 auto'
      }}
    >
      {/* Background Stack Effect Layers (Subtle Depth) */}
      {itemCount > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: -6,
            left: '4%',
            right: '4%',
            height: 20,
            background: isLight ? '#f4f8f2' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isLight ? '#e2ebd9' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 20,
            zIndex: 1
          }}
        />
      )}
      {itemCount > 2 && (
        <div
          style={{
            position: 'absolute',
            bottom: -12,
            left: '8%',
            right: '8%',
            height: 20,
            background: isLight ? '#edf5e9' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${isLight ? '#dbe8d1' : 'rgba(255, 255, 255, 0.04)'}`,
            borderRadius: 20,
            zIndex: 0
          }}
        />
      )}

      {/* Main Active Card */}
      <div style={{ position: 'relative', zIndex: 2, overflow: 'hidden', borderRadius: 20 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAch.id || currentIndex}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.98 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            drag={itemCount > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40) handleNext();
              else if (info.offset.x > 40) handlePrev();
            }}
            style={{
              background: cardBg,
              border: `1.5px solid ${cardBorder}`,
              borderRadius: 20,
              boxShadow: cardShadow,
              padding: '24px 24px 20px',
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14,
              cursor: itemCount > 1 ? 'grab' : 'default',
              userSelect: 'none'
            }}
            className="achievement-swipe-card card-hover"
          >
            {/* Top Row: Type Badge & Points */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeBorder}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                {currentIcon} {currentAch.type || 'Achievement'}
              </span>

              {currentAch.points ? (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: badgeColor,
                    background: isLight ? '#f0fdf4' : 'rgba(132, 204, 22, 0.12)',
                    padding: '3px 10px',
                    borderRadius: 12,
                    border: `1px solid ${badgeBorder}`
                  }}
                >
                  +{currentAch.points} PTS
                </span>
              ) : null}
            </div>

            {/* Title & Student Name */}
            <div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  margin: '0 0 6px 0',
                  color: titleColor,
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {currentAch.title}
              </h3>

              {currentAch.student_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: studentColor, marginTop: 4 }}>
                  <User size={14} />
                  <span>{currentAch.student_name}</span>
                  {currentAch.class ? <span style={{ color: metaColor, fontWeight: 500 }}>({currentAch.class})</span> : null}
                </div>
              )}
            </div>

            {/* Description Clamped to 2 lines */}
            {currentAch.description && (
              <p
                style={{
                  fontSize: 13.5,
                  color: bodyColor,
                  lineHeight: 1.5,
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {currentAch.description}
              </p>
            )}

            {/* Footer Row: Timestamp & Profile Link */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: `1px solid ${isLight ? '#e5e7eb' : 'rgba(255, 255, 255, 0.08)'}`,
                marginTop: 'auto'
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: metaColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} />
                {currentAch.created_at ? new Date(currentAch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
              </span>

              {currentAch.user_id && (
                <Link
                  to={`/profile/${currentAch.user_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-ghost btn-xs"
                  aria-label="View Student Profile"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  View Profile <ExternalLink size={12} />
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls (Only if > 1 items) */}
      {itemCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16, position: 'relative', zIndex: 3 }}>
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous achievement"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: titleColor,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: itemCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSelectDot(idx, e)}
                aria-label={`Go to achievement ${idx + 1}`}
                style={{
                  width: idx === currentIndex ? 18 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: idx === currentIndex ? badgeColor : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'),
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* Next Arrow */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next achievement"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: titleColor,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default CardSwipe;
