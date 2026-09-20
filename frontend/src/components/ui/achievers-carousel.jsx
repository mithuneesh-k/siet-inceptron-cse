import React from 'react';
import { Link } from 'react-router-dom';
import { MinimalCarousel } from './minimal-carousel';
import { Trophy, Award, Medal, User, ExternalLink } from 'lucide-react';

/**
 * Top Achievers Carousel Component
 * Uses Watermelon Minimal Carousel with 1 achiever per slide.
 */
export function AchieversCarousel({ achievers = [] }) {
  if (!achievers || achievers.length === 0) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Trophy size={22} style={{ marginBottom: 6, opacity: 0.5 }} />
        <div>No top achievers recorded yet.</div>
      </div>
    );
  }

  return (
    <MinimalCarousel itemCount={achievers.length} autoplay={false}>
      {achievers.map((achiever, index) => (
        <AchieverSlide key={achiever.userId || achiever.id || index} achiever={achiever} rank={index + 1} />
      ))}
    </MinimalCarousel>
  );
}

function AchieverSlide({ achiever, rank }) {
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
    return { label: `#${rank} Top Achiever`, color: 'var(--color-green, #166534)', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', icon: Trophy };
  };

  const badge = getRankBadge();
  const BadgeIcon = badge.icon;

  const totalScore = achiever.totalScore ?? achiever.score ?? 0;
  const profileId = achiever.userId || achiever.id;

  return (
    <div
      className="card achiever-slide-card"
      style={{
        background: 'var(--color-card, #ffffff)',
        border: '1px solid var(--color-border, #d7e2d3)',
        borderRadius: 18,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
        color: 'var(--color-text)',
        minHeight: 240,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
      }}
    >
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
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2.5px solid ${badge.color}`
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--bg-hover)',
              border: `2.5px solid ${badge.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)'
            }}
          >
            <User size={30} />
          </div>
        )}
      </div>

      {/* Name and Meta */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 2px 0', color: 'var(--color-text)' }}>
          {achiever.name || 'Unknown Student'}
        </h3>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {achiever.rollNo || achiever.roll_no || ''} {achiever.class ? `• ${achiever.class}` : ''}
        </div>
      </div>

      {/* Competitive Score Pill */}
      <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-green, #166534)' }}>
        {totalScore} <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>PTS</span>
      </div>

      {/* View Profile Action */}
      {profileId && (
        <Link
          to={`/profile/${profileId}`}
          onClick={(e) => e.stopPropagation()}
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: 12,
            fontWeight: 800,
            padding: '5px 14px',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 4
          }}
        >
          <span>View Profile</span>
          <ExternalLink size={12} />
        </Link>
      )}
    </div>
  );
}

export default AchieversCarousel;
