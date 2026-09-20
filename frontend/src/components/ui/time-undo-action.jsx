import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw } from 'lucide-react';

/**
 * Watermelon Time-Undo-Action Component
 * Adapted for SIET Inceptron Portal styling (Light & Dark modes)
 */
export function TimeUndoAction({
  label = 'Item',
  initialSeconds = 7,
  onUndo,
  onTimerComplete
}) {
  const [countDown, setCountDown] = useState(initialSeconds);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    setCountDown(initialSeconds);
    hasCompletedRef.current = false;

    const interval = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            if (onTimerComplete) {
              onTimerComplete();
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [initialSeconds, onTimerComplete]);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      role="region"
      aria-label="Pending deletion notification"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9990,
        maxWidth: 'calc(100vw - 32px)'
      }}
      className="watermelon-undo-container"
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={{
          background: 'var(--color-card, #ffffff)',
          border: '1px solid var(--color-border, #d7e2d3)',
          borderRadius: 16,
          boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--color-text, #111827)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Progress Bar Track at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            background: 'rgba(34, 197, 94, 0.2)',
            width: '100%'
          }}
        >
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: initialSeconds, ease: 'linear' }}
            style={{
              height: '100%',
              background: 'var(--color-green, #166534)'
            }}
          />
        </div>

        {/* Destructive Icon Badge */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            flexShrink: 0
          }}
        >
          <Trash2 size={16} />
        </div>

        {/* Label and Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text, #111827)' }}>
            {label} scheduled for deletion
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted, #6B7280)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Deleting in <strong style={{ color: 'var(--color-green, #166534)' }}>{countDown}s</strong></span>
          </div>
        </div>

        {/* Undo Action Button */}
        <button
          type="button"
          onClick={onUndo}
          aria-label="Undo deletion"
          style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: 'var(--color-green, #166534)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
          className="btn-undo-action"
        >
          <RotateCcw size={14} />
          <span>Undo</span>
        </button>
      </motion.div>
    </div>
  );
}

export default TimeUndoAction;
