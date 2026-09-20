import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MinimalCarousel } from './minimal-carousel';
import { ArrowRight, AlertTriangle, Calendar, Bell } from 'lucide-react';

/**
 * News Carousel Component for Home / Landing Page
 * Rendered using Watermelon Minimal Carousel.
 */
export function NewsCarousel({ announcements = [] }) {
  if (!announcements || announcements.length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Bell size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
        <div>No announcements right now.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MinimalCarousel itemCount={announcements.length} autoplay={false}>
        {announcements.map((item) => (
          <NewsSlide key={item.id} item={item} />
        ))}
      </MinimalCarousel>

      {/* View All Link */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <Link
          to="/news"
          className="btn btn-ghost btn-sm"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--color-green, #166534)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>View All News & Announcements</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function NewsSlide({ item }) {
  const [imgSrc, setImgSrc] = useState(() => item.image_url || '/module.jpg');
  const isImportant = Boolean(item.important);

  const formattedDate = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Recent';

  return (
    <div
      className="card news-slide-card"
      style={{
        background: isImportant
          ? 'var(--bg-important-card, rgba(239, 68, 68, 0.05))'
          : 'var(--color-card, #ffffff)',
        border: `1px solid ${isImportant ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border, #d7e2d3)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        minHeight: 260,
        maxHeight: 320,
        color: 'var(--color-text)'
      }}
    >
      {/* Left Image Section */}
      <div
        className="news-slide-image-container"
        style={{
          width: '42%',
          minWidth: 200,
          background: 'var(--bg-hover)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <img
          src={imgSrc}
          alt={item.title || 'Announcement'}
          onError={() => setImgSrc('/module.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Right Content Section */}
      <div
        style={{
          flex: 1,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0
        }}
      >
        <div>
          {/* Header Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {isImportant ? (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: '#EF4444',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <AlertTriangle size={11} /> IMPORTANT
              </span>
            ) : (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'var(--color-green, #166534)',
                  background: 'rgba(34, 197, 94, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase'
                }}
              >
                Announcement
              </span>
            )}

            <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> {formattedDate}
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--color-text)',
              margin: '0 0 8px 0',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {item.title || 'Untitled Announcement'}
          </h3>

          {/* Message Preview (3-4 lines clamp) */}
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--color-text-muted)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {item.message || item.description || ''}
          </p>
        </div>

        {/* Read More Link */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
          <Link
            to="/news"
            style={{
              fontSize: 12.5,
              fontWeight: 800,
              color: isImportant ? '#EF4444' : 'var(--color-green, #166534)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none'
            }}
          >
            <span>Read Full Announcement</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NewsCarousel;
