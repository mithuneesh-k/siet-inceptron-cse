import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Briefcase, BookOpen, Calendar, ChevronDown, ExternalLink,
  MapPin, Clock, Award, CheckCircle2, AlertCircle, Tag, DollarSign
} from 'lucide-react';

/**
 * Format ISO date string into user-friendly format: e.g. "27 Sep 2026, 11:59 PM"
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

/**
 * Watermelon Expandable Event Card Component
 * Tailored for Hackathons, Internships, Events, and Courses in the Updates section.
 */
export function ExpandableEventCard({
  item,
  isExpanded,
  onToggle,
  onApply
}) {
  if (!item) return null;

  const {
    id,
    title = 'Untitled Update',
    organization = 'Department of CSE',
    description = '',
    type = 'event',
    mode = 'Online',
    prize,
    stipend,
    fee,
    amount,
    deadline,
    eligibility,
    difficulty,
    level,
    applyLink,
    apply_link,
    tags = [],
    audience,
    location,
    isClosingSoon,
    isExpired
  } = item;

  const actualLink = applyLink || apply_link;
  const formattedDeadline = formatDate(deadline);

  // Type-specific icon
  const renderIcon = () => {
    switch (type.toLowerCase()) {
      case 'hackathon':
        return <Trophy size={18} className="text-amber-500" />;
      case 'internship':
        return <Briefcase size={18} className="text-blue-500" />;
      case 'course':
        return <BookOpen size={18} className="text-emerald-500" />;
      default:
        return <Calendar size={18} className="text-purple-500" />;
    }
  };

  // Type-specific metric line
  const renderMetric = () => {
    if (type.toLowerCase() === 'hackathon') {
      const val = prize || (amount ? `₹${amount}` : 'Free');
      return (
        <span style={{ fontWeight: 800, color: 'var(--color-green, #166534)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Trophy size={13} /> {val}
        </span>
      );
    }
    if (type.toLowerCase() === 'internship') {
      const val = stipend || (amount ? `₹${amount}/mo` : 'Unpaid');
      return (
        <span style={{ fontWeight: 800, color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <DollarSign size={13} /> {val}
        </span>
      );
    }
    const val = fee || (amount === 0 ? 'Free' : amount ? `₹${amount}` : 'Free');
    return (
      <span style={{ fontWeight: 800, color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {val}
      </span>
    );
  };

  const levelLabel = difficulty || level || 'All Levels';
  const tagList = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [];
  const previewTags = tagList.slice(0, 2);
  const remainingTagCount = tagList.length - 2;

  // Prefers-reduced-motion check
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className={`card update-expandable-card ${isExpanded ? 'expanded' : ''}`}
      style={{
        background: isExpanded ? 'var(--bg-expanded, #f5faf2)' : 'var(--color-card, #ffffff)',
        border: `1px solid ${isExpanded ? 'var(--color-green, #84cc16)' : 'var(--color-border, #d7e2d3)'}`,
        borderRadius: 16,
        padding: '18px 20px',
        transition: 'all 0.25s ease',
        boxShadow: isExpanded
          ? '0 8px 24px -4px rgba(22, 101, 52, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)'
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={onToggle}
    >
      {/* ─── COLLAPSED HEADER SECTION ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        
        {/* Left: Type Icon + Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--bg-hover, rgba(34, 197, 94, 0.08))',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2
            }}
          >
            {renderIcon()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type badge + Organization */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-green, #166534)',
                  background: 'rgba(34, 197, 94, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 6
                }}
              >
                {type}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {organization}
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--color-text, #111827)',
                margin: 0,
                lineHeight: 1.35,
                wordBreak: 'break-word'
              }}
            >
              {title}
            </h3>

            {/* Compact Details Line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
              {renderMetric()}

              {mode && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {mode}
                </span>
              )}

              {formattedDeadline && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {formattedDeadline}
                </span>
              )}
            </div>

            {/* Tags preview */}
            {previewTags.length > 0 && !isExpanded && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {previewTags.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'var(--bg-hover)',
                      color: 'var(--color-text)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    #{t}
                  </span>
                ))}
                {remainingTagCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    +{remainingTagCount} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Badges + Chevron Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isExpired ? (
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: 10.5, fontWeight: 700 }}>
                Expired
              </span>
            ) : isClosingSoon ? (
              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700 }}>
                Closing Soon
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--color-green, #166534)', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: 10.5, fontWeight: 700 }}>
                Open
              </span>
            )}
          </div>

          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--bg-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              transition: 'transform 0.3s ease',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* ─── EXPANDED DETAILS SECTION ─────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 18, marginTop: 16, borderTop: '1px dashed var(--color-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Full Description */}
              {description && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Overview
                  </h4>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text)', margin: 0 }}>
                    {description}
                  </p>
                </div>
              )}

              {/* Grid Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {eligibility && (
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Eligibility</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>{eligibility}</div>
                  </div>
                )}

                {audience && (
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Target Audience</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>{audience}</div>
                  </div>
                )}

                {location && (
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Venue / Location</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>{location}</div>
                  </div>
                )}

                {levelLabel && (
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Level</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>{levelLabel}</div>
                  </div>
                )}
              </div>

              {/* All Tags */}
              {tagList.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Topics & Skills
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {tagList.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: 'rgba(34, 197, 94, 0.08)',
                          color: 'var(--color-green, #166534)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          padding: '3px 10px',
                          borderRadius: 12
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                {actualLink ? (
                  <a
                    href={actualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onApply) onApply(item);
                    }}
                    className="btn btn-primary"
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '8px 18px',
                      borderRadius: 10,
                      opacity: isExpired ? 0.6 : 1,
                      pointerEvents: isExpired ? 'none' : 'auto'
                    }}
                  >
                    <span>{isExpired ? 'Application Closed' : 'Apply Now'}</span>
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Registration link available on notice board
                  </span>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExpandableEventCard;
