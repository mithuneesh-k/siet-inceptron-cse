import { useState, useEffect } from 'react';
import client from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import {
  Bell, Trophy, Briefcase, Award, BookOpen, Calendar, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, X, Maximize2
} from 'lucide-react';

const TYPE_ICONS = {
  Hackathon: <Trophy size={16} />,
  Internship: <Briefcase size={16} />,
  Achievement: <Award size={16} />,
  Course: <BookOpen size={16} />,
  Placement: <Briefcase size={16} />,
  Event: <Calendar size={16} />,
  General: <Bell size={16} />
};

export default function AnnouncementsFeed() {
  const { theme } = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeImageModal, setActiveImageModal] = useState(null);
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
        <div className="section-header" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {paginatedAnnouncements.map(ann => {
              const isImportant = Boolean(ann.is_important);

              // Dark & Light Mode Theme Definitions
              const cardBg = isImportant
                ? (isLight ? '#fff1f2' : '#2a1014')
                : (isLight ? '#ffffff' : 'var(--bg-card)');

              const cardBorder = isImportant
                ? '#ef4444'
                : (isLight ? 'var(--border)' : 'rgba(132, 204, 22, 0.25)');

              const titleColor = isImportant
                ? (isLight ? '#991b1b' : '#ffffff')
                : (isLight ? '#111827' : '#ffffff');

              const bodyColor = isImportant
                ? (isLight ? '#374151' : '#fecaca')
                : (isLight ? '#4b5563' : '#cbd5e1');

              const typeIcon = TYPE_ICONS[ann.type] || <Bell size={16} />;

              return (
                <div
                  key={ann.id}
                  className="card animate-fadeInUp"
                  style={{
                    background: cardBg,
                    border: `1.5px solid ${cardBorder}`,
                    borderRadius: 16,
                    padding: ann.image_url ? 0 : '20px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                    transition: 'background-color 450ms ease, border-color 450ms ease, color 450ms ease',
                    boxShadow: isImportant ? '0 4px 20px rgba(239, 68, 68, 0.15)' : 'var(--shadow-sm)'
                  }}
                >
                  {/* Optional Top Image */}
                  {ann.image_url && (
                    <div
                      style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', cursor: 'pointer', background: '#0a0d14' }}
                      onClick={() => setActiveImageModal(ann)}
                      title="Click to view photo in full size"
                    >
                      <img
                        src={ann.image_url}
                        alt={ann.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 300ms ease' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'rgba(0,0,0,0.65)',
                          color: '#ffffff',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        <Maximize2 size={12} /> Expand
                      </div>
                    </div>
                  )}

                  <div style={{ padding: ann.image_url ? '18px 20px 0' : 0 }}>
                    {/* Header Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                      <span
                        className="badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
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
                            padding: '4px 8px',
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
                    <h3 style={{ fontSize: 16.5, fontWeight: 800, color: titleColor, margin: '0 0 8px 0', lineHeight: 1.35 }}>
                      {ann.title}
                    </h3>

                    {/* Message Body */}
                    <p style={{ fontSize: 13.5, color: bodyColor, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {ann.message}
                    </p>
                  </div>

                  {/* Footer Info & Action */}
                  <div style={{ padding: ann.image_url ? '16px 20px 18px' : 0, marginTop: ann.image_url ? 12 : 18, paddingTop: ann.image_url ? 12 : 12, borderTop: `1px solid ${isImportant ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: isImportant ? (isLight ? '#7f1d1d' : '#fca5a5') : 'var(--color-text-faint)', fontWeight: 500 }}>
                      {ann.created_at ? new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>

                    {ann.link && (
                      <a
                        href={ann.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          background: isImportant ? '#ef4444' : 'var(--btn-primary-bg)',
                          color: isImportant ? '#ffffff' : 'var(--btn-primary-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          borderRadius: 8,
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={12} /> View Details
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
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
              background: 'rgba(0, 0, 0, 0.85)',
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
              <img
                src={activeImageModal.image_url}
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
    </section>
  );
}
