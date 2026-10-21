import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { compressImage, formatFileSize } from '../utils/imageCompressor';
import { 
  Laptop, Plus, Edit3, Trash2, ExternalLink, RefreshCw, AlertCircle, 
  Check, X, Search, Eye, EyeOff, Calendar, User, ArrowLeft,
  Send, Upload, Flame, Clock, Maximize2, Globe, Bell, Briefcase, 
  Trophy, BookOpen, TrendingUp, Award, Download, Image as ImageIcon,
  Sparkles, Filter, Link2
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Achievement', label: 'Achievement / Win', icon: Trophy, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  { id: 'Hackathon', label: 'Hackathon & Contest', icon: Award, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
  { id: 'Internship', label: 'Internship & Job', icon: Briefcase, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  { id: 'Project', label: 'Technical Project', icon: Laptop, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  { id: 'Research', label: 'Research & Paper', icon: Globe, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
  { id: 'Innovation', label: 'Innovation & Build', icon: Flame, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  { id: 'Course', label: 'Course & Cert', icon: BookOpen, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
  { id: 'Placement', label: 'Placement Update', icon: TrendingUp, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)' },
  { id: 'Event', label: 'Department Event', icon: Calendar, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)' },
  { id: 'General', label: 'General Broadcast', icon: Bell, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' }
];

const getCategoryMeta = (type) => {
  const found = CATEGORIES.find(c => c.id.toLowerCase() === (type || '').toLowerCase());
  return found || { id: type || 'General', label: type || 'General', icon: Bell, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' };
};

export default function ShowcaseManage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = Boolean(
    user && (
      user.role === 'admin' || 
      user.is_admin === true || 
      user.is_hod === true || 
      user.designation?.toUpperCase()?.includes('HOD') || 
      user.designation?.toUpperCase() === 'HEAD OF DEPARTMENT'
    )
  );
  const isHOD = isAdmin;

  // Posts State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterMyOnly, setFilterMyOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Broadcast Creator Form State (Hero Top Card)
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    category: 'Achievement',
    project_url: '',
    expires_at: '',
    is_important: false,
    cover_image_url: '',
    image_storage_path: null
  });

  const [imageMode, setImageMode] = useState('file'); // 'file' or 'url'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadState, setUploadState] = useState({ status: 'idle', text: '', data: null, error: null });
  const [isUploading, setIsUploading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const uploadPromiseRef = useRef(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editFormSubmitting, setEditFormSubmitting] = useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fullscreen Lightbox Modal State
  const [previewModal, setPreviewModal] = useState(null);

  // Fetch all showcase posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await client.get('/showcase?all=true');
      if (res.data?.success) {
        setPosts(res.data.posts || []);
      } else {
        setErrorMsg('Failed to load posts from server.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Unable to connect to showcase service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle Image File Selection with Instant Background Compression & Upload
  const handleImageFileChange = async (e) => {
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

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);
    setUploadState({ status: 'compressing', text: 'Optimizing image…', data: null, error: null });

    // Instantly compress and pre-upload in background while user types
    const uploadPromise = (async () => {
      try {
        const compressed = await compressImage(file, { maxWidth: 1400, maxHeight: 1400, quality: 0.82 });
        setUploadState(prev => ({
          ...prev,
          status: 'uploading',
          text: `Uploading in background (${formatFileSize(compressed.size)})…`
        }));

        const formData = new FormData();
        formData.append('file', compressed);

        // Upload to department posts storage
        const res = await client.post('/uploads/showcase', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success && res.data.url) {
          const uploadResult = {
            url: res.data.url,
            storage_ref: res.data.storage_ref || null,
            compressedSize: formatFileSize(compressed.size),
            originalSize: formatFileSize(file.size)
          };
          setUploadState({
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
        setUploadState({ status: 'error', text: errMsg, data: null, error: errMsg });
        throw err;
      }
    })();

    uploadPromiseRef.current = uploadPromise;
  };

  const handleRemoveImage = () => {
    uploadPromiseRef.current = null;
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setUploadState({ status: 'idle', text: '', data: null, error: null });
    setPostForm(prev => ({ ...prev, cover_image_url: '', image_storage_path: null }));
    const input = document.getElementById('cms-photo-input');
    if (input) input.value = '';
  };

  // Dual-Publish Post: Posts to BOTH /api/showcase AND /api/announcements
  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) {
      showToast('Please enter a headline / title.', 'error');
      return;
    }
    if (!postForm.description.trim()) {
      showToast('Please enter details or description.', 'error');
      return;
    }

    setIsBroadcasting(true);
    let finalImageUrl = postForm.cover_image_url?.trim() || null;
    let finalStoragePath = postForm.image_storage_path || null;

    try {
      if (imageFile) {
        if (uploadState.status === 'ready' && uploadState.data) {
          finalImageUrl = uploadState.data.url;
          finalStoragePath = uploadState.data.storage_ref;
        } else if (uploadState.status === 'error') {
          throw new Error(uploadState.error || 'Image upload failed. Please re-select the image.');
        } else if (uploadPromiseRef.current) {
          setIsUploading(true);
          const uploadResult = await uploadPromiseRef.current;
          finalImageUrl = uploadResult.url;
          finalStoragePath = uploadResult.storage_ref;
        }
      }

      // 1. Post to Showcase API (/api/showcase)
      const showcasePayload = {
        title: postForm.title.trim(),
        description: postForm.description.trim(),
        category: postForm.category,
        project_url: postForm.project_url?.trim() || null,
        cover_image_url: finalImageUrl,
        image_storage_path: finalStoragePath,
        published: true,
        is_featured: Boolean(postForm.is_important)
      };

      // 2. Post to Portal Announcements API (/api/announcements)
      // Note: Target Audience is completely removed from UI and set to 'all' department-wide!
      const announcementPayload = {
        title: postForm.title.trim(),
        message: postForm.description.trim(),
        type: postForm.category || 'General',
        is_important: Boolean(postForm.is_important),
        link: postForm.project_url?.trim() || null,
        target: 'all', // Automated department-wide broadcast
        image_url: finalImageUrl,
        image_storage_path: finalStoragePath,
        expires_at: postForm.expires_at || null
      };

      const [showcaseRes, annRes] = await Promise.allSettled([
        client.post('/showcase', showcasePayload),
        client.post('/announcements', announcementPayload)
      ]);

      const isShowcaseOk = showcaseRes.status === 'fulfilled' && showcaseRes.value?.data?.success;
      const isAnnOk = annRes.status === 'fulfilled' && annRes.value?.data?.success;

      if (isShowcaseOk && isAnnOk) {
        showToast('Broadcasted successfully to Showcase & Student Portals! 🚀');
      } else if (isShowcaseOk) {
        showToast('Published to Showcase successfully! 📢');
      } else if (isAnnOk) {
        showToast('Broadcasted to Student Announcements successfully! 📢');
      } else {
        const errMsg = showcaseRes.reason?.response?.data?.error || annRes.reason?.response?.data?.error || 'Failed to broadcast post.';
        throw new Error(errMsg);
      }

      // Reset Form
      setPostForm({
        title: '',
        description: '',
        category: 'Achievement',
        project_url: '',
        expires_at: '',
        is_important: false,
        cover_image_url: '',
        image_storage_path: null
      });
      handleRemoveImage();
      fetchPosts();
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to broadcast post.', 'error');
    } finally {
      setIsBroadcasting(false);
      setIsUploading(false);
    }
  };

  // Toggle Publish / Unpublish on Showcase
  const handleTogglePublish = async (post) => {
    try {
      const updatedStatus = !post.published;
      const res = await client.put(`/showcase/${post.id}`, { published: updatedStatus });
      if (res.data?.success) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: updatedStatus } : p));
        showToast(updatedStatus ? 'Post published to public showcase.' : 'Post unpublished (moved to draft).');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update publication status.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setEditModalOpen(true);
  };

  // Save Post Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost?.title?.trim()) {
      showToast('Title is required.', 'error');
      return;
    }
    if (!editingPost?.description?.trim()) {
      showToast('Description is required.', 'error');
      return;
    }

    setEditFormSubmitting(true);
    try {
      const res = await client.put(`/showcase/${editingPost.id}`, {
        title: editingPost.title.trim(),
        description: editingPost.description.trim(),
        category: editingPost.category || 'Project',
        project_url: editingPost.project_url?.trim() || null,
        cover_image_url: editingPost.cover_image_url || editingPost.image_url || null,
        image_storage_path: editingPost.image_storage_path || null,
        published: editingPost.published !== false,
        is_featured: Boolean(editingPost.is_featured)
      });

      if (res.data?.success) {
        showToast('Showcase post updated successfully!');
        setEditModalOpen(false);
        setEditingPost(null);
        fetchPosts();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update showcase post.', 'error');
    } finally {
      setEditFormSubmitting(false);
    }
  };

  // Delete Post (HOD / Admin Only)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const res = await client.delete(`/showcase/${deleteTarget.id}`);
      if (res.data?.success) {
        setPosts(prev => prev.filter(p => p.id !== deleteTarget.id));
        showToast('Post deleted successfully.');
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete post.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Filtered Posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || 
      (post.category || 'project').toLowerCase() === selectedCategory.toLowerCase();
    const matchesMy = !filterMyOnly || (user && post.author_id === user.id);
    const matchesSearch = !searchTerm.trim() || 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesMy && matchesSearch;
  });

  return (
    <div className="page-content" style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="container" style={{ maxWidth: 1100 }}>
        {/* Toast Notification */}
        {toast && (
          <div 
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              zIndex: 9999,
              padding: '12px 20px',
              borderRadius: 12,
              background: toast.type === 'error' ? '#ef4444' : '#10b981',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Database Error Banner */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ef4444', fontSize: 13.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPosts}>Retry</button>
          </div>
        )}

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Link to="/showcase" className="btn btn-ghost btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12 }}>
                <ArrowLeft size={13} /> View Public Showcase
              </Link>
              <span className="badge badge-green" style={{ fontSize: 11 }}>Broadcast CMS</span>
            </div>
            <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Laptop size={26} color="var(--color-green)" />
              <span>Broadcast & Showcase CMS</span>
            </h1>
            <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
              Publish department announcements, student hackathon wins, technical builds, and research highlights to student portals and the public showcase.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchPosts}
              title="Refresh posts from database"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <a
              href="#broadcast-creator-card"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px' }}
            >
              <Send size={15} />
              <span>New Broadcast</span>
            </a>
          </div>
        </div>

        {/* ── BROADCAST CREATOR CARD (ADMIN POST & NOTIFY STYLING & EFFECTS) ── */}
        <div
          id="broadcast-creator-card"
          className="card animate-fadeIn"
          style={{
            padding: '32px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 36
          }}
        >
          {/* Decorative Gradient Accent Strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, var(--accent-primary, #10b981), #3b82f6, #f59e0b)'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary, #10b981)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
                }}
              >
                <Send size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.02em' }}>
                  Department Broadcast & Showcase Creator
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--accent-primary, #10b981)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    Dual-Channel Publishing
                  </span>
                </h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  Broadcast simultaneously to student dashboards (/news) and the public department showcase (/showcase).
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleBroadcastSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Category Selector Chips with Themes & Icons */}
            <div>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 10, display: 'block' }}>
                Broadcast Category *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(cat => {
                  const isSelected = (postForm.category || '').toLowerCase() === cat.id.toLowerCase();
                  const IconComp = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPostForm(prev => ({ ...prev, category: cat.id }))}
                      className="btn btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: isSelected ? 800 : 600,
                        background: isSelected ? cat.color : 'var(--bg-input)',
                        color: isSelected ? '#ffffff' : 'var(--color-text)',
                        border: isSelected ? `1.5px solid ${cat.color}` : '1px solid var(--border)',
                        boxShadow: isSelected ? `0 4px 14px ${cat.color}40` : 'none',
                        transition: 'all 0.18s ease',
                        cursor: 'pointer'
                      }}
                    >
                      <IconComp size={15} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / Headline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: 0 }}>
                  Announcement Headline / Project Title *
                </label>
                <span style={{ fontSize: 11, color: postForm.title.length > 100 ? '#ef4444' : 'var(--color-text-faint)' }}>
                  {postForm.title.length}/120 characters
                </span>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 🎉 SIET CSE Team Secures 1st Prize at Smart India Hackathon 2026!"
                value={postForm.title}
                maxLength={120}
                onChange={e => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                required
                style={{
                  height: 46,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border)'
                }}
              />
            </div>

            {/* Description / Content Body */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: 0 }}>
                  Full Announcement / Project Details *
                </label>
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Markdown & multiline supported</span>
              </div>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Provide complete details: objectives, student winners, technologies used, instructions, or links..."
                value={postForm.description}
                onChange={e => setPostForm(prev => ({ ...prev, description: e.target.value }))}
                required
                style={{
                  borderRadius: 10,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Poster Upload with Background Compression & Instant Preview */}
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background: 'var(--bg-primary)',
                border: '1px dashed var(--border-strong)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={18} color="var(--accent-primary, #10b981)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    Attach Poster / Flyer / Screenshot (Optional)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-xs ${imageMode === 'file' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setImageMode('file')}
                    style={{ fontSize: 11, borderRadius: 6 }}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${imageMode === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setImageMode('url')}
                    style={{ fontSize: 11, borderRadius: 6 }}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              {imageMode === 'file' ? (
                <>
                  {imagePreview ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 140,
                          height: 100,
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          background: '#000'
                        }}
                      >
                        <img
                          src={imagePreview}
                          alt="Upload Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'rgba(0, 0, 0, 0.75)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Remove Image"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {uploadState.status === 'compressing' || uploadState.status === 'uploading' ? (
                            <RefreshCw size={14} className="spin" color="var(--accent-primary, #10b981)" />
                          ) : uploadState.status === 'ready' ? (
                            <Check size={14} color="#10b981" />
                          ) : uploadState.status === 'error' ? (
                            <AlertCircle size={14} color="#ef4444" />
                          ) : null}
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: uploadState.status === 'error' ? '#ef4444' : 'var(--color-text)'
                            }}
                          >
                            {uploadState.text || 'Image attached'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="btn btn-ghost btn-xs"
                          style={{ alignSelf: 'flex-start', color: 'var(--color-red)', padding: 0 }}
                        >
                          Remove & choose another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label
                        htmlFor="cms-photo-input"
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          fontWeight: 600,
                          borderRadius: 8
                        }}
                      >
                        <Upload size={14} /> Choose Image
                      </label>
                      <input
                        type="file"
                        id="cms-photo-input"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageFileChange}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                        JPEG, PNG, or WEBP. Auto-compressed for fast loading (Max 15MB).
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <ImageIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/... or public image link"
                    value={postForm.cover_image_url}
                    onChange={e => setPostForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                    style={{
                      paddingLeft: 34,
                      height: 42,
                      fontSize: 13,
                      borderRadius: 8,
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Metadata Grid (External Link & Expiry Date) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {/* External Link */}
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 8, display: 'block' }}>
                  Attachment / Project / Action URL (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <ExternalLink size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://github.com/... or Google Form / Registration link"
                    value={postForm.project_url}
                    onChange={e => setPostForm(prev => ({ ...prev, project_url: e.target.value }))}
                    style={{
                      paddingLeft: 34,
                      height: 42,
                      fontSize: 13,
                      borderRadius: 8,
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border)'
                    }}
                  />
                </div>
              </div>

              {/* Expiration Date */}
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 8, display: 'block' }}>
                  Auto-Expire On (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
                  <input
                    type="date"
                    className="form-input"
                    value={postForm.expires_at}
                    onChange={e => setPostForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    style={{
                      paddingLeft: 34,
                      height: 42,
                      fontSize: 13,
                      borderRadius: 8,
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Urgent / High-Priority / Featured Switch */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: postForm.is_important ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-primary)',
                border: `1px solid ${postForm.is_important ? 'rgba(245, 158, 11, 0.35)' : 'var(--border)'}`,
                borderRadius: 12,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={20} color={postForm.is_important ? '#f59e0b' : 'var(--color-text-faint)'} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: postForm.is_important ? '#f59e0b' : 'var(--color-text)' }}>
                    Flag as Urgent & Feature on Showcase
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Highlights with an amber banner on student dashboards and places at the top of the Showcase feed.
                  </div>
                </div>
              </div>
              <label className="switch" style={{ margin: 0, position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                <input
                  type="checkbox"
                  checked={postForm.is_important}
                  onChange={e => setPostForm(prev => ({ ...prev, is_important: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: postForm.is_important ? '#f59e0b' : 'var(--border-strong)',
                    borderRadius: 24,
                    transition: '0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: 18,
                      width: 18,
                      left: postForm.is_important ? 23 : 3,
                      bottom: 3,
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => {
                  setPostForm({
                    title: '',
                    description: '',
                    category: 'Achievement',
                    project_url: '',
                    expires_at: '',
                    is_important: false,
                    cover_image_url: '',
                    image_storage_path: null
                  });
                  handleRemoveImage();
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 13 }}
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isBroadcasting || isUploading}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--accent-primary, #10b981), #059669)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                {isBroadcasting || isUploading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>{isUploading ? 'Finalizing Image…' : 'Broadcasting…'}</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Broadcast to Showcase & Portals</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── MANAGE SHOWCASE & BROADCASTS FEED ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Live Department Posts & Showcase
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'var(--accent-soft-2)',
                    color: 'var(--accent-primary, #10b981)',
                    padding: '2px 10px',
                    borderRadius: 20,
                    border: '1px solid var(--border-strong)'
                  }}
                >
                  {filteredPosts.length}
                </span>
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                Review live posts, unpublish drafts, edit contents, and inspect high-fidelity uncropped poster flyers.
              </p>
            </div>

            {/* Filter pills & search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
                <input
                  type="text"
                  placeholder="Filter by title or author…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{
                    paddingLeft: 30,
                    height: 36,
                    fontSize: 12.5,
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    borderColor: 'var(--border)'
                  }}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="form-select"
                style={{
                  height: 36,
                  fontSize: 12.5,
                  borderRadius: 8,
                  paddingInline: 10,
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>

              <button
                type="button"
                className={`btn btn-xs ${filterMyOnly ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterMyOnly(!filterMyOnly)}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, fontWeight: filterMyOnly ? 800 : 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <User size={13} /> My Posts
              </button>
            </div>
          </div>
        </div>

        {/* Posts Stream */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
            <div>Loading live showcase and broadcast records…</div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="card" style={{ padding: 56, textAlign: 'center', border: '1px dashed var(--border)' }}>
            <Laptop size={44} style={{ color: 'var(--color-text-muted)', marginBottom: 14, opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: 'var(--color-text)' }}>
              {posts.length === 0 ? 'No posts broadcasted yet' : 'No posts match your filters'}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, margin: '0 0 20px', maxWidth: 440, marginInline: 'auto' }}>
              {posts.length === 0 
                ? 'Use the broadcast creator above to publish your first announcement or technical showcase item.'
                : 'Try adjusting your search query, category filter, or "My Posts" toggle.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredPosts.map(post => {
              const catMeta = getCategoryMeta(post.category);
              const IconComp = catMeta.icon;
              const isAuthor = Boolean(user && user.id === post.author_id);
              const canEdit = Boolean(isAuthor || isHOD);
              const canDelete = Boolean(isHOD);
              const isPublished = post.published !== false;
              const postImageUrl = post.cover_image_url || post.image_url;

              return (
                <div
                  key={post.id}
                  className="card animate-fadeIn"
                  style={{
                    padding: '24px 28px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    position: 'relative',
                    borderLeft: `5px solid ${catMeta.color}`,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Top Bar: Category, Priority, Publication Status, and Actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: catMeta.bg,
                          color: catMeta.color,
                          border: `1px solid ${catMeta.border}`
                        }}
                      >
                        <IconComp size={13} />
                        {catMeta.label}
                      </span>

                      {(post.is_featured || post.is_important) && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}
                        >
                          <Flame size={12} /> IMPORTANT / FEATURED
                        </span>
                      )}

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: isPublished ? '#10b981' : '#f59e0b'
                        }}
                      >
                        {isPublished ? <Eye size={11} /> : <EyeOff size={11} />}
                        <span>{isPublished ? 'Live on Showcase' : 'Draft / Unpublished'}</span>
                      </span>

                      {isAuthor && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                          You
                        </span>
                      )}
                    </div>

                    {/* Quick Card Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleTogglePublish(post)}
                          title={isPublished ? 'Unpublish from public view' : 'Publish to Showcase'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12 }}
                        >
                          {isPublished ? <EyeOff size={13} color="#f59e0b" /> : <Eye size={13} color="#10b981" />}
                          <span>{isPublished ? 'Unpublish' : 'Publish'}</span>
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleOpenEdit(post)}
                          title="Edit Post"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12 }}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(post)}
                          className="btn btn-ghost btn-xs"
                          title="Delete this post (HOD Only)"
                          style={{ color: 'var(--color-red)', padding: '5px 10px', fontSize: 12 }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', margin: '14px 0 8px', letterSpacing: '-0.01em' }}>
                    {post.title}
                  </h4>

                  {/* Description / Content Body */}
                  <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
                    {post.description}
                  </p>

                  {/* Full Fidelity Poster Display Frame (Uncropped Contain Mode with Lightbox) */}
                  {postImageUrl && (
                    <div
                      style={{
                        marginTop: 16,
                        marginBottom: 16,
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        background: 'rgba(0, 0, 0, 0.45)',
                        position: 'relative',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        maxHeight: 520
                      }}
                      onClick={() => setPreviewModal(post)}
                      title="Click to expand poster in full view"
                    >
                      <img
                        src={postImageUrl}
                        alt={post.title}
                        style={{
                          width: '100%',
                          maxHeight: 520,
                          objectFit: 'contain',
                          display: 'block'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          right: 12,
                          background: 'rgba(0, 0, 0, 0.75)',
                          color: '#ffffff',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <Maximize2 size={13} /> Click to expand
                      </div>
                    </div>
                  )}

                  {/* Attached Link */}
                  {post.project_url && (
                    <div style={{ marginTop: 12 }}>
                      <a
                        href={post.project_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-ghost"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          borderRadius: 8,
                          border: '1px solid var(--border-strong)',
                          color: 'var(--accent-text, var(--color-green))',
                          fontWeight: 700,
                          fontSize: 12.5,
                          padding: '7px 14px'
                        }}
                      >
                        <ExternalLink size={13} /> Visit Attached Link / Repo
                      </a>
                    </div>
                  )}

                  {/* Footer Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                      fontSize: 12,
                      color: 'var(--color-text-faint)'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <User size={13} /> Author: <strong style={{ color: 'var(--color-text)' }}>{post.author_name || 'Faculty Member'}</strong> {post.author_designation ? `(${post.author_designation})` : ''}
                    </span>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} /> Posted: {new Date(post.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {post.expires_at && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f59e0b' }}>
                        <Calendar size={12} /> Valid Until: {new Date(post.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── FULLSCREEN LIGHTBOX PREVIEW MODAL ─── */}
      {previewModal && (
        <div 
          className="modal-backdrop" 
          onClick={() => setPreviewModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div 
            className="card animate-scaleUp"
            style={{
              maxWidth: 960,
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 22px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                <span className="badge badge-green" style={{ fontSize: 11, marginBottom: 4 }}>
                  {previewModal.category || 'Department Poster'}
                </span>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewModal.title}
                </h4>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPreviewModal(null)}
                style={{ borderRadius: '50%', width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close Lightbox"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxHeight: '75vh',
              overflow: 'auto',
              padding: 20
            }}>
              <img
                src={previewModal.cover_image_url || previewModal.image_url}
                alt={previewModal.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 10,
                  boxShadow: '0 10px 35px rgba(0,0,0,0.45)'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 22px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-input)'
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-faint)' }}>
                Author: {previewModal.author_name || 'Faculty'}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={previewModal.cover_image_url || previewModal.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <Download size={14} /> Open Original
                </a>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setPreviewModal(null)}
                  style={{ fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL ─── */}
      {editModalOpen && editingPost && (
        <div 
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setEditModalOpen(false); }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 560, borderRadius: 16, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                <Edit3 size={20} color="var(--color-green)" />
                <span>Edit Showcase Post</span>
              </h3>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPost.title || ''}
                  onChange={e => setEditingPost(prev => ({ ...prev, title: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Category *</label>
                  <select
                    className="form-select"
                    value={editingPost.category || 'Achievement'}
                    onChange={e => setEditingPost(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Publication Status</label>
                  <label className="checkbox-group" style={{ cursor: 'pointer', height: 38, display: 'flex', alignItems: 'center', margin: 0 }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={editingPost.published !== false}
                      onChange={e => setEditingPost(prev => ({ ...prev, published: e.target.checked }))}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: editingPost.published !== false ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                      {editingPost.published !== false ? 'Published (Live)' : 'Save as Draft'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Description *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={editingPost.description || ''}
                  onChange={e => setEditingPost(prev => ({ ...prev, description: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Image URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={editingPost.cover_image_url || editingPost.image_url || ''}
                  onChange={e => setEditingPost(prev => ({ ...prev, cover_image_url: e.target.value, image_url: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Project / Repository URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/..."
                  value={editingPost.project_url || ''}
                  onChange={e => setEditingPost(prev => ({ ...prev, project_url: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px' }}
                >
                  {editFormSubmitting ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL (HOD / ADMIN ONLY) ─── */}
      {deleteTarget && (
        <div 
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 440, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>Confirm Deletion</h3>
                <span style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 700 }}>HOD Permission Enforced</span>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                className="btn btn-danger btn-sm"
                onClick={handleDeleteConfirm}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {deleteSubmitting ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />}
                <span>Yes, Delete Post</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
