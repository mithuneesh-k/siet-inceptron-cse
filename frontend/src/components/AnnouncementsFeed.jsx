import { useState, useEffect } from 'react';
import client from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { AnnouncementImage } from '../utils/announcementHelpers';
import {
  Bell, Trophy, Briefcase, Award, BookOpen, Calendar, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, X, Maximize2, ArrowRight
} from 'lucide-react';

const TYPE_ICONS = {
  Hackathon: <Trophy size={15} />,
  Internship: <Briefcase size={15} />,
  Achievement: <Award size={15} />,
  Course: <BookOpen size={15} />,
  Placement: <Briefcase size={15} />,
  Event: <Calendar size={15} />,
  General: <Bell size={15} />
};

export default function AnnouncementsFeed() {
  const { theme } = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [activeDetailModal, setActiveDetailModal] = useState(null);
  const pageSize = 3;

  const fetchAnnouncements = async () => {
    try {
      const res = await client.get('/announcements');
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveImageModal(null);
        setActiveDetailModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isLight = theme === 'light';

  // Pagination logic: exactly 3 items per page with auto-clamping
  const totalPages = Math.ceil(announcements.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [announcements.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAnnouncements = announcements.slice(startIndex, startIndex + pageSize);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  if (loading) {
    return (
      <section className="lp-section" style={{ padding: '36px 0 24px' }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Bell size={24} className="spin" style={{ marginBottom: 8 }} />
          <div>Loading announcements...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="lp-section announcements-section" style={{ padding: '36px 0 24px' }}>
      <div className="container">
        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 22, fontWeight: 800 }}>
              <Bell size={22} className="text-gradient" /> Department Announcements & Notifications
            </h2>
            <p className="section-subtitle" style={{ marginTop: 4, fontSize: 13.5 }}>
              Stay updated with the latest departmental notices, hackathons, and opportunities.
            </p>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handlePrev}
                  disabled={currentPage === 1}
                  style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px' }}
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', padding: '6px 12px' }}
                  aria-label="Next Page"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {announcements.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <Bell size={36} style={{ color: 'var(--color-text-muted)', marginBottom: 12, opacity: 0.5 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>No announcements right now.</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>Check back later for new updates and opportunities.</p>
          </div>
        ) : (
          <div className="announcements-feed-list" style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', alignItems: 'center' }}>
            {paginatedAnnouncements.map(ann => {
              const isImportant = Boolean(ann.is_important);

              // Dark & Light Mode Theme Definitions
              const cardBg = isImportant
                ? (isLight ? '#fff1f2' : '#2a1014')
                : (isLight ? '#ffffff' : '#0f172a');

              const cardBorder = isImportant
                ? '#ef4444'
                : (isLight ? '#dbe7d7' : 'rgba(132, 204, 22, 0.22)');

              const titleColor = isImportant
                ? (isLight ? '#991b1b' : '#ffffff')
                : (isLight ? '#111827' : '#f8fafc');

              const bodyColor = isImportant
                ? (isLight ? '#374151' : '#fecaca')
                : (isLight ? '#4b5563' : '#cbd5e1');

              const dateColor = isImportant
                ? (isLight ? '#7f1d1d' : '#fca5a5')
                : (isLight ? '#6b7280' : '#94a3b8');

              const cardShadow = isImportant
                ? (isLight ? '0 8px 24px rgba(239, 68, 68, 0.15)' : '0 12px 30px rgba(239, 68, 68, 0.20)')
                : (isLight ? '0 8px 24px rgba(15, 23, 42, 0.08)' : '0 12px 30px rgba(0, 0, 0, 0.20)');

              const typeIcon = TYPE_ICONS[ann.type] || <Bell size={15} />;

              return (
                <div
                  key={ann.id}
                  className="announcement-compact-card animate-fadeInUp"
                  style={{
                    background: cardBg,
                    border: `1.5px solid ${cardBorder}`,
                    borderRadius: 16,
                    boxShadow: cardShadow,
                    transition: 'transform 250ms ease, box-shadow 250ms ease, background-color 450ms ease, border-color 450ms ease, color 450ms ease'
                  }}
                >
                  {/* Left Side: Photo Banner */}
                  <div
                    className="announcement-compact-image-wrap"
                    onClick={() => setActiveImageModal(ann)}
                    title="Click to expand photo"
                  >
                    <AnnouncementImage
                      announcement={ann}
                      alt={ann.title}
                      className="announcement-compact-image"
                    />
                    <div className="announcement-expand-badge">
                      <Maximize2 size={11} /> Expand
                    </div>
                  </div>

                  {/* Right Side: Content */}
                  <div className="announcement-compact-content">
                    <div>
                      {/* Category & Important Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                        <span
                          className="badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: isImportant
                              ? 'rgba(239, 68, 68, 0.18)'
                              : (isLight ? '#EEF8E8' : 'rgba(132, 204, 22, 0.15)'),
                            color: isImportant
                              ? '#ef4444'
                              : (isLight ? '#2A7D14' : '#84cc16'),
                            border: `1px solid ${isImportant ? 'rgba(239, 68, 68, 0.3)' : (isLight ? '#A8D98E' : 'rgba(132, 204, 22, 0.3)')}`
                          }}
                        >
                          {typeIcon} {ann.type || 'General'}
                        </span>

                        {isImportant && (
                          <span
                            className="badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              background: '#ef4444',
                              color: '#ffffff',
                              borderRadius: 6
                            }}
                          >
                            <AlertCircle size={12} /> IMPORTANT
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        className="announcement-compact-title"
                        style={{ color: titleColor }}
                        onClick={() => setActiveDetailModal(ann)}
                        title={ann.title}
                      >
                        {ann.title}
                      </h3>

                      {/* Message Body preview (Clamped to 4 lines) */}
                      <p
                        className="announcement-compact-message"
                        style={{ color: bodyColor }}
                        onClick={() => setActiveDetailModal(ann)}
                      >
                        {ann.message}
                      </p>
                    </div>

                    {/* Footer Info & Action */}
                    <div className="announcement-compact-footer">
                      <span style={{ fontSize: 12, color: dateColor, fontWeight: 500 }}>
                        {ann.created_at ? new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {ann.link && (
                          <a
                            href={ann.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                            style={{ fontSize: 12, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <ExternalLink size={12} /> Link
                          </a>
                        )}

                        <button
                          className="btn btn-sm"
                          onClick={() => setActiveDetailModal(ann)}
                          style={{
                            fontSize: 12,
                            padding: '5px 12px',
                            background: isImportant ? '#ef4444' : 'var(--btn-primary-bg)',
                            color: isImportant ? '#ffffff' : 'var(--btn-primary-color)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 8,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: 'none'
                          }}
                        >
                          Read More <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handlePrev}
              disabled={currentPage === 1}
              style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '6px 16px' }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleNext}
              disabled={currentPage === totalPages}
              style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', padding: '6px 16px' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Full Announcement Detail Modal */}
        {activeDetailModal && (
          <div
            className="modal-overlay animate-fadeIn"
            onClick={() => setActiveDetailModal(null)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(6px)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div
              className="card animate-scaleUp"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 680,
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: 0,
                borderRadius: 20,
                background: activeDetailModal.is_important
                  ? (isLight ? '#fff1f2' : '#2a1014')
                  : (isLight ? '#ffffff' : '#0f172a'),
                border: `2px solid ${activeDetailModal.is_important ? '#ef4444' : (isLight ? '#dbe7d7' : 'rgba(132, 204, 22, 0.3)')}`,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
              }}
            >
              {/* Modal Image Header */}
              <div
                style={{ position: 'relative', width: '100%', height: 240, overflow: 'hidden', cursor: 'pointer', background: '#0a0d14' }}
                onClick={() => {
                  const ann = activeDetailModal;
                  setActiveDetailModal(null);
                  setActiveImageModal(ann);
                }}
                title="Click to expand photo"
              >
                <AnnouncementImage
                  announcement={activeDetailModal}
                  alt={activeDetailModal.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveDetailModal(null); }}
                  style={{
                    position: 'absolute',
                    top: 14, right: 14,
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 34, height: 34,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 2
                  }}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '24px 28px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span
                    className="badge"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                      background: activeDetailModal.is_important ? 'rgba(239, 68, 68, 0.18)' : (isLight ? '#EEF8E8' : 'rgba(132, 204, 22, 0.15)'),
                      color: activeDetailModal.is_important ? '#ef4444' : (isLight ? '#2A7D14' : '#84cc16'),
                      border: `1px solid ${activeDetailModal.is_important ? 'rgba(239, 68, 68, 0.3)' : (isLight ? '#A8D98E' : 'rgba(132, 204, 22, 0.3)')}`
                    }}
                  >
                    {TYPE_ICONS[activeDetailModal.type] || <Bell size={15} />} {activeDetailModal.type || 'General'}
                  </span>

                  {activeDetailModal.is_important && (
                    <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, padding: '4px 8px', background: '#ef4444', color: '#ffffff', borderRadius: 6 }}>
                      <AlertCircle size={12} /> IMPORTANT
                    </span>
                  )}

                  <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    {activeDetailModal.created_at ? new Date(activeDetailModal.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </span>
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.35, color: activeDetailModal.is_important ? (isLight ? '#991b1b' : '#ffffff') : (isLight ? '#111827' : '#ffffff') }}>
                  {activeDetailModal.title}
                </h2>

                <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line', color: activeDetailModal.is_important ? (isLight ? '#374151' : '#fecaca') : (isLight ? '#4b5563' : '#cbd5e1') }}>
                  {activeDetailModal.message}
                </p>

                {activeDetailModal.link && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <a
                      href={activeDetailModal.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '8px 16px', fontWeight: 700 }}
                    >
                      <ExternalLink size={14} /> Open Official Link ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Image Preview Modal */}
        {activeImageModal && (
          <div
            className="modal-overlay"
            onClick={() => setActiveImageModal(null)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.88)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24
            }}
          >
            <div
              style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveImageModal(null)}
                style={{
                  position: 'absolute',
                  top: -44,
                  right: 0,
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Close photo preview"
              >
                <X size={20} />
              </button>
              <AnnouncementImage
                announcement={activeImageModal}
                alt={activeImageModal.title}
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
              />
              <div style={{ color: '#ffffff', marginTop: 14, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
                {activeImageModal.title}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .announcement-compact-card {
          width: min(760px, calc(100% - 32px));
          max-width: 760px;
          min-height: 260px;
          height: 280px;
          display: grid;
          grid-template-columns: 42% 58%;
          overflow: hidden;
          margin-inline: auto;
        }

        .announcement-compact-card:hover {
          transform: translateY(-3px);
        }

        .announcement-compact-image-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: pointer;
          background: #0a0d14;
        }

        .announcement-compact-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 300ms ease;
        }

        .announcement-compact-card:hover .announcement-compact-image {
          transform: scale(1.02);
        }

        .announcement-expand-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.65);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(4px);
          pointer-events: none;
        }

        .announcement-compact-content {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .announcement-compact-title {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.3;
          margin: 0 0 8px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          cursor: pointer;
        }

        .announcement-compact-title:hover {
          opacity: 0.9;
        }

        .announcement-compact-message {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: pre-line;
          cursor: pointer;
        }

        .announcement-compact-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 640px) {
          .announcement-compact-card {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: auto;
            min-height: initial;
          }

          .announcement-compact-image-wrap {
            height: 180px;
            width: 100%;
          }

          .announcement-compact-content {
            padding: 16px 18px;
          }

          .announcement-compact-title {
            font-size: 18px;
          }

          .announcement-compact-message {
            -webkit-line-clamp: 3;
          }
        }
      `}</style>
    </section>
  );
}

