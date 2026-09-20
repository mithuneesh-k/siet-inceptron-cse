import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { HiBadgeCheck } from 'react-icons/hi';
import { IoCloseSharp } from 'react-icons/io5';
import { FaInbox } from 'react-icons/fa6';
import { RiBubbleChartFill } from 'react-icons/ri';
import { BsFileTextFill, BsSendFill, BsTagFill } from 'react-icons/bs';
import { TbClockHour12Filled } from 'react-icons/tb';

function AnimatedText({ text, className, style, delayStep = 0.014 }) {
  const chars = text.split('');

  return (
    <span className={className} style={{ display: 'inline-flex', ...style }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          style={{ display: 'inline-flex', willChange: 'transform' }}
        >
          {chars.map((char, i) => (
            <motion.span
              key={i}
              initial={{
                y: 10,
                opacity: 0,
                scale: 0.5,
                filter: 'blur(2px)',
              }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
              }}
              exit={{
                y: -10,
                opacity: 0,
                scale: 0.5,
                filter: 'blur(2px)',
              }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 16,
                mass: 1.2,
                delay: i * delayStep,
              }}
              style={{
                display: 'inline-block',
                whiteSpace: char === ' ' ? 'pre' : undefined,
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const spring = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
  mass: 0.8,
};

const DEFAULT_STEPS = [
  { id: 1, label: 'Connecting Platform', icon: FaInbox },
  { id: 2, label: 'Fetching Solved Problems', icon: RiBubbleChartFill },
  { id: 3, label: 'Calculating Rating & Score', icon: BsTagFill },
  { id: 4, label: 'Verifying Profile Ownership', icon: TbClockHour12Filled },
  { id: 5, label: 'Updating Leaderboard Data', icon: BsFileTextFill },
  { id: 6, label: 'Sync Complete', icon: BsSendFill },
];

export function RunActionButton({
  steps = DEFAULT_STEPS,
  onStart,
  onComplete,
  idleText = 'Sync Platform',
  doneText = 'Synced',
  disabled = false,
}) {
  const [status, setStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);

  const startAction = async () => {
    if (disabled || status === 'running') return;
    setStatus('running');
    setCurrentStep(0);
    if (onStart) {
      try {
        await onStart();
      } catch {
        // Handled upstream
      }
    }
  };

  const reset = () => {
    setStatus('idle');
    setCurrentStep(0);
  };

  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        setStatus('done');
        if (onComplete) onComplete();
        return prev;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [status, steps.length, onComplete]);

  const widths = {
    idle: 150,
    running: 290,
    done: 150,
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ width: 150 }}
        animate={{ width: widths[status] }}
        transition={spring}
        style={{
          position: 'relative',
          display: 'flex',
          height: '38px',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          borderRadius: '9999px',
          border: status === 'running' ? '2px dashed #84cc16' : '1.5px solid var(--border-strong)',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {status === 'idle' && (
            <motion.button
              key="idle"
              type="button"
              onClick={startAction}
              disabled={disabled}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              transition={spring}
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '9999px',
                background: 'var(--bg-card)',
                padding: '6px 14px',
                whiteSpace: 'nowrap',
                color: 'var(--color-green)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                border: 'none',
                width: '100%',
                height: '100%',
              }}
            >
              <Zap size={15} />
              <AnimatedText text={idleText} style={{ fontSize: '13px', fontWeight: 700 }} />
            </motion.button>
          )}

          {status === 'running' && (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              transition={spring}
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '0 10px',
                whiteSpace: 'nowrap',
                background: 'var(--green-50)',
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0, filter: 'blur(4px)' }}
                    transition={spring}
                  >
                    {React.createElement(steps[currentStep].icon, {
                      style: { width: 14, height: 14, color: 'var(--color-green)' },
                    })}
                  </motion.div>
                </AnimatePresence>
                <AnimatedText
                  text={steps[currentStep].label}
                  style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: 700 }}
                />
              </div>

              <motion.button
                type="button"
                onClick={reset}
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                transition={{ ...spring, delay: 0.15 }}
                style={{
                  borderRadius: '50%',
                  background: 'var(--border)',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <IoCloseSharp style={{ width: 12, height: 12, color: 'var(--color-text-muted)' }} />
              </motion.button>
            </motion.div>
          )}

          {status === 'done' && (
            <motion.button
              key="done"
              type="button"
              onClick={reset}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              transition={spring}
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '9999px',
                background: 'var(--green-50)',
                padding: '6px 14px',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
            >
              <HiBadgeCheck style={{ width: 16, height: 16, color: 'var(--color-green)' }} />
              <AnimatedText
                text={doneText}
                style={{ fontSize: '13px', color: 'var(--color-green)', fontWeight: 700 }}
              />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default RunActionButton;
