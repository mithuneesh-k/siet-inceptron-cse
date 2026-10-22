import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import TeamOdFaculty from '../components/TeamOdFaculty';
import TeamOdManagement from '../components/TeamOdManagement';
import { 
  Shield, BarChart2, Users, Settings, GraduationCap, Hourglass, 
  Award, TrendingUp, List, RefreshCw, Trash2, Download, Plus, 
  Edit3, Key, Copy, Check, X, ExternalLink, Inbox, Search, CheckCircle, AlertCircle,
  CalendarCheck, FileSpreadsheet
} from 'lucide-react';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const { requestUndoableDelete } = useUndoableDelete();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');

  const [students, setStudents] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(tabFromUrl || 'overview');
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
  const [tempPasswordModal, setTempPasswordModal] = useState(null);



  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [recentApproved, setRecentApproved] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);

  const isAdmin = Boolean(user && (user.role === 'admin' || user.is_admin || user.role === 'faculty'));
  const isFullAdmin = Boolean(
    user && (
      user.role === 'admin' || 
      user.is_hod === true || 
      user.designation?.toUpperCase()?.includes('HOD') || 
      user.designation?.toUpperCase() === 'HEAD OF DEPARTMENT'
    )
  );
  const isFacultyRole = Boolean(user && user.role === 'faculty');
  const canAccessTeamOd = Boolean(user && (user.role === 'faculty' || user.role === 'admin' || user.is_admin));
  const panelTitle = isFacultyRole ? 'Faculty Panel' : 'Admin Panel';

  const tabs = [
    { id: 'overview', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={16} /> Overview</span> },
    { id: 'students', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Students</span> },
    { id: 'manage', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} /> Manage</span> },
    ...(isAdmin ? [{ id: 'faculty', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={16} /> Faculty</span> }] : []),
    ...(canAccessTeamOd ? [{ id: 'team-od', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarCheck size={16} /> Team OD & Event Reporting</span> }] : []),
    ...(isFullAdmin ? [{ id: 'team-od-mgmt', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileSpreadsheet size={16} /> Team OD Reporting Management</span> }] : []),
  ];

  useEffect(() => {
    if (tabFromUrl === 'notify') {
      navigate('/showcase/manage', { replace: true });
      return;
    }
    if (tabFromUrl === 'approvals') {
      setTab('overview');
      navigate('/admin?tab=overview', { replace: true });
      return;
    }
    if (tabFromUrl && tabs.some(t => t.id === tabFromUrl)) {
      setTab(tabFromUrl);
    } else if (tabFromUrl === 'team-od' && !canAccessTeamOd) {
      setTab('overview');
    } else if (tabFromUrl === 'team-od-mgmt' && !isFullAdmin) {
      setTab('overview');
    }
  }, [tabFromUrl, isFacultyRole, canAccessTeamOd, isFullAdmin, navigate]);

  const handleTabClick = (tabId) => {
    setTab(tabId);
    navigate(`/admin?tab=${tabId}`, { replace: true });
  };


  // Load overview data
  useEffect(() => {
    refreshUser();
    Promise.allSettled([
      client.get('/admin/students'),
      client.get('/achievements/recent/approved'),
      client.get('/admin/overview-stats')
    ]).then(([uRes, recRes, statRes]) => {
      if (uRes.status === 'fulfilled') setStudents(uRes.value.data);
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
      const list = Array.isArray(res.data) ? res.data : (res.data?.faculties || []);
      setFaculties(list);
    } catch {
      showToast('Failed to load faculty list.', 'error');
    } finally {
      setFacLoading(false);
    }
  }, []);



  const getActionErrorMessage = (err, defaultMsg = 'Operation failed.') => {
    if (err?.response?.data?.error) {
      return err.response.data.error;
    }
    const status = err?.response?.status;
    if (status === 401) return 'Session expired. Please log in again.';
    if (status === 403) return 'You do not have permission to delete this item.';
    if (status === 404) return 'This item was not found or has already been removed.';
    if (status === 409) return 'This item could not be deleted because it is still referenced by another record.';
    if (status >= 500) return 'The database rejected the deletion. Please contact the administrator if the problem continues.';
    if (!err?.response) return 'Could not connect to the server. Please try again.';
    return defaultMsg;
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
        showToast(getActionErrorMessage(err, 'Unable to delete faculty. Please try again.'), 'error');
      }
    });
  };

  const handleResetPassword = async (student) => {
    const targetId = student.user_id || student.id;
    try {
      const res = await client.post(`/admin/students/${targetId}/reset-password`);
      if (res.data?.temporary_password) {
        setTempPasswordModal({
          name: student.name,
          username: student.roll_no || student.email,
          password: res.data.temporary_password,
          role: 'Student'
        });
        showToast(`Temporary password generated for ${student.name}`, 'success');
      } else {
        showToast('Password reset successfully.', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset student password.', 'error');
    }
  };

  const handleResetFacultyPassword = async (faculty) => {
    const targetId = faculty.user_id || faculty.id;
    try {
      const res = await client.post(`/admin/faculty/${targetId}/reset-password`);
      if (res.data?.temporary_password) {
        setTempPasswordModal({
          name: faculty.name,
          username: faculty.username,
          password: res.data.temporary_password,
          role: 'Faculty'
        });
        showToast(`Temporary password generated for ${faculty.name}`, 'success');
      } else {
        showToast('Password reset successfully.', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reset faculty password.', 'error');
    }
  };

  useEffect(() => {
    if (tab === 'manage') loadManagedStudents();
    if (tab === 'faculty') loadFaculties();
  }, [tab, loadManagedStudents, loadFaculties]);

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

  return (
    <div className="page-content">
      <div className="container">
        <div className="admin-header animate-fadeInUp">
          <div>
            <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={28} className="text-gradient" /> <span className="text-gradient">{panelTitle}</span></h1>
            <p className="section-subtitle">Sri Shakthi Institute of Engineering and Technology — CSE Department</p>
          </div>
          <div className="badge badge-gold" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> {user.name}</div>
        </div>

        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: 28, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => handleTabClick(t.id)}>{t.l}</button>
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
                        style={{ background: selectedIds.has(s.id) ? 'var(--green-50)' : undefined, animation: `fadeInUp 0.25s ease ${i * 0.015}s both` }}
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
                          <div style={{ width: 34, height: 34, background: 'var(--btn-primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--btn-primary-color)', fontSize: 13, flexShrink: 0 }}>
                            {s.name[0]}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</Link>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{s.roll_no}</span>
                        <span><span className="badge badge-violet">{s.class}</span></span>
                        <span><span className="badge badge-blue">{s.batch}</span></span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.date_of_birth || '—'}</span>
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
            {tab === 'faculty' && isAdmin && (
              <div className="animate-fadeIn">
                <div className="section-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)' }}><GraduationCap size={20} /> CSE Faculty & Advisors</h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Authorized faculty accounts for student mentoring and departmental administration.</p>
                  </div>
                  {isFullAdmin && (
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowAddFacModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={16} /> Add Faculty
                    </button>
                  )}
                </div>

                {/* ── Faculty Accounts Summary Card ── */}
                <div className="card" style={{ padding: '16px 24px', marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Department Faculty Directory</span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                        (Authorized CSE staff & class advisors)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-green" style={{ fontWeight: 700, fontSize: 13, padding: '4px 12px' }}>
                        {faculties.length} Active Accounts
                      </span>
                    </div>
                  </div>
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
                    <div className="manage-table-header" style={{ gridTemplateColumns: isFullAdmin ? '1.5fr 1.2fr 1fr 1fr 1fr 140px' : '1.5fr 1.2fr 1fr 1fr 1.2fr' }}>
                      <span>Faculty Member</span>
                      <span>Username & ID</span>
                      <span>Designation</span>
                      <span>Department</span>
                      <span>Advising Section</span>
                      {isFullAdmin && <span>Manage</span>}
                    </div>
                    {faculties.map((f, i) => (
                      <div key={f.id} className="manage-table-row" style={{ gridTemplateColumns: isFullAdmin ? '1.5fr 1.2fr 1fr 1fr 1fr 140px' : '1.5fr 1.2fr 1fr 1fr 1.2fr', animation: `fadeInUp 0.3s ease ${i * 0.02}s both` }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{f.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{f.email}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: 13 }}>@{f.username || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{f.employee_id || '—'}</div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{f.designation || '—'}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{f.department || 'CSE'}</div>
                        <div>
                          {f.advising_class ? (
                            <span className="badge badge-green">{f.advising_class} {f.advising_batch ? `(${f.advising_batch})` : ''}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </div>
                        {isFullAdmin && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative', zIndex: 5 }}>
                            <SplitActions
                              primaryLabel="Adjust"
                              primaryIcon={Edit3}
                              onPrimaryClick={() => setEditFaculty(f)}
                              dropdownActions={[
                                {
                                  label: 'Reset Password',
                                  icon: Key,
                                  onClick: () => handleResetFacultyPassword(f)
                                },
                                {
                                  label: 'Delete Faculty',
                                  icon: Trash2,
                                  onClick: () => setDeleteFacultyTarget(f),
                                  destructive: true,
                                  hidden: f.user_id === user?.id || f.id === user?.id
                                }
                              ]}
                              ariaLabel="More faculty actions"
                            />
                          </div>
                        )}
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





            {/* ── TEAM OD & EVENT REPORTING (Faculty & Staff embedded tab) ── */}
            {tab === 'team-od' && canAccessTeamOd && (
              <TeamOdFaculty />
            )}

            {/* ── TEAM OD REPORTING MANAGEMENT (HOD / Admin embedded tab) ── */}
            {tab === 'team-od-mgmt' && isFullAdmin && (
              <TeamOdManagement />
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

      {/* ── Temporary Password Display Modal ── */}
      {tempPasswordModal && (
        <div 
          className="modal-overlay animate-fadeIn" 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 999999, 
            background: 'rgba(0, 0, 0, 0.8)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16 
          }}
          onClick={() => setTempPasswordModal(null)}
        >
          <div 
            className="card animate-scaleUp" 
            style={{ 
              maxWidth: 460, 
              width: '100%', 
              padding: 28, 
              textAlign: 'center', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: 20, 
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)' 
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Key size={26} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--color-text)' }}>
              {tempPasswordModal.role || 'Account'} Password Reset
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              A secure temporary password has been generated for <strong>{tempPasswordModal.name}</strong> ({tempPasswordModal.username ? `@${tempPasswordModal.username}` : ''}). They will be required to choose a new password upon their next login.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-input)', borderRadius: 12, border: '1.5px solid var(--border)', marginBottom: 22 }}>
              <code style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', color: '#10b981', fontFamily: 'monospace' }}>
                {tempPasswordModal.password}
              </code>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  navigator.clipboard.writeText(tempPasswordModal.password);
                  showToast('Temporary password copied to clipboard! 📋');
                }}
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 700 }} onClick={() => setTempPasswordModal(null)}>
              Done
            </button>
          </div>
        </div>
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
