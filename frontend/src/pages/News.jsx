import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AnnouncementImage } from '../utils/announcementHelpers';
import { compressImage, formatFileSize } from '../utils/imageCompressor';
import {
  Bell, Trophy, Briefcase, Award, BookOpen, Calendar, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, X, Maximize2, Search, ArrowRight, Plus, Send, Image as ImageIcon, Upload, CheckCircle, RefreshCw, Trash2
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

const CATEGORIES = ['All', 'Hackathon', 'Internship', 'Achievement', 'Course', 'Placement', 'Event', 'General'];

export default function News() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [activeDetailModal, setActiveDetailModal] = useState(null);
  const [toast, setToast] = useState(null);
  const pageSize = 5;

  // Post News Bar state for Faculty / Admin
  const [showPostForm, setShowPostForm] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ title: '', type: 'General', message: '', is_important: false, target: 'all', link: '', expires_at: '' });
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [annImageFile, setAnnImageFile] = useState(null);
  const [annImagePreview, setAnnImagePreview] = useState(null);
  const [uploadingAnnImage, setUploadingAnnImage] = useState(false);
  const [annUploadState, setAnnUploadState] = useState({ status: 'idle', text: '', data: null, error: null });
  const annUploadPromiseRef = useRef(null);

  const canPostNews = Boolean(user && (user.role === 'faculty' || user.role === 'admin' || user.is_admin || user.is_hod || user.designation?.toUpperCase() === 'HOD'));
  const isHOD = Boolean(user && (user.role === 'admin' || user.is_hod === true || user.designation?.toUpperCase()?.includes('HOD') || user.designation?.toUpperCase() === 'HEAD OF DEPARTMENT'));
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getActionErrorMessage = (err, defaultMsg = 'Operation failed.') => {
    if (err?.response?.data?.error) return err.response.data.error;
    const status = err?.response?.status;
    if (status === 401) return 'Session expired. Please log in again.';
    if (status === 403) return 'You do not have permission to delete this announcement.';
    if (status === 404) return 'This announcement was not found or has already been removed.';
    if (status === 409) return 'This item could not be deleted because it is still referenced by another record.';
    if (status >= 500) return 'The database rejected the deletion. Please contact the administrator if the problem continues.';
    if (!err?.response) return 'Could not connect to the server. Please try again.';
    return defaultMsg;
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    try {
      const res = await client.delete(`/announcements/${targetId}`);
      if (res.data?.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== targetId));
        showToast('Announcement deleted successfully.');
        setDeleteTarget(null);
        if (activeDetailModal?.id === targetId) {
          setActiveDetailModal(null);
        }
      }
    } catch (err) {
      showToast(getActionErrorMessage(err, 'Unable to delete announcement. Please try again.'), 'error');
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await client.get('/announcements');
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      } else {
        setErrorMsg('Failed to load announcements from server.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Unable to connect to announcements service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const handleAnnouncementPosted = () => fetchAnnouncements();
    window.addEventListener('announcementPosted', handleAnnouncementPosted);
    return () => window.removeEventListener('announcementPosted', handleAnnouncementPosted);
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

  const handleAnnImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Invalid file format. Please upload JPEG, PNG, or WEBP image.', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Image must be 15 MB or smaller.', 'error');
      return;
    }

    if (annImagePreview) {
      URL.revokeObjectURL(annImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setAnnImagePreview(previewUrl);
    setAnnImageFile(file);
    setAnnUploadState({ status: 'compressing', text: 'Optimizing image...', data: null, error: null });

    // Instantly compress and pre-upload in background while user types post details
    const uploadPromise = (async () => {
      try {
        const compressed = await compressImage(file, { maxWidth: 1400, maxHeight: 1400, quality: 0.82 });
        setAnnUploadState(prev => ({
          ...prev,
          status: 'uploading',
          text: `Uploading in background (${formatFileSize(compressed.size)})...`
        }));

        const formData = new FormData();
        formData.append('file', compressed);
        const res = await client.post('/uploads/announcement', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success) {
          const uploadResult = {
            url: res.data.url,
            storage_ref: res.data.storage_ref,
            compressedSize: formatFileSize(compressed.size),
            originalSize: formatFileSize(file.size)
          };
          setAnnUploadState({
            status: 'ready',
            text: `Ready to post instantly (${formatFileSize(compressed.size)})`,
            data: uploadResult,
            error: null
          });
          return uploadResult;
        } else {
          throw new Error(res.data?.error || 'Upload failed');
        }
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message || 'Image upload failed';
        setAnnUploadState({ status: 'error', text: errMsg, data: null, error: errMsg });
        throw err;
      }
    })();

    annUploadPromiseRef.current = uploadPromise;
  };

  const handleRemoveAnnImage = () => {
    annUploadPromiseRef.current = null;
    setAnnImageFile(null);
    if (annImagePreview) {
      URL.revokeObjectURL(annImagePreview);
    }
    setAnnImagePreview(null);
    setAnnUploadState({ status: 'idle', text: '', data: null, error: null });
    const input = document.getElementById('news-photo-input');
    if (input) input.value = '';
  };

  const handlePostNewsSubmit = async (e) => {
    e.preventDefault();
    if (!notifyForm.title.trim() || !notifyForm.message.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }

    setNotifyLoading(true);
    let imageUrl = null;
    let imageStoragePath = null;

    try {
      if (annImageFile) {
        if (annUploadState.status === 'ready' && annUploadState.data) {
          // Image already finished uploading in background — INSTANT!
          imageUrl = annUploadState.data.url;
          imageStoragePath = annUploadState.data.storage_ref;
        } else if (annUploadState.status === 'error') {
          throw new Error(annUploadState.error || 'Image upload failed. Please re-select the image.');
        } else if (annUploadPromiseRef.current) {
          // Upload is still finalizing in background; wait for it
          setUploadingAnnImage(true);
          const uploadResult = await annUploadPromiseRef.current;
          imageUrl = uploadResult.url;
          imageStoragePath = uploadResult.storage_ref;
        }
      }

      const payload = {
        ...notifyForm,
        image_url: imageUrl,
        image_storage_path: imageStoragePath
      };

      const res = await client.post('/announcements', payload);
      if (res.data?.success) {
        showToast('Announcement posted successfully! 📢');
        setNotifyForm({ title: '', type: 'General', message: '', is_important: false, target: 'all', link: '', expires_at: '' });
        handleRemoveAnnImage();
        setShowPostForm(false);
        fetchAnnouncements();
        window.dispatchEvent(new Event('announcementPosted'));
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to post announcement.', 'error');
    } finally {
      setNotifyLoading(false);
      setUploadingAnnImage(false);
    }
  };

  const isLight = theme === 'light';

  // Filter announcements by category & search term
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesCategory = selectedCategory === 'All' || (ann.type || 'General').toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchTerm.trim() || 
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ann.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Pagination logic: 5 items per page
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
        {/* Toast Notification */}
        {toast && (
          <div className={`toast toast-${toast.type} animate-fadeIn`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, padding: '12px 20px', borderRadius: 10, color: '#fff', background: toast.type === 'error' ? '#ef4444' : '#22c55e', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontWeight: 700 }}>
            {toast.msg}
          </div>
        )}

        {/* Header with Quick Post News Bar Button */}
        <div className="admin-header animate-fadeInUp" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <Bell size={28} className="text-gradient" />
              <span className="text-gradient">Department News & Announcements</span>
            </h1>
            <p className="section-subtitle" style={{ marginTop: 4 }}>
              Sri Shakthi Institute of Engineering and Technology — CSE Department Directives & Opportunities
            </p>
          </div>

          {canPostNews && (
            <button
              className="btn btn-primary"
              onClick={() => setShowPostForm(!showPostForm)}
              style={{ padding: '10px 20px', borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {showPostForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showPostForm ? 'Close Post Form' : 'Post New Announcement 📢'}</span>
            </button>
          )}
        </div>

        {/* ── COLLAPSIBLE POST NEWS BAR FORM (FACULTY / ADMIN) ── */}
        {canPostNews && showPostForm && (
          <div className="card animate-fadeInUp" style={{ padding: '24px 28px', marginBottom: 28, background: 'var(--bg-card)', border: '1.5px solid var(--color-green)', borderRadius: 18, boxShadow: '0 12px 36px rgba(0,0,0,0.25)' }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Send size={20} color="var(--color-green)" /> Post Announcement to Department
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2, margin: 0 }}>
                  Broadcast official notices, hackathons, internships, or achievements to students and faculty.
                </p>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowPostForm(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostNewsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Announcement Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SIET CSE Hackathon 2026 Registrations Open"
                    value={notifyForm.title}
                    onChange={e => setNotifyForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', fontSize: 13 }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Category / Type *</label>
                  <select
                    className="form-select"
                    value={notifyForm.type}
                    onChange={e => setNotifyForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', fontSize: 13 }}
                  >
                    <option value="General">General</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Internship">Internship</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Course">Course</option>
                    <option value="Placement">Placement</option>
                    <option value="Event">Event</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Target Audience</label>
                  <select
                    className="form-select"
                    value={notifyForm.target}
                    onChange={e => setNotifyForm(prev => ({ ...prev, target: e.target.value }))}
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', fontSize: 13 }}
                  >
                    <option value="all">All Students & Faculty</option>
                    <option value="students">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="cse-a">CSE-A Only</option>
                    <option value="cse-b">CSE-B Only</option>
                    <option value="cse-c">CSE-C Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Action Link / URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={notifyForm.link}
                    onChange={e => setNotifyForm(prev => ({ ...prev, link: e.target.value }))}
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', fontSize: 13 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Expiry Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={notifyForm.expires_at}
                    onChange={e => setNotifyForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Announcement Message *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Write full announcement details, guidelines, or instructions here..."
                  value={notifyForm.message}
                  onChange={e => setNotifyForm(prev => ({ ...prev, message: e.target.value }))}
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', fontSize: 13, resize: 'vertical' }}
                  required
                />
              </div>

              {/* Photo / Poster Upload Attachment */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={15} color="var(--color-green)" /> Attach Photo / Poster (Optional)
                </label>

                {!annImagePreview ? (
                  <div
                    style={{
                      border: '2px dashed var(--border-strong)',
                      borderRadius: 12,
                      padding: '16px',
                      textAlign: 'center',
                      background: 'var(--bg-input)',
                      cursor: 'pointer',
                      transition: 'all 200ms ease'
                    }}
                    onClick={() => document.getElementById('news-photo-input')?.click()}
                  >
                    <input
                      id="news-photo-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAnnImageChange}
                      style={{ display: 'none' }}
                    />
                    <Upload size={22} style={{ color: 'var(--color-green)', marginBottom: 6 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>Click to upload poster or photo</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>JPEG, PNG, or WEBP (Auto-optimized for instant posting)</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-input)', border: '1px solid var(--border)', padding: 10, borderRadius: 12 }}>
                    <img
                      src={annImagePreview}
                      alt="Announcement Preview"
                      style={{ width: 70, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-strong)' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {annImageFile?.name || 'Attached Image'}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 3 }}>
                        {annUploadState.status === 'compressing' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent, #3b82f6)' }}>
                            <RefreshCw size={11} className="spin" /> Optimizing image...
                          </span>
                        )}
                        {annUploadState.status === 'uploading' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f59e0b' }}>
                            <RefreshCw size={11} className="spin" /> {annUploadState.text}
                          </span>
                        )}
                        {annUploadState.status === 'ready' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#10b981', fontWeight: 600 }}>
                            <CheckCircle size={12} /> Ready to post instantly ({annUploadState.data?.compressedSize})
                          </span>
                        )}
                        {annUploadState.status === 'error' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#ef4444' }}>
                            <AlertCircle size={11} /> {annUploadState.error}
                          </span>
                        )}
                        {annUploadState.status === 'idle' && (
                          <span style={{ color: 'var(--color-text-faint)' }}>
                            {annImageFile ? formatFileSize(annImageFile.size) : 'Ready to post'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleRemoveAnnImage}
                      style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <X size={15} /> Remove
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                <label className="checkbox-group" style={{ cursor: 'pointer', margin: 0, fontSize: 12.5 }}>
                  <input
                    type="checkbox"
                    className="checkbox-custom"
                    checked={notifyForm.is_important}
                    onChange={e => setNotifyForm(prev => ({ ...prev, is_important: e.target.checked }))}
                  />
                  <span style={{ fontWeight: 700, color: notifyForm.is_important ? '#ef4444' : 'var(--color-text)' }}>
                    Mark as IMPORTANT (Red Highlighted Banner)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={notifyLoading || uploadingAnnImage}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
                >
                  <Send size={15} /> {uploadingAnnImage ? 'Finalizing Image...' : notifyLoading ? 'Broadcasting...' : 'Post News & Notify'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="card animate-fadeInUp delay-1" style={{ padding: '16px 20px', marginBottom: 24, maxWidth: 860, marginInline: 'auto' }}>
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

        {/* Error State */}
        {errorMsg ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 860, marginInline: 'auto', border: '1px solid #ef4444' }}>
            <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 12 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', margin: 0 }}>Unable to load announcements</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 6, marginBottom: 16 }}>{errorMsg}</p>
            <button className="btn btn-secondary btn-sm" onClick={fetchAnnouncements} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860, marginInline: 'auto' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ height: 260, padding: 20 }}>
                <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 10 }}></div>
              </div>
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 860, marginInline: 'auto' }}>
            <Bell size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 12, opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>No news announcements available yet.</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 6, marginBottom: 0 }}>
              {searchTerm || selectedCategory !== 'All' ? 'Try adjusting your search or category filter.' : 'Check back later for new notices.'}
            </p>
          </div>
        ) : (
          <>
            {/* Compact Announcement Feed List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', alignItems: 'center' }}>
              {paginatedAnnouncements.map((ann, i) => {
                const isImportant = Boolean(ann.is_important);

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
                      animationDelay: `${i * 0.04}s`,
                      transition: 'transform 250ms ease, box-shadow 250ms ease, background-color 450ms ease, border-color 450ms ease'
                    }}
                  >
                    {/* Left Side: Image Banner */}
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

                    {/* Right Side: Content Body */}
                    <div className="announcement-compact-content">
                      <div>
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
                                : 'var(--green-100)',
                              color: isImportant
                                ? '#ef4444'
                                : 'var(--color-green)',
                              border: `1px solid ${isImportant ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-strong)'}`
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

                        <h3
                          className="announcement-compact-title"
                          style={{ color: titleColor }}
                          onClick={() => setActiveDetailModal(ann)}
                        >
                          {ann.title}
                        </h3>

                        <p
                          className="announcement-compact-message"
                          style={{ color: bodyColor }}
                          onClick={() => setActiveDetailModal(ann)}
                        >
                          {ann.message}
                        </p>
                      </div>

                      {/* Footer */}
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

                          {Boolean(isHOD || user?.role === 'admin' || (user && (user.id === ann.created_by || user.id === ann.author_id))) && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              style={{ color: '#ef4444', fontSize: 12, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setDeleteTarget(ann)}
                              title="Delete Announcement"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handlePrev}
                  disabled={currentPage === 1}
                  style={{ opacity: currentPage === 1 ? 0.4 : 1, padding: '8px 16px' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                  Page {currentPage} of {totalPages} ({filteredAnnouncements.length} total)
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  style={{ opacity: currentPage === totalPages ? 0.4 : 1, padding: '8px 16px' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
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
                      background: activeDetailModal.is_important ? 'rgba(239, 68, 68, 0.18)' : 'var(--green-100)',
                      color: activeDetailModal.is_important ? '#ef4444' : 'var(--color-green)',
                      border: `1px solid ${activeDetailModal.is_important ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-strong)'}`
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

        {/* Lightbox Modal */}
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
        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(6px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: 420,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} /> Confirm Delete
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>? This will remove it from all student and department feeds.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteAnnouncement}
                  style={{ padding: '8px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .announcement-compact-card {
          width: min(860px, calc(100% - 32px));
          max-width: 860px;
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
    </div>
  );
}
