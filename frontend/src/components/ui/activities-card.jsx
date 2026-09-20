import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronUp, Zap, Bell, Trophy, Briefcase, Award, BookOpen, Calendar, Activity } from 'lucide-react';

export function ActivitiesCard({
  headerIcon = <Activity size={20} />,
  title = "Recent Activity",
  subtitle = "Latest updates & achievements",
  activities = [],
  loading = false,
  error = false,
  className = ''
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [open, setOpen] = useState(true);

  // Light & Dark Mode Color Palette
  const cardBg = isLight ? '#ffffff' : 'var(--bg-card, #0f172a)';
  const cardBorder = isLight ? '#d7e2d3' : 'var(--border, rgba(132, 204, 22, 0.22))';
  const titleColor = isLight ? '#111827' : '#ffffff';
  const subtitleColor = isLight ? '#6b7280' : '#94a3b8';
  const cardShadow = isLight ? '0 6px 20px rgba(15, 23, 42, 0.06)' : '0 12px 30px rgba(0, 0, 0, 0.25)';

  const iconBg = isLight ? '#f0fdf4' : 'rgba(132, 204, 22, 0.15)';
  const iconColor = isLight ? '#166534' : '#84cc16';
  const iconBorder = isLight ? '#bbf7d0' : 'rgba(132, 204, 22, 0.3)';

  const rowHoverBg = isLight ? '#f0fdf4' : 'rgba(255, 255, 255, 0.04)';
  const rowTitleColor = isLight ? '#111827' : '#f8fafc';
  const rowDescColor = isLight ? '#4b5563' : '#cbd5e1';
  const rowTimeColor = isLight ? '#6b7280' : '#94a3b8';

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      layout
      className={`activities-card-wrapper ${className}`}
      style={{
        width: '100%',
        maxWidth: 420,
        background: cardBg,
        border: `1.5px solid ${cardBorder}`,
        borderRadius: 18,
        boxShadow: cardShadow,
        overflow: 'hidden',
        transition: 'background-color 300ms ease, border-color 300ms ease'
      }}
    >
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          {/* Header Icon Badge */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: iconBg,
              border: `1px solid ${iconBorder}`,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {headerIcon}
          </div>

          {/* Title & Subtitle */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: titleColor, lineHeight: 1.25 }}>
              {title}
            </div>
            {!open && (
              <div style={{ fontSize: 12.5, fontWeight: 500, color: subtitleColor, marginTop: 2 }} className="truncate">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Chevron Icon */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLight ? '#475569' : '#cbd5e1',
            flexShrink: 0
          }}
        >
          <ChevronUp size={16} />
        </motion.div>
      </button>

      {/* Content Area */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              borderTop: `1px solid ${isLight ? '#e5e7eb' : 'rgba(255, 255, 255, 0.08)'}`
            }}
          >
            <div style={{ padding: '8px 0' }}>
              {loading ? (
                <div style={{ padding: '20px 20px', textAlign: 'center', color: subtitleColor, fontSize: 13 }}>
                  <Activity size={18} className="spin" style={{ marginBottom: 6 }} />
                  <div>Loading recent activity...</div>
                </div>
              ) : error ? (
                <div style={{ padding: '20px 20px', textAlign: 'center', color: subtitleColor, fontSize: 13 }}>
                  Unable to load recent activity.
                </div>
              ) : activities.length === 0 ? (
                <div style={{ padding: '20px 20px', textAlign: 'center', color: subtitleColor, fontSize: 13 }}>
                  No recent activity.
                </div>
              ) : (
                activities.slice(0, 5).map((item, idx) => (
                  <ActivityRow
                    key={item.id || idx}
                    item={item}
                    isLight={isLight}
                    rowHoverBg={rowHoverBg}
                    rowTitleColor={rowTitleColor}
                    rowDescColor={rowDescColor}
                    rowTimeColor={rowTimeColor}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActivityRow({ item, isLight, rowHoverBg, rowTitleColor, rowDescColor, rowTimeColor }) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    if (item.icon) return item.icon;
    const type = (item.type || '').toLowerCase();
    if (type.includes('hackathon')) return <Trophy size={15} />;
    if (type.includes('internship')) return <Briefcase size={15} />;
    if (type.includes('achievement') || type.includes('cert')) return <Award size={15} />;
    if (type.includes('course')) return <BookOpen size={15} />;
    if (type.includes('event')) return <Calendar size={15} />;
    return <Bell size={15} />;
  };

  const iconBg = isLight ? '#f0fdf4' : 'rgba(132, 204, 22, 0.15)';
  const iconColor = isLight ? '#166534' : '#84cc16';
  const iconBorder = isLight ? '#bbf7d0' : 'rgba(132, 204, 22, 0.25)';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        background: isHovered ? rowHoverBg : 'transparent',
        transition: 'background-color 180ms ease',
        cursor: item.link ? 'pointer' : 'default'
      }}
      onClick={() => {
        if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: iconBg,
          border: `1px solid ${iconBorder}`,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {getIcon()}
      </div>

      {/* Main Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: rowTitleColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {item.title}
        </div>
        {item.desc && (
          <div
            style={{
              fontSize: 12,
              color: rowDescColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 1
            }}
          >
            {item.desc}
          </div>
        )}
      </div>

      {/* Relative / Actual Timestamp */}
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: rowTimeColor,
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {item.time || 'Recent'}
      </div>
    </div>
  );
}

export default ActivitiesCard;
