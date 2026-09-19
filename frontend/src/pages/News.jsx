import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { AnnouncementImage } from '../utils/announcementHelpers';
import {
  Bell, Trophy, Briefcase, Award, BookOpen, Calendar, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, X, Maximize2, Search, Filter
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

const CATEGORIES = ['All', 'Hackathon', 'Internship', 'Achievement', 'Course', 'Placement', 'Event', 'General'];

export default function News() {
  const { theme } = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeImageModal, setActiveImageModal] = useState(null);
  const pageSize = 6;

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

  // Filter announcements by category & search term
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesCategory = selectedCategory === 'All' || (ann.type || 'General').toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchTerm.trim() || 
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ann.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Pagination logic: 6 items per page
  const totalPages = Math.ceil(filteredAnnouncements.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [filteredAnnouncements.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + pageSize);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="admin-header animate-fadeInUp" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <Bell size={28} className="text-gradient" />
              <span className="text-gradient">Department News & Announcements</span>
            </h1>
            <p className="section-subtitle" style={{ marginTop: 4 }}>
              Sri Shakthi Institute of Engineering and Technology — CSE Department Directives & Opportunities
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card animate-fadeInUp delay-1" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            {/* Category Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                  style={{
                    fontSize: 12.5,
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontWeight: selectedCategory === cat ? 800 : 600
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search announcements…"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ paddingLeft: 36, fontSize: 13, height: 38, width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card" style={{ height: 320, padding: 20 }}>
                <div className="skeleton" style={{ width: '100%', height: 160, borderRadius: 10, marginBottom: 16 }}></div>
                <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 8 }}></div>
                <div className="skeleton skeleton-text-lg" style={{ width: '80%', marginBottom: 12 }}></div>
                <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
              </div>
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <Bell size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 12, opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>No announcements found.</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 6, marginBottom: 0 }}>
              {searchTerm || selectedCategory !== 'All' ? 'Try adjusting your search or category filter.' : 'Check back later for new notices.'}
            </p>
          </div>
        ) : (
          <>
            {/* Announcement Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {paginatedAnnouncements.map((ann, i) => {
                const isImportant = Boolean(ann.is_important);

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
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      overflow: 'hidden',
                      boxShadow: isImportant ? '0 4px 20px rgba(239, 68, 68, 0.15)' : 'var(--shadow-sm)',
                      animationDelay: `${i * 0.05}s`
                    }}
                  >
                    {/* Top Image Banner (with module.png fallback) */}
                    <div
                      style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', cursor: 'pointer', background: '#0a0d14' }}
                      onClick={() => setActiveImageModal(ann)}
                      title="Click to expand photo"
                    >
                      <AnnouncementImage
                        announcement={ann}
                        alt={ann.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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

                    {/* Content Body */}
                    <div style={{ padding: '18px 20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
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

                      <h3 style={{ fontSize: 17, fontWeight: 800, color: titleColor, margin: '0 0 10px 0', lineHeight: 1.35 }}>
                        {ann.title}
                      </h3>

                      <p style={{ fontSize: 13.5, color: bodyColor, margin: 0, lineHeight: 1.55, whiteSpace: 'pre-line', flex: 1 }}>
                        {ann.message}
                      </p>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 20px 18px', marginTop: 16, borderTop: `1px solid ${isImportant ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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
                            padding: '4px 12px',
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Showing page {currentPage} of {totalPages} ({filteredAnnouncements.length} total)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    style={{ opacity: currentPage === 1 ? 0.4 : 1, padding: '8px 16px' }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    style={{ opacity: currentPage === totalPages ? 0.4 : 1, padding: '8px 16px' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Lightbox Modal */}
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
    </div>
  );
}
