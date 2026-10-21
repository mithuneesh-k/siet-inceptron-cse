import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { 
  Laptop, Plus, Edit3, Trash2, ExternalLink, RefreshCw, AlertCircle, 
  Check, X, Search, Eye, EyeOff, Tag, Calendar, User, ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import ShowcaseImageInput from '../components/ShowcaseImageInput';

const CATEGORIES = ['All', 'Project', 'Achievement', 'Research', 'Innovation', 'Internship'];

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

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterMyOnly, setFilterMyOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    category: 'Project',
    project_url: '',
    cover_image_url: '',
    image_storage_path: null,
    published: true
  });

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all posts (including drafts/unpublished) for staff
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await client.get('/showcase?all=true');
      if (res.data?.success) {
        setPosts(res.data.posts || []);
      } else {
        setErrorMsg('Failed to load showcase posts from server.');
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

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingPost(null);
    setPostForm({
      title: '',
      description: '',
      category: 'Project',
      project_url: '',
      cover_image_url: '',
      image_storage_path: null,
      published: true
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || '',
      description: post.description || '',
      category: post.category || 'Project',
      project_url: post.project_url || '',
      cover_image_url: post.cover_image_url || post.image_url || '',
      image_storage_path: post.image_storage_path || null,
      published: post.published !== false
    });
    setModalOpen(true);
  };

  // Save Post (Create / Update)
  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) {
      showToast('Please enter a post title.', 'error');
      return;
    }
    if (!postForm.description.trim()) {
      showToast('Please enter a post description.', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingPost) {
        const res = await client.put(`/showcase/${editingPost.id}`, postForm);
        if (res.data?.success) {
          showToast('Showcase post updated successfully!');
          setModalOpen(false);
          fetchPosts();
        }
      } else {
        const res = await client.post('/showcase', postForm);
        if (res.data?.success) {
          showToast('Showcase post created successfully!');
          setModalOpen(false);
          fetchPosts();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save showcase post.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Publish / Unpublish
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

  // Delete Post (HOD Only)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const res = await client.delete(`/showcase/${deleteTarget.id}`);
      if (res.data?.success) {
        setPosts(prev => prev.filter(p => p.id !== deleteTarget.id));
        showToast('Showcase post deleted successfully.');
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete showcase post.', 'error');
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

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Link to="/showcase" className="btn btn-ghost btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12 }}>
                <ArrowLeft size={13} /> View Public Showcase
              </Link>
              <span className="badge badge-green" style={{ fontSize: 11 }}>CMS Management</span>
            </div>
            <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Laptop size={26} color="var(--color-green)" />
              <span>Manage Department Showcase</span>
            </h1>
            <p className="section-subtitle" style={{ margin: '4px 0 0' }}>
              Create, edit, publish, and manage student technical projects, hackathon victories, and research highlights.
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
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px' }}
            >
              <Plus size={16} />
              <span>Add Showcase Post</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          {/* Category Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`btn btn-xs ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, fontWeight: selectedCategory === cat ? 800 : 600 }}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-xs ${filterMyOnly ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterMyOnly(!filterMyOnly)}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, fontWeight: filterMyOnly ? 800 : 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <User size={12} /> My Posts Only
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search posts or author…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12.5, height: 34, width: '100%' }}
            />
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
            <div>Loading showcase management records…</div>
          </div>
        ) : errorMsg ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', border: '1px solid #ef4444' }}>
            <AlertCircle size={38} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', margin: '0 0 6px' }}>Failed to Load Showcase Posts</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 16px' }}>{errorMsg}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPosts} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="card" style={{ padding: 56, textAlign: 'center', border: '1px dashed var(--border)' }}>
            <Laptop size={44} style={{ color: 'var(--color-text-muted)', marginBottom: 14, opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: 'var(--color-text)' }}>
              {posts.length === 0 ? 'No showcase posts in database yet' : 'No posts match your filters'}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, margin: '0 0 20px', maxWidth: 440, marginInline: 'auto' }}>
              {posts.length === 0 
                ? 'Create the first department showcase post to display projects, research highlights, and achievements on the portal.'
                : 'Try adjusting your search query, category filter, or "My Posts" toggle.'}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} /> Add First Showcase Post
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredPosts.map(post => {
              const isAuthor = Boolean(user && user.id === post.author_id);
              const canEdit = Boolean(isAuthor || isHOD);
              const canDelete = Boolean(isHOD);
              const isPublished = post.published !== false;

              return (
                <div 
                  key={post.id}
                  className="card"
                  style={{
                    padding: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    borderLeft: `4px solid ${isPublished ? 'var(--color-green)' : '#f59e0b'}`
                  }}
                >
                  {/* Left: Thumbnail & Post Details */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 280 }}>
                    {post.cover_image_url ? (
                      <div style={{ width: 90, height: 68, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                        <img 
                          src={post.cover_image_url} 
                          alt={post.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: 90, height: 68, borderRadius: 10, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)', color: 'var(--color-text-muted)' }}>
                        <Laptop size={24} opacity={0.6} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className="badge badge-green" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                          {post.category || 'Project'}
                        </span>
                        
                        <span 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            fontSize: 11, 
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: isPublished ? '#10b981' : '#f59e0b'
                          }}
                        >
                          {isPublished ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{isPublished ? 'Published' : 'Draft / Unpublished'}</span>
                        </span>

                        {isAuthor && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            You
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 6px 0' }}>
                        {post.title}
                      </h4>

                      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                        {post.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: 'var(--color-text-faint)', flexWrap: 'wrap' }}>
                        <span>Author: <strong style={{ color: 'var(--color-text)' }}>{post.author_name || 'Faculty Member'}</strong> {post.author_designation ? `(${post.author_designation})` : ''}</span>
                        {post.created_at && (
                          <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                        )}
                        {post.project_url && (
                          <a 
                            href={post.project_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--color-green)', textDecoration: 'none', fontWeight: 600 }}
                          >
                            <ExternalLink size={11} /> Link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Toggle Published Button */}
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleTogglePublish(post)}
                        title={isPublished ? 'Unpublish (Hide from public view)' : 'Publish to Showcase'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12 }}
                      >
                        {isPublished ? <EyeOff size={13} color="#f59e0b" /> : <Eye size={13} color="#10b981" />}
                        <span>{isPublished ? 'Unpublish' : 'Publish'}</span>
                      </button>
                    )}

                    {/* Edit Button */}
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

                    {/* Delete Button (HOD Only) */}
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setDeleteTarget(post)}
                        title="Delete Post (HOD Only)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD / EDIT MODAL ─── */}
      {modalOpen && (
        <div 
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 540, borderRadius: 16, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                <Laptop size={20} color="var(--color-green)" />
                <span>{editingPost ? 'Edit Showcase Post' : 'Add New Showcase Post'}</span>
              </h3>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePost} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. AI-Driven Smart Agriculture Drone System"
                  value={postForm.title}
                  onChange={e => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Category *</label>
                  <select
                    className="form-select"
                    value={postForm.category}
                    onChange={e => setPostForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                  >
                    <option value="Project">Technical Project / Software Build</option>
                    <option value="Achievement">Hackathon Winner / Competition</option>
                    <option value="Research">Research & Publication</option>
                    <option value="Internship">Internship & Opportunity</option>
                    <option value="Innovation">Innovation / Prototype</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Publication Status</label>
                  <label className="checkbox-group" style={{ cursor: 'pointer', height: 38, display: 'flex', alignItems: 'center', margin: 0 }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={postForm.published}
                      onChange={e => setPostForm(prev => ({ ...prev, published: e.target.checked }))}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: postForm.published ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                      {postForm.published ? 'Published (Live)' : 'Save as Draft'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Description *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Provide technical overview, objectives, architecture, technologies used, and outcomes..."
                  value={postForm.description}
                  onChange={e => setPostForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
                />
              </div>

              <ShowcaseImageInput
                imageUrl={postForm.cover_image_url}
                imageStoragePath={postForm.image_storage_path}
                onChange={({ cover_image_url, image_storage_path }) => {
                  setPostForm(prev => ({
                    ...prev,
                    cover_image_url,
                    image_storage_path: image_storage_path !== undefined ? image_storage_path : prev.image_storage_path
                  }));
                }}
              />

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Project / Repository URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/..."
                  value={postForm.project_url}
                  onChange={e => setPostForm(prev => ({ ...prev, project_url: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px' }}
                >
                  {formSubmitting ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                  <span>{editingPost ? 'Save Changes' : 'Create Post'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL (HOD ONLY) ─── */}
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
