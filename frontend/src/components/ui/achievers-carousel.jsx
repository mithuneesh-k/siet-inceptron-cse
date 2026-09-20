import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Trophy, Award, Medal, User, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

const ACHIEVER_SWIPE_INTERVAL = 5000;

/**
 * Top Achievers CardSwipe Carousel Component
 * Provides Watermelon card-swipe 3D depth, drag gestures, 5s autoplay, pause on hover/focus, and Light/Dark mode styling.
 */
export function AchieversCarousel({ achievers = [] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const itemCount = achievers.length;

  useEffect(() => {
    if (currentIndex >= itemCount && itemCount > 0) {
      setCurrentIndex(0);
    }
  }, [itemCount, currentIndex]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (itemCount <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setCurrentIndex(prev => (prev + 1) % itemCount);
      }
    }, ACHIEVER_SWIPE_INTERVAL);
  }, [itemCount, isPaused]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

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
  const metaColor = isLight ? '#6b7280' : '#94a3b8';

  if (!achievers || itemCount === 0) {
    return (
      <div
        className="card achiever-empty-card"
        style={{
          width: '100%',
          maxWidth: 380,
          minHeight: 280,
          background: cardBg,
          border: `1.5px solid ${cardBorder}`,
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: metaColor
        }}
      >
        <Trophy size={32} style={{ opacity: 0.5, marginBottom: 6 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: titleColor }}>No top achievers recorded yet.</div>
      </div>
    );
  }

  const currentAchiever = achievers[currentIndex] || {};
  const currentRank = currentIndex + 1;

  return (
    <div
      className="achievers-card-swipe-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      style={{
        width: '100%',
        maxWidth: 380,
        position: 'relative',
        margin: '0 auto'
      }}
    >
      {/* Background Stack Depth Layers */}
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
            key={currentAchiever.userId || currentAchiever.id || currentIndex}
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
              padding: '24px 24px 22px',
              minHeight: 310,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12,
              cursor: itemCount > 1 ? 'grab' : 'default',
              userSelect: 'none'
            }}
            className="achiever-swipe-card card-hover"
          >
            <AchieverSlideContent achiever={currentAchiever} rank={currentRank} isLight={isLight} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls (Arrows + Dots) */}
      {itemCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 18, position: 'relative', zIndex: 3 }}>
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous achiever"
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
                aria-label={`Go to achiever ${idx + 1}`}
                style={{
                  width: idx === currentIndex ? 18 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: idx === currentIndex ? (isLight ? '#166534' : '#84cc16') : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'),
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
            aria-label="Next achiever"
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

function AchieverSlideContent({ achiever, rank, isLight }) {
  const getRankBadge = () => {
    if (rank === 1) {
      return { label: '#1 Gold Medalist', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)', icon: Trophy };
    }
    if (rank === 2) {
      return { label: '#2 Silver Medalist', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)', icon: Award };
    }
    if (rank === 3) {
      return { label: '#3 Bronze Medalist', color: '#B45309', bg: 'rgba(180, 83, 9, 0.12)', border: 'rgba(180, 83, 9, 0.3)', icon: Medal };
    }
    return { label: `#${rank} Top Achiever`, color: isLight ? '#166534' : '#84cc16', bg: isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.12)', border: isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.3)', icon: Trophy };
  };

  const badge = getRankBadge();
  const BadgeIcon = badge.icon;

  const totalScore = achiever.totalScore ?? achiever.score ?? 0;
  const profileId = achiever.userId || achiever.id;

  return (
    <>
      {/* Rank Badge */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: badge.color,
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          padding: '4px 12px',
          borderRadius: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}
      >
        <BadgeIcon size={13} /> {badge.label}
      </span>

      {/* Avatar / Photo */}
      <div style={{ position: 'relative', marginTop: 2 }}>
        {achiever.avatarUrl || achiever.avatar_url ? (
          <img
            src={achiever.avatarUrl || achiever.avatar_url}
            alt={achiever.name}
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2.5px solid ${badge.color}`
            }}
          />
        ) : (
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
              border: `2.5px solid ${badge.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLight ? '#475569' : '#94a3b8'
            }}
          >
            <User size={32} />
          </div>
        )}
      </div>

      {/* Name and Meta */}
      <div>
        <h3 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 2px 0', color: isLight ? '#111827' : '#ffffff' }}>
          {achiever.name || 'Unknown Student'}
        </h3>
        <div style={{ fontSize: 12.5, color: isLight ? '#6b7280' : '#94a3b8', fontWeight: 600 }}>
          {achiever.rollNo || achiever.roll_no || ''} {achiever.class ? `• ${achiever.class}` : ''}
        </div>
      </div>

      {/* Score Pill */}
      <div style={{ fontSize: 16, fontWeight: 900, color: isLight ? '#166534' : '#84cc16' }}>
        {totalScore} <span style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#6b7280' : '#94a3b8' }}>PTS</span>
      </div>

      {/* View Profile Button */}
      {profileId && (
        <Link
          to={`/profile/${profileId}`}
          onClick={(e) => e.stopPropagation()}
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: 12,
            fontWeight: 800,
            padding: '6px 16px',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 2
          }}
        >
          <span>View Profile</span>
          <ExternalLink size={12} />
        </Link>
      )}
    </>
  );
}

export default AchieversCarousel;
