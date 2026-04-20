import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import StudentActionModal from '../components/StudentActionModal';
import ImportModal from '../components/ImportModal';
import CustomSelect from '../components/CustomSelect';
import FilterModal from '../components/FilterModal';
import FacultyAdvisorModal from '../components/FacultyAdvisorModal';
import FacultyActionModal from '../components/FacultyActionModal';
import { 
  Shield, BarChart2, Users, Settings, GraduationCap, Hourglass, 
  Award, TrendingUp, List, RefreshCw, Trash2, Download, Plus, 
  Edit3, Key, Check, X, ExternalLink, Inbox
} from 'lucide-react';

const CLASSES = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function Admin() {
  const { user, refreshUser } = useAuth();
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

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load overview data
  useEffect(() => {
    refreshUser();
    Promise.all([
      client.get('/admin/students'), // Simplified call for overview, we'll refactor later if needed
      client.get('/achievements/all/pending'),
    ]).then(([uRes, aRes]) => {
      setStudents(uRes.data);
      setAchievements(aRes.data);
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

  useEffect(() => {
    if (tab === 'manage') loadManagedStudents();
    if (tab === 'faculty') loadFaculties();
  }, [tab, loadManagedStudents, loadFaculties]);

  if (!user?.is_admin) return <Navigate to="/" replace />;

  const totalScore = students.reduce((s, u) => s + u.score, 0);
  const avgScore = students.length ? Math.round(totalScore / students.length) : 0;

  const verifyAch = async (id, verified) => {
    try {
      if (verified) {
        await client.patch(`/achievements/${id}/verify`, { verified: true });
        showToast('Achievement verified ✅');
      } else {
        await client.delete(`/achievements/${id}`);
        showToast('Achievement rejected ✕', 'error');
      }
      setAchievements(prev => prev.filter(a => a.id !== id));
    } catch {
      showToast('Action failed.', 'error');
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
    try {
      await client.delete(`/admin/students/${s.id}`);
      setManagedStudents(prev => prev.filter(st => st.id !== s.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(s.id); return n; });
      setDeleteConfirm(null);
      showToast(<span><Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {s.name} deleted.</span>);
    } catch {
      showToast('Failed to delete student.', 'error');
    }
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

  const isFullAdmin = user?.role === 'admin' || user?.designation?.toUpperCase() === 'HOD';

  // Auto-populate filters for restricted advisors
  useEffect(() => {
    if (user && !isFullAdmin) {
      if (user.advising_class) setFilterClass(user.advising_class);
      if (user.advising_batch) setFilterBatch(user.advising_batch);
    }
  }, [user, isFullAdmin]);

  const tabs = [
    { id: 'overview', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={16} /> Overview</span> },
    { id: 'students', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Students</span> },
    { id: 'manage', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} /> Manage</span> },
    ...(isFullAdmin ? [{ id: 'faculty', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={16} /> Faculty</span> }] : []),
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
            {tab === 'overview' && (
              <div className="animate-fadeIn">
                <div className="admin-stats">
                  {[
                    { n: students.length, l: 'Total Students', i: <Users size={28} />, c: 'var(--color-violet)' },
                    { n: students.reduce((s, u) => s + u.achievement_count, 0), l: 'Total Achievements', i: <Award size={28} />, c: 'var(--color-gold)' },
                    { n: avgScore, l: 'Avg Score', i: <TrendingUp size={28} />, c: 'var(--color-blue)' },
                    { n: achievements.length, l: 'Pending Reviews', i: <Hourglass size={28} />, c: 'var(--color-orange)' },
                  ].map((s, i) => (
                    <div key={i} className="admin-stat card" style={{ borderTop: `3px solid ${s.c}` }}>
                      <div>{s.i}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Space Grotesk', sans-serif", color: s.c }}>{s.n}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: '20px 24px', marginTop: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><List size={18} /> Top 5 Students by Score</h3>
                  {students.slice(0, 5).map((s, i) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, fontSize: 16, minWidth: 24 }}>#{i + 1}</span>
                      <div style={{ width: 36, height: 36, background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>{s.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</Link>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.class} · {s.batch || 'No batch'}</div>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontFamily: "'Space Grotesk', sans-serif" }}>{s.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <input
                      className="form-input"
                      style={{ maxWidth: 260 }}
                      placeholder="Search by name…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
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
                      <span>Actions</span>
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
                          <div style={{ width: 34, height: 34, background: 'var(--color-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>
                            {s.name[0]}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</Link>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>{s.roll_no}</span>
                        <span><span className="badge badge-violet">{s.class}</span></span>
                        <span><span className="badge badge-blue">{s.batch}</span></span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.date_of_birth || '—'}</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                          <button className="btn btn-ghost btn-sm" title="Edit student" onClick={() => setEditStudent(s)}><Edit3 size={16} /></button>
                          <button className="btn btn-ghost btn-sm" title="Reset password to default" onClick={() => handleResetPassword(s)}><Key size={16} /></button>
                          <button className="btn btn-danger btn-sm" title="Delete student" onClick={() => setDeleteConfirm(s)}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>
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
                    <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={20} /> CSE Faculty & Advisors</h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Assigned class advisors have admin privileges for their specific class.</p>
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
                    <div className="manage-table-header" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 80px' }}>
                      <span>Faculty Name</span>
                      <span>Designation</span>
                      <span>Department</span>
                      <span>Advising Section</span>
                      <span>Advising Batch</span>
                      <span>Manage</span>
                    </div>
                    {faculties.map((f, i) => (
                      <div key={f.id} className="manage-table-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 80px', animation: `fadeInUp 0.3s ease ${i * 0.02}s both` }}>
                        <div style={{ fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{f.designation || '—'}</div>
                        <div style={{ fontSize: 13 }}>{f.department || 'CSE'}</div>
                        <div>{f.advising_class ? <span className="badge badge-green">{f.advising_class}</span> : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}</div>
                        <div>{f.advising_batch ? <span className="badge badge-violet">{f.advising_batch}</span> : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}</div>
                        <div>
                          <button className="btn btn-primary btn-sm" onClick={() => setEditFaculty(f)}>Adjust</button>
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
