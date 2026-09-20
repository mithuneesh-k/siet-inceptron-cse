import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useUndoableDelete } from '../contexts/UndoDeleteContext';
import StudentActionModal from '../components/StudentActionModal';
import ImportModal from '../components/ImportModal';
import CustomSelect from '../components/CustomSelect';
import FilterModal from '../components/FilterModal';
import FacultyAdvisorModal from '../components/FacultyAdvisorModal';
import FacultyActionModal from '../components/FacultyActionModal';
import ConfirmModal from '../components/ConfirmModal';
import SplitActions from '../components/ui/split-actions';
import { 
  Shield, BarChart2, Users, Settings, GraduationCap, Hourglass, 
  Award, TrendingUp, List, RefreshCw, Trash2, Download, Plus, 
  Edit3, Key, Check, X, ExternalLink, Inbox, Search, CheckCircle, Code, Send, Image as ImageIcon, Upload
} from 'lucide-react';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const { requestUndoableDelete } = useUndoableDelete();
  const [students, setStudents] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);

  // Manage Students state
  const [managedStudents, setManagedStudents] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [batches, setBatches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // student to delete
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Manage Faculty state
  const [faculties, setFaculties] = useState([]);
  const [facLoading, setFacLoading] = useState(false);
  const [editFaculty, setEditFaculty] = useState(null);
  const [showAddFacModal, setShowAddFacModal] = useState(false);
  const [deleteFacultyTarget, setDeleteFacultyTarget] = useState(null);

  // Platform Verification state
  const [platformConnections, setPlatformConnections] = useState([]);
  const [platLoading, setPlatLoading] = useState(false);
  const [platSearch, setPlatSearch] = useState('');
  const [platStatusFilter, setPlatStatusFilter] = useState('all');
  const [platPlatformFilter, setPlatPlatformFilter] = useState('all');

  // Post & Notify state
  const [notifyForm, setNotifyForm] = useState({ title: '', type: 'General', message: '', is_important: false, target: 'all', link: '', expires_at: '' });
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [deleteAnnTarget, setDeleteAnnTarget] = useState(null);
  const [annImageFile, setAnnImageFile] = useState(null);
  const [annImagePreview, setAnnImagePreview] = useState(null);
  const [uploadingAnnImage, setUploadingAnnImage] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [recentApproved, setRecentApproved] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);

  // Load overview data
  useEffect(() => {
    refreshUser();
    Promise.allSettled([
      client.get('/admin/students'),
      client.get('/achievements/all/pending'),
      client.get('/achievements/recent/approved'),
      client.get('/admin/overview-stats')
    ]).then(([uRes, aRes, recRes, statRes]) => {
      if (uRes.status === 'fulfilled') setStudents(uRes.value.data);
      if (aRes.status === 'fulfilled') setAchievements(aRes.value.data);
      if (recRes.status === 'fulfilled' && Array.isArray(recRes.value.data)) {
        setRecentApproved(recRes.value.data);
      }
      if (statRes.status === 'fulfilled' && statRes.value.data) {
        setOverviewStats(statRes.value.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  // Load managed students
  const loadManagedStudents = useCallback(async () => {
    setManageLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterClass) params.class = filterClass;
      if (filterBatch) params.batch = filterBatch;
      const res = await client.get('/admin/students', { params });
      setManagedStudents(res.data);
      // Collect unique batches for filter dropdown
      const uniqueBatches = [...new Set(res.data.map(s => s.batch).filter(Boolean))].sort();
      setBatches(uniqueBatches);
    } catch {
      showToast('Failed to load students.', 'error');
    } finally {
      setManageLoading(false);
    }
  }, [search, filterClass, filterBatch]);

  const loadFaculties = useCallback(async () => {
    setFacLoading(true);
    try {
      const res = await client.get('/admin/faculty');
      setFaculties(res.data);
    } catch {
      showToast('Failed to load faculty list.', 'error');
    } finally {
      setFacLoading(false);
    }
  }, []);

  const loadPlatformConnections = useCallback(async () => {
    setPlatLoading(true);
    try {
      const res = await client.get('/platforms/admin/connections');
      setPlatformConnections(res.data?.connections || []);
    } catch {
      showToast('Failed to load platform connections.', 'error');
    } finally {
      setPlatLoading(false);
    }
  }, []);

  const handleAdminVerifyPlatform = async (userId, platformCode, verifyStatus) => {
    try {
      const res = await client.post('/platforms/admin/verify', {
        userId,
        platformCode,
        verified: verifyStatus
      });
      if (res.data?.success) {
        setPlatformConnections(prev => prev.map(c =>
          (c.userId === userId && c.platformCode === platformCode)
            ? { ...c, ownershipVerified: verifyStatus }
            : c
        ));
        showToast(verifyStatus ? 'Platform connection verified! ✅' : 'Platform connection unverified.');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update verification status.', 'error');
    }
  };

  const handleDeleteFacultyConfirm = async () => {
    if (!deleteFacultyTarget) return;
    const target = deleteFacultyTarget;
    const targetId = target.user_id || target.id;
    setDeleteFacultyTarget(null);

    requestUndoableDelete({
      id: targetId,
      type: 'Faculty',
      label: target.name || 'Faculty Member',
      itemData: target,
      onOptimisticRemove: () => {
        setFaculties(prev => prev.filter(f => f.id !== targetId && f.user_id !== targetId));
      },
      onRestore: () => {
        setFaculties(prev => {
          if (prev.some(f => f.id === targetId || f.user_id === targetId)) return prev;
          return [...prev, target];
        });
      },
      onCommit: async () => {
        await client.delete(`/admin/faculty/${targetId}`);
      },
      onFailure: (err) => {
        showToast(err?.response?.data?.error || 'Unable to delete faculty. Please try again.', 'error');
      }
    });
  };

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await client.get('/announcements');
      if (res.data?.success) {
        setSentNotifications(res.data.announcements || []);
      }
    } catch {
      setSentNotifications([]);
    }
  }, []);

  useEffect(() => {
    if (tab === 'manage') loadManagedStudents();
    if (tab === 'faculty') loadFaculties();
    if (tab === 'platforms') loadPlatformConnections();
    if (tab === 'notify') loadAnnouncements();
  }, [tab, loadManagedStudents, loadFaculties, loadPlatformConnections, loadAnnouncements]);

  const handleDeleteAnnouncementConfirm = async () => {
    if (!deleteAnnTarget) return;
    const targetAnn = deleteAnnTarget;
    const targetId = targetAnn.id;
    setDeleteAnnTarget(null);

    requestUndoableDelete({
      id: targetId,
      type: 'Announcement',
      label: targetAnn.title || 'Announcement',
      itemData: targetAnn,
      onOptimisticRemove: () => {
        setSentNotifications(prev => prev.filter(n => String(n.id) !== String(targetId)));
      },
      onRestore: () => {
        setSentNotifications(prev => {
          if (prev.some(n => String(n.id) === String(targetId))) return prev;
          return [targetAnn, ...prev];
        });
      },
      onCommit: async () => {
        await client.delete(`/announcements/${targetId}`);
      },
      onFailure: (err) => {
        showToast(err?.response?.data?.error || 'Unable to delete announcement. Please try again.', 'error');
      }
    });
  };

  const handleAnnImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Invalid file format. Please upload JPEG, PNG, or WEBP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be 5 MB or smaller.', 'error');
      return;
    }
    setAnnImageFile(file);
    setAnnImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveAnnImage = () => {
    setAnnImageFile(null);
    if (annImagePreview) {
      URL.revokeObjectURL(annImagePreview);
    }
    setAnnImagePreview(null);
  };

  const handleSendNotification = async (e) => {
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
        setUploadingAnnImage(true);
        const formData = new FormData();
        formData.append('file', annImageFile);
        const uploadRes = await client.post('/uploads/announcement', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data?.success) {
          imageUrl = uploadRes.data.url;
          imageStoragePath = uploadRes.data.storage_ref;
        } else {
          throw new Error('Image upload failed.');
        }
      }

      const payload = {
        ...notifyForm,
        image_url: imageUrl,
        image_storage_path: imageStoragePath
      };

      const res = await client.post('/announcements', payload);
      if (res.data?.success) {
        showToast('Announcement broadcasted successfully! 📢');
        const created = res.data.announcement || { ...payload, id: Date.now(), created_at: new Date().toISOString() };
        setSentNotifications(prev => [created, ...prev.filter(n => String(n.id) !== String(created.id))]);
        setNotifyForm({ title: '', type: 'General', message: '', is_important: false, target: 'all', link: '', expires_at: '' });
        handleRemoveAnnImage();
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || 'Failed to send notification.', 'error');
    } finally {
      setNotifyLoading(false);
      setUploadingAnnImage(false);
    }
  };

  const isAdmin = Boolean(user && (user.is_admin || user.role === 'admin' || user.role === 'faculty'));
  const isFullAdmin = Boolean(user && (user.role === 'admin' || user.is_admin || user.is_hod || user.designation?.toUpperCase() === 'HOD'));

  const totalScore = students.reduce((s, u) => s + u.score, 0);
  const avgScore = students.length ? Math.round(totalScore / students.length) : 0;

  const verifyAch = async (id, approved) => {
    let reason = null;
    if (!approved) {
      reason = window.prompt('Enter reason for rejection:');
      if (!reason || !reason.trim()) {
        showToast('Rejection cancelled: reason is required.', 'error');
        return;
      }
    }

    const targetAch = achievements.find(a => a.id === id);
    setAchievements(prev => prev.filter(a => a.id !== id));
    showToast(approved ? 'Achievement approved ✅' : 'Achievement rejected ✕', approved ? 'success' : 'error');
    window.dispatchEvent(new Event('pendingUpdated'));

    try {
      if (approved) {
        await client.patch(`/achievements/${id}/approve`);
      } else {
        await client.patch(`/achievements/${id}/reject`, { rejection_reason: reason.trim() });
      }
    } catch {
      if (targetAch) setAchievements(prev => [targetAch, ...prev]);
      showToast('Action failed.', 'error');
      window.dispatchEvent(new Event('pendingUpdated'));
    }
  };

  const handleStudentSaved = (savedStudent, isEdit) => {
    if (isEdit) {
      setManagedStudents(prev => prev.map(s => s.id === savedStudent.id ? { ...s, ...savedStudent } : s));
    } else {
      loadManagedStudents();
    }
  };

  const handleDelete = async (s) => {
    if (!s) return;
    const targetStudent = s;
    const targetId = s.id;
    setDeleteConfirm(null);

    requestUndoableDelete({
      id: targetId,
      type: 'Student',
      label: targetStudent.name || 'Student Profile',
      itemData: targetStudent,
      onOptimisticRemove: () => {
        setManagedStudents(prev => prev.filter(st => st.id !== targetId));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
      },
      onRestore: () => {
        setManagedStudents(prev => {
          if (prev.some(st => st.id === targetId)) return prev;
          return [...prev, targetStudent];
        });
      },
      onCommit: async () => {
        await client.delete(`/admin/students/${targetId}`);
      },
      onFailure: () => {
        showToast('Failed to delete student.', 'error');
      }
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    let count = 0;
    for (const id of ids) {
      try {
        await client.delete(`/admin/students/${id}`);
        count++;
      } catch { /* continue */ }
    }
    setManagedStudents(prev => prev.filter(s => !selectedIds.has(s.id)));
    setSelectedIds(new Set());
    showToast(<span><Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {count} students deleted.</span>);
  };

  const handleResetPassword = async (s) => {
    try {
      await client.post(`/admin/students/${s.id}/reset-password`);
      showToast(<span><Key size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Password reset for {s.name}.</span>);
    } catch {
      showToast('Failed to reset password.', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === managedStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(managedStudents.map(s => s.id)));
    }
  };

  // Auto-populate filters for restricted advisors
  useEffect(() => {
    if (user && !isFullAdmin) {
      if (user.advising_class) setFilterClass(user.advising_class);
      if (user.advising_batch) setFilterBatch(user.advising_batch);
    }
  }, [user, isFullAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs = [
    { id: 'overview', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={16} /> Overview</span> },
    { id: 'students', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Students</span> },
    { id: 'manage', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} /> Manage</span> },
    ...(isFullAdmin ? [{ id: 'faculty', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={16} /> Faculty</span> }] : []),
    { id: 'platforms', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Code size={16} /> Platform Verification</span> },
    ...(isFullAdmin ? [{ id: 'notify', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Send size={16} /> Post & Notify</span> }] : []),
    { id: 'pending', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Hourglass size={16} /> Pending ({achievements.length})</span> },
  ];

  return (
    <div className="page-content">
      <div className="container">
        <div className="admin-header animate-fadeInUp">
          <div>
            <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={28} className="text-gradient" /> <span className="text-gradient">Admin Panel</span></h1>
            <p className="section-subtitle">Sri Shakthi Institute of Engineering and Technology — CSE Department</p>
          </div>
          <div className="badge badge-gold" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> {user.name}</div>
        </div>

        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: 28, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {loading && tab !== 'manage' ? (
          <div className="card" style={{ padding: '24px' }}>
            <div className="skeleton skeleton-text-lg" style={{ width: '40%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginTop: '24px' }}>
              <div className="skeleton skeleton-card" style={{ height: '100px' }}></div>
              <div className="skeleton skeleton-card" style={{ height: '100px' }}></div>
              <div className="skeleton skeleton-card" style={{ height: '100px' }}></div>
              <div className="skeleton skeleton-card" style={{ height: '100px' }}></div>
            </div>
            <div style={{ marginTop: '32px' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '60px', marginBottom: '12px' }}></div>)}
            </div>
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (() => {
              const totalStudentsCount = overviewStats?.totalStudents ?? students.length;
              const totalAchievementsCount = overviewStats?.totalAchievements ?? students.reduce((s, u) => s + (u.achievement_count || 0), 0);
              const computedAvg = overviewStats?.avgScore ?? (students.length ? Number((students.reduce((sum, s) => sum + (s.score || 0), 0) / students.length).toFixed(2)) : 0);
              const topStudents = overviewStats?.topStudents && overviewStats.topStudents.length > 0
                ? overviewStats.topStudents 
                : [];

              return (
                <div className="animate-fadeIn">
                  <div className="admin-stats">
                    {[
                      { n: totalStudentsCount, l: 'Total Students', i: <Users size={28} />, c: 'var(--color-violet)' },
                      { n: totalAchievementsCount, l: 'Total Achievements', i: <Award size={28} />, c: 'var(--color-gold)' },
                      { n: computedAvg, l: 'Avg Score', i: <TrendingUp size={28} />, c: 'var(--color-blue)' },
                      { n: achievements.length, l: 'Pending Reviews', i: <Hourglass size={28} />, c: 'var(--color-orange)' },
                    ].map((s, i) => (
                      <div key={i} className="admin-stat card" style={{ borderTop: `3px solid ${s.c}` }}>
                        <div>{s.i}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Space Grotesk', sans-serif", color: s.c }}>{s.n}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginTop: 20 }}>
                    <div className="card" style={{ padding: '20px 24px' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><List size={18} /> Top 5 Students by Score</h3>
                      {topStudents.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No student records found.</div>
                      ) : (
                        topStudents.map((s, i) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontWeight: 700, fontSize: 16, minWidth: 24 }}>#{i + 1}</span>
                            <div style={{ width: 36, height: 36, background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>{s.name[0]}</div>
                            <div style={{ flex: 1 }}>
                              <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</Link>
                              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.class} · {s.batch || 'No batch'}</div>
                            </div>
                            <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontFamily: "'Space Grotesk', sans-serif" }}>{s.score} pts</span>
                          </div>
                        ))
                      )}
                    </div>

                  <div className="card" style={{ padding: '20px 24px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><Award size={18} /> Recent Approved Achievements</h3>
                    {recentApproved.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No approved achievements found yet.
                      </div>
                    ) : (
                      recentApproved.map((a) => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ width: 36, height: 36, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                            <CheckCircle size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                              {a.student_name} ({a.class || 'Student'}) · <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>+{a.points || 0} pts</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

            {/* ── STUDENTS (view-only) ── */}
            {tab === 'students' && (
              <div className="card animate-fadeIn" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 100px', gap: 12, padding: '12px 20px', background: 'rgba(255,255,255,0.03)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>
                  <span>Student</span><span style={{ whiteSpace: 'nowrap' }}>Batch</span><span>Class</span><span>Achv.</span><span>Score</span>
                </div>
                {students.map((s, i) => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 100px', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', animation: `fadeInUp 0.3s ease ${i * 0.02}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>{s.name[0]}</div>
                      <div>
                        <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</Link>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.batch || '—'}</span>
                    <span><span className="badge badge-violet">{s.class}</span></span>
                    <span style={{ fontSize: 14 }}>{s.achievement_count}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{s.score}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── MANAGE STUDENTS ── */}
            {tab === 'manage' && (
              <div className="animate-fadeIn">
                {!isFullAdmin && (
                  <div className="advisor-banner animate-fadeInUp">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Shield size={24} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advisor Mode</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Managing students for <b>{user.advising_class}</b> ({user.advising_batch})</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="manage-toolbar card animate-fadeInUp" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', marginTop: !isFullAdmin ? 12 : 0 }}>
                  <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                      <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Search by name…" 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        style={{ paddingLeft: '36px', width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button 
                        className={`btn ${filterBatch || filterClass ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowFilters(true)}
                        disabled={!isFullAdmin}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        {isFullAdmin ? `Filters ${(filterBatch || filterClass) ? '(Active)' : ''}` : `${user.advising_class || 'None'} (${user.advising_batch || 'None'})`}
                      </button>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={loadManagedStudents} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Refresh</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {selectedIds.size > 0 && isFullAdmin && (
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm('bulk')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Trash2 size={14} /> Delete ({selectedIds.size})
                      </button>
                    )}
                    {isFullAdmin ? (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Download size={14} /> Import CSV
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Plus size={14} /> Add Student
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={14} /> Add Student
                      </button>
                    )}
                  </div>
                </div>

                <FilterModal 
                  isOpen={showFilters} 
                  onClose={() => setShowFilters(false)}
                  onClear={() => { setFilterBatch(''); setFilterClass(''); }}
                >
                  <div className="form-group">
                    <label className="form-label">Batch</label>
                    <CustomSelect
                      value={filterBatch}
                      onChange={setFilterBatch}
                      options={[{ value: '', label: 'All Batches' }, ...batches.map(b => ({ value: b, label: b }))]}
                      placeholder="All Batches"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <CustomSelect
                      value={filterClass}
                      onChange={setFilterClass}
                      options={[{ value: '', label: 'All Classes' }, ...CLASSES.map(c => ({ value: c, label: c }))]}
                      placeholder="All Classes"
                    />
                  </div>
                  <div style={{ height: '120px' }}></div>
                </FilterModal>

                {/* Table */}
                {manageLoading ? (
                  <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
                    <div className="manage-table-header" style={{ marginBottom: '16px' }}>
                      <div className="skeleton skeleton-text" style={{ width: '100%', margin: 0 }}></div>
                    </div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 2.5fr 120px 90px 120px 110px 130px', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div className="skeleton skeleton-text" style={{ width: '20px', margin: 0 }}></div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div className="skeleton skeleton-circle" style={{ width: '34px', height: '34px' }}></div>
                          <div style={{ flex: 1 }}>
                            <div className="skeleton skeleton-text" style={{ width: '120px', margin: '0 0 4px' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '80px', height: '10px', margin: 0 }}></div>
                          </div>
                        </div>
                        <div className="skeleton skeleton-text" style={{ width: '60px', margin: 0 }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '40px', margin: 0 }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '60px', margin: 0 }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '60px', margin: 0 }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '80px', margin: 0 }}></div>
                      </div>
                    ))}
                  </div>
                ) : managedStudents.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-green)', opacity: 0.5}}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <line x1="19" y1="8" x2="19" y2="14"></line>
                        <line x1="22" y1="11" x2="16" y2="11"></line>
                      </svg>
                    </div>
                    <h3>No students found</h3>
                    <p>Try adjusting your filters or import a CSV.</p>
                  </div>
                ) : (
                  <div className="card" style={{ overflow: 'hidden', marginTop: 16 }}>
                    {/* Table header */}
                    <div className="manage-table-header">
                        <input
                          type="checkbox"
                          className="checkbox-custom"
                          checked={selectedIds.size === managedStudents.length && managedStudents.length > 0}
                          onChange={toggleSelectAll}
                          title="Select all"
                        />
                      <span>Student</span>
                      <span>Roll No</span>
                      <span>Class</span>
                      <span>Batch</span>
                      <span>DOB</span>
                      <span>Action</span>
                    </div>

                    {managedStudents.map((s, i) => (
                      <div
                        key={s.id}
                        className="manage-table-row"
                        style={{ background: selectedIds.has(s.id) ? 'rgba(132, 204, 22, 0.08)' : undefined, animation: `fadeInUp 0.25s ease ${i * 0.015}s both` }}
                      >
                        {isFullAdmin ? (
                          <input
                            type="checkbox"
                            className="checkbox-custom"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                          />
                        ) : (
                          <div /> 
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, background: '#84cc16', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#070a0f', fontSize: 13, flexShrink: 0 }}>
                            {s.name[0]}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</Link>
                            <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#cbd5e1' }}>{s.roll_no}</span>
                        <span><span className="badge badge-violet">{s.class}</span></span>
                        <span><span className="badge badge-blue">{s.batch}</span></span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.date_of_birth || '—'}</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', position: 'relative', zIndex: 5 }}>
                          <SplitActions
                            primaryLabel="Manage"
                            primaryIcon={Edit3}
                            onPrimaryClick={() => setEditStudent(s)}
                            dropdownActions={[
                              { label: 'Reset Password', icon: Key, onClick: () => handleResetPassword(s) },
                              { label: 'Delete Student', icon: Trash2, onClick: () => setDeleteConfirm(s), destructive: true }
                            ]}
                            ariaLabel="More student actions"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>
                  Showing <strong>{managedStudents.length}</strong> student{managedStudents.length !== 1 ? 's' : ''}
                  {selectedIds.size > 0 && <> · <strong>{selectedIds.size}</strong> selected</>}
                </div>
              </div>
            )}
            {/* ── MANAGE FACULTY ── */}
            {tab === 'faculty' && isFullAdmin && (
              <div className="animate-fadeIn">
                <div className="section-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc' }}><GraduationCap size={20} /> CSE Faculty & Advisors</h3>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>Assigned class advisors have admin privileges for their specific class.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddFacModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={16} /> Add Faculty</button>
                </div>

                {facLoading ? (
                  <div className="card" style={{ padding: '24px' }}>
                    {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '60px', marginBottom: '12px' }}></div>)}
                  </div>
                ) : faculties.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-green)', opacity: 0.5}}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <h3>No faculty members found</h3>
                    <p>Add faculty to begin managing advisor roles.</p>
                  </div>
                ) : (
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="manage-table-header" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 140px' }}>
                      <span>Faculty Name</span>
                      <span>Designation</span>
                      <span>Department</span>
                      <span>Advising Section</span>
                      <span>Advising Batch</span>
                      <span>Manage</span>
                    </div>
                    {faculties.map((f, i) => (
                      <div key={f.id} className="manage-table-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 140px', animation: `fadeInUp 0.3s ease ${i * 0.02}s both` }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{f.name}</div>
                        <div style={{ fontSize: 13, color: '#cbd5e1' }}>{f.designation || '—'}</div>
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>{f.department || 'CSE'}</div>
                        <div>{f.advising_class ? <span className="badge badge-green">{f.advising_class}</span> : <span style={{ color: '#64748b' }}>—</span>}</div>
                        <div>{f.advising_batch ? <span className="badge badge-violet">{f.advising_batch}</span> : <span style={{ color: '#64748b' }}>—</span>}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative', zIndex: 5 }}>
                          <SplitActions
                            primaryLabel="Adjust"
                            primaryIcon={Edit3}
                            onPrimaryClick={() => setEditFaculty(f)}
                            dropdownActions={[
                              {
                                label: 'Delete Faculty',
                                icon: Trash2,
                                onClick: () => setDeleteFacultyTarget(f),
                                destructive: true,
                                hidden: !isFullAdmin || f.user_id === user?.id || f.id === user?.id
                              }
                            ]}
                            ariaLabel="More faculty actions"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
      {/* ── Faculty Action Modal ── */}
      {showAddFacModal && (
        <FacultyActionModal
          onClose={() => setShowAddFacModal(false)}
          onSaved={loadFaculties}
          showToast={showToast}
        />
      )}

            {/* ── PENDING ACHIEVEMENTS ── */}
            {tab === 'pending' && (
              <div className="animate-fadeIn">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                    Review pending student submissions or switch to the dedicated inspection portal.
                  </p>
                  <Link to="/approvals" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={15} /> Open Full Approvals Portal →
                  </Link>
                </div>
                {achievements.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon" style={{ marginBottom: '16px' }}>
                      <Inbox size={48} color="var(--color-green)" strokeWidth={1.5} opacity={0.6} />
                    </div>
                    <h3>All caught up!</h3>
                    <p>No pending achievement reviews.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {achievements.map(a => (
                      <div key={a.id} className="card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={`badge type-${a.type} badge`}>{a.type}</span>
                              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>by {a.student_name} ({a.roll_no})</span>
                            </div>
                            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.title}</h4>
                            {a.description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{a.description}</p>}
                            {a.proof_url && <a href={a.proof_url} target="_blank" rel="noopener noreferrer" className="badge badge-violet" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> View Proof</a>}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => verifyAch(a.id, true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Verify</button>
                            <button className="btn btn-danger btn-sm" onClick={() => verifyAch(a.id, false)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PLATFORM VERIFICATION ── */}
            {tab === 'platforms' && (
              <div className="animate-fadeIn">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Total Connections</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{platformConnections.length}</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Verified Profiles</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-green)', marginTop: 4 }}>{platformConnections.filter(c => c.ownershipVerified).length}</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Active Students</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{[...new Set(platformConnections.map(c => c.userId))].length}</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Sync Failures</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: platformConnections.filter(c => c.status === 'sync_error' || c.status === 'error').length > 0 ? '#ef4444' : 'var(--color-green)', marginTop: 4 }}>
                      {platformConnections.filter(c => c.status === 'sync_error' || c.status === 'error').length}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Code size={20} className="text-gradient" /> Platform Connection Verification
                      </h2>
                      <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                        Review student programming platform handles, sync health, and competitive score metrics.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Search student, handle..."
                        value={platSearch}
                        onChange={(e) => setPlatSearch(e.target.value)}
                        className="form-input"
                        style={{ width: 180, padding: '8px 12px', fontSize: 13 }}
                      />
                      <select
                        value={platStatusFilter}
                        onChange={(e) => setPlatStatusFilter(e.target.value)}
                        className="form-select"
                        style={{ width: 150, padding: '8px 12px', fontSize: 13 }}
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending Verification</option>
                        <option value="verified">Verified</option>
                      </select>
                      <select
                        value={platPlatformFilter}
                        onChange={(e) => setPlatPlatformFilter(e.target.value)}
                        className="form-select"
                        style={{ width: 150, padding: '8px 12px', fontSize: 13 }}
                      >
                        <option value="all">All Platforms</option>
                        <option value="codeforces">Codeforces</option>
                        <option value="leetcode">LeetCode</option>
                        <option value="hackerrank">HackerRank</option>
                        <option value="geeksforgeeks">GeeksforGeeks</option>
                      </select>
                    </div>
                  </div>

                  {platLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
                      <div>Loading platform connections...</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '10px 12px' }}>Student</th>
                            <th style={{ padding: '10px 12px' }}>Class / Batch</th>
                            <th style={{ padding: '10px 12px' }}>Platform</th>
                            <th style={{ padding: '10px 12px' }}>Handle</th>
                            <th style={{ padding: '10px 12px' }}>Status</th>
                            <th style={{ padding: '10px 12px' }}>Last Sync</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {platformConnections
                            .filter(c => {
                              if (platStatusFilter === 'pending' && c.ownershipVerified) return false;
                              if (platStatusFilter === 'verified' && !c.ownershipVerified) return false;
                              if (platPlatformFilter !== 'all' && c.platformCode !== platPlatformFilter) return false;
                              if (platSearch.trim()) {
                                const q = platSearch.toLowerCase().trim();
                                const nameMatch = (c.studentName || '').toLowerCase().includes(q);
                                const rollMatch = (c.rollNo || '').toLowerCase().includes(q);
                                const handleMatch = (c.handle || '').toLowerCase().includes(q);
                                if (!nameMatch && !rollMatch && !handleMatch) return false;
                              }
                              return true;
                            })
                            .map((conn) => (
                              <tr key={`${conn.userId}-${conn.platformCode}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{conn.studentName}</div>
                                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>{conn.rollNo || conn.userId}</div>
                                </td>
                                <td style={{ padding: '12px', color: '#cbd5e1' }}>
                                  {conn.class || '—'} · {conn.batch || '—'}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 700, textTransform: 'capitalize', color: '#a3e635' }}>
                                  {conn.platformCode}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 600, color: '#60a5fa' }}>
                                  @{conn.handle}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  {conn.ownershipVerified ? (
                                    <span className="badge" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(132, 204, 22, 0.15)', color: '#a3e635', border: '1px solid rgba(132, 204, 22, 0.3)' }}>
                                      <CheckCircle size={12} /> Verified
                                    </span>
                                  ) : (
                                    <span className="badge" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                      Connected
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px', fontSize: 11, color: '#94a3b8' }}>
                                  {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString() : 'Never'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                  <SplitActions
                                    primaryLabel={conn.ownershipVerified ? 'Verified' : 'Verify'}
                                    primaryIcon={CheckCircle}
                                    onPrimaryClick={() => handleAdminVerifyPlatform(conn.userId, conn.platformCode, !conn.ownershipVerified)}
                                    dropdownActions={[
                                      {
                                        label: conn.ownershipVerified ? 'Unverify Connection' : 'Verify Handle',
                                        icon: conn.ownershipVerified ? X : CheckCircle,
                                        onClick: () => handleAdminVerifyPlatform(conn.userId, conn.platformCode, !conn.ownershipVerified),
                                        destructive: conn.ownershipVerified
                                      }
                                    ]}
                                    ariaLabel="More platform actions"
                                  />
                                </td>
                              </tr>
                            ))}
                          {platformConnections.length === 0 && (
                            <tr>
                              <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                                No platform connections found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── POST & NOTIFY ── */}
            {tab === 'notify' && isFullAdmin && (
              <div className="card animate-fadeIn" style={{ padding: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                    <Send size={22} style={{ color: 'var(--color-green)' }} /> Post & Notify Department
                  </h2>
                  <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Broadcast departmental announcements, hackathons, internships, or notices to students and faculty.
                  </p>
                </div>

                <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Announcement Title *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. SIET CSE Hackathon 2026 Registrations Open"
                        value={notifyForm.title}
                        onChange={e => setNotifyForm(prev => ({ ...prev, title: e.target.value }))}
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)' }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Announcement Type *</label>
                      <select
                        className="form-select"
                        value={notifyForm.type}
                        onChange={e => setNotifyForm(prev => ({ ...prev, type: e.target.value }))}
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)' }}
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
                      <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Target Audience</label>
                      <select
                        className="form-select"
                        value={notifyForm.target}
                        onChange={e => setNotifyForm(prev => ({ ...prev, target: e.target.value }))}
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)' }}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Action Link / URL (Optional)</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://..."
                        value={notifyForm.link}
                        onChange={e => setNotifyForm(prev => ({ ...prev, link: e.target.value }))}
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Expiry Date (Optional)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={notifyForm.expires_at}
                        onChange={e => setNotifyForm(prev => ({ ...prev, expires_at: e.target.value }))}
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Announcement Message *</label>
                    <textarea
                      className="form-input"
                      rows={5}
                      placeholder="Write the full announcement details, guidelines, or instructions here..."
                      value={notifyForm.message}
                      onChange={e => setNotifyForm(prev => ({ ...prev, message: e.target.value }))}
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-text)', resize: 'vertical' }}
                      required
                    />
                  </div>

                  {/* ── Photo / Image Attachment Area ── */}
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ImageIcon size={16} color="var(--color-green)" /> Attach Photo / Poster (Optional)
                    </label>

                    {!annImagePreview ? (
                      <div
                        style={{
                          border: '2px dashed var(--border-strong)',
                          borderRadius: 12,
                          padding: '20px',
                          textAlign: 'center',
                          background: 'var(--bg-input)',
                          cursor: 'pointer',
                          transition: 'all 200ms ease'
                        }}
                        onClick={() => document.getElementById('ann-photo-input')?.click()}
                      >
                        <input
                          id="ann-photo-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAnnImageChange}
                          style={{ display: 'none' }}
                        />
                        <Upload size={24} style={{ color: 'var(--color-green)', marginBottom: 8 }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Click to upload poster or image</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>JPEG, PNG, or WEBP (Max size: 5 MB)</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-input)', border: '1px solid var(--border)', padding: 12, borderRadius: 12 }}>
                        <img
                          src={annImagePreview}
                          alt="Announcement Preview"
                          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-strong)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {annImageFile?.name || 'Attached Image'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                            {annImageFile ? `${(annImageFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Ready to post'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={handleRemoveAnnImage}
                          style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Remove Photo"
                        >
                          <X size={16} /> Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                    <label className="checkbox-group" style={{ cursor: 'pointer', margin: 0 }}>
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
                      style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto', cursor: 'pointer' }}
                    >
                      <Send size={16} /> {uploadingAnnImage ? 'Uploading Image...' : notifyLoading ? 'Broadcasting...' : 'Post & Broadcast Notification'}
                    </button>
                  </div>
                </form>

                {sentNotifications.length > 0 && (
                  <div style={{ marginTop: 36, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Posted Announcements ({sentNotifications.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {sentNotifications.map(n => (
                        <div
                          key={n.id}
                          style={{
                            background: n.is_important ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-input)',
                            border: `1px solid ${n.is_important ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                            borderRadius: 12,
                            padding: 16
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span className="badge badge-green" style={{ fontSize: 11 }}>{n.type || 'General'}</span>
                                {n.is_important && <span className="badge" style={{ fontSize: 11, background: '#ef4444', color: '#fff' }}>IMPORTANT</span>}
                                {n.image_url && <span className="badge badge-violet" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}><ImageIcon size={10} /> Photo Attached</span>}
                                <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Audience: {n.target}</span>
                              </div>
                              <h4 style={{ fontWeight: 800, color: 'var(--color-text)', margin: 0, fontSize: 15 }}>{n.title}</h4>
                            </div>

                            <SplitActions
                              primaryLabel="Manage"
                              primaryIcon={Settings}
                              onPrimaryClick={() => setDeleteAnnTarget(n)}
                              dropdownActions={[
                                { label: 'Delete Announcement', icon: Trash2, onClick: () => setDeleteAnnTarget(n), destructive: true }
                              ]}
                              ariaLabel="More announcement actions"
                            />
                          </div>

                          {n.image_url && (
                            <div style={{ marginTop: 10, marginBottom: 8 }}>
                              <img
                                src={n.image_url}
                                alt={n.title}
                                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                              />
                            </div>
                          )}

                          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0', whiteSpace: 'pre-line' }}>{n.message}</p>
                          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 8 }}>
                            Posted: {new Date(n.created_at || n.timestamp || Date.now()).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={20} color="var(--color-red)" /> Confirm Delete</h2>
              <button className="modal-close btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ fontSize: 15, marginBottom: 20, color: 'var(--color-text-muted)' }}>
              {deleteConfirm === 'bulk'
                ? `Are you sure you want to permanently delete ${selectedIds.size} selected students? This action cannot be undone.`
                : `Are you sure you want to permanently delete "${deleteConfirm.name}"? This cannot be undone.`}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteConfirm === 'bulk' ? handleBulkDelete() : handleDelete(deleteConfirm)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Student Modal ── */}
      {(showAddModal || editStudent) && (
        <StudentActionModal
          student={editStudent || null}
          isFullAdmin={isFullAdmin}
          advisorClass={user.advising_class}
          advisorBatch={user.advising_batch}
          onClose={() => { setShowAddModal(false); setEditStudent(null); }}
          onSaved={handleStudentSaved}
          showToast={showToast}
        />
      )}
      {/* ── Faculty Advisor Modal ── */}
      {editFaculty && (
        <FacultyAdvisorModal
          faculty={editFaculty}
          onClose={() => setEditFaculty(null)}
          onSaved={loadFaculties}
          showToast={showToast}
        />
      )}

      {/* ── Import CSV Modal ── */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={loadManagedStudents}
          showToast={showToast}
        />
      )}

      {/* ── Confirm Faculty Delete Modal ── */}
      {deleteFacultyTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteFacultyTarget)}
          title="Delete Faculty Member?"
          message="This will permanently remove this faculty account."
          confirmText="Delete Faculty"
          confirmVariant="danger"
          onConfirm={handleDeleteFacultyConfirm}
          onCancel={() => setDeleteFacultyTarget(null)}
        />
      )}

      {/* ── Confirm Announcement Delete Modal ── */}
      {deleteAnnTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteAnnTarget)}
          title="Delete Announcement?"
          message={`Are you sure you want to delete "${deleteAnnTarget.title}"? This cannot be undone.`}
          confirmText="Delete Announcement"
          confirmVariant="danger"
          onConfirm={handleDeleteAnnouncementConfirm}
          onCancel={() => setDeleteAnnTarget(null)}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .admin-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
        .admin-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .admin-stat { padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 6px; align-items: center; }
        
        .advisor-banner {
          background: var(--gradient-primary);
          color: white;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          margin-bottom: 8px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-strong);
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .advisor-banner b { color: var(--gold-200); }

        .manage-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 0; }

        .manage-table-header {
          display: grid;
          grid-template-columns: 36px 2.5fr 120px 90px 120px 110px 130px;
          gap: 12px;
          padding: 10px 16px;
          background: var(--bg-primary);
          font-size: 11px; font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          border-bottom: 1.5px solid var(--border);
          align-items: center;
        }
        .manage-table-row {
          display: grid;
          grid-template-columns: 36px 2.5fr 120px 90px 120px 110px 130px;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          align-items: center;
          transition: background var(--transition);
        }
        .manage-table-row:hover { background: var(--bg-hover); }
        .manage-table-row:last-child { border-bottom: none; }

        .csv-dropzone {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          border: 2px dashed var(--border-strong);
          border-radius: var(--radius-md);
          padding: 48px 24px;
          cursor: pointer;
          transition: all var(--transition);
          background: var(--bg-primary);
        }
        .csv-dropzone:hover { border-color: var(--color-green); background: var(--green-50); }

        @media (max-width: 900px) {
          .admin-stats { grid-template-columns: repeat(2, 1fr); }
          .manage-table-header, .manage-table-row { grid-template-columns: 28px 1fr 80px 80px; }
          .manage-table-header span:nth-child(6),
          .manage-table-row > span:nth-child(6),
          .manage-table-header span:nth-child(7),
          .manage-table-row > div:nth-child(7) { display: none; }
        }
        @media (max-width: 640px) {
          .manage-table-header { display: none; }
          .manage-table-row {
            display: flex; flex-wrap: wrap;
            padding: 16px; gap: 8px;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            margin-bottom: 12px;
            position: relative;
          }
          .manage-table-row:last-child { border-bottom: 1px solid var(--border); }
          .manage-table-row > input[type="checkbox"] { position: absolute; top: 16px; right: 16px; }
          .manage-table-row > *:nth-child(2) { width: calc(100% - 40px); margin-bottom: 8px; } /* Student info */
          .manage-table-row > span { display: inline-flex; align-items: center; background: var(--bg-hover); padding: 4px 8px; border-radius: var(--radius-sm); font-size: 12px; margin-right: 4px; }
          .manage-table-row > div:last-child { display: flex !important; width: 100%; border-top: 1px dashed var(--border); padding-top: 10px; margin-top: 4px; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
}
