import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Watermelon Minimal Carousel Component
 * Provides clean horizontal sliding, dot pagination, and touch swipe support.
 */
export function MinimalCarousel({
  children,
  itemCount = 0,
  autoplay = false,
  intervalMs = 6000,
  className = ''
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Handle slide wrap around
  useEffect(() => {
    if (currentIndex >= itemCount && itemCount > 0) {
      setCurrentIndex(0);
    }
  }, [itemCount, currentIndex]);

  // Optional Autoplay (disabled by default)
  useEffect(() => {
    if (!autoplay || itemCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % itemCount);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoplay, itemCount, intervalMs]);

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (itemCount <= 1) return;
    setCurrentIndex(prev => (prev + 1) % itemCount);
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (itemCount <= 1) return;
    setCurrentIndex(prev => (prev - 1 + itemCount) % itemCount);
  };

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!itemCount || itemCount === 0) {
    return null;
  }

  const childArray = React.Children.toArray(children);
  const currentChild = childArray[currentIndex];

  return (
    <div
      className={`minimal-carousel-wrapper ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 860,
        margin: '0 auto'
      }}
    >
      {/* Slide Container */}
      <div style={{ overflow: 'hidden', borderRadius: 18, position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ width: '100%' }}
          >
            {currentChild}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls (Only show if more than 1 item) */}
      {itemCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-card, #ffffff)',
              border: '1px solid var(--color-border, #d7e2d3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
            className="carousel-nav-btn"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: itemCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  width: idx === currentIndex ? 18 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: idx === currentIndex ? 'var(--color-green, #166534)' : 'var(--color-border, #cbd5e1)',
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
            aria-label="Next slide"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-card, #ffffff)',
              border: '1px solid var(--color-border, #d7e2d3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text)',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
            className="carousel-nav-btn"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default MinimalCarousel;
