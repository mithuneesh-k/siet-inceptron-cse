import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, CheckCircle, XCircle, ExternalLink, Award, Trophy, 
  Briefcase, Zap, BookOpen, Rocket, Search, Filter, Hourglass, 
  FileText, Check, X, ArrowLeft, RefreshCw, AlertCircle, Calendar
} from 'lucide-react';

import { dispatchAchievementEvent, subscribeAchievementEvents } from '../utils/achievementEvents';

const TYPE_CONFIG = {
  hackathon: { icon: <Zap size={14} />, label: 'Hackathon', badgeClass: 'type-hackathon' },
  internship: { icon: <Briefcase size={14} />, label: 'Internship', badgeClass: 'type-internship' },
  course: { icon: <BookOpen size={14} />, label: 'Course', badgeClass: 'type-course' },
  project: { icon: <Rocket size={14} />, label: 'Project', badgeClass: 'type-project' },
  certification: { icon: <Award size={14} />, label: 'Certification', badgeClass: 'type-certification' },
};

const POSITION_LABEL = { 
  '1st': '🥇 1st Place', 
  '2nd': '🥈 2nd Place', 
  '3rd': '🥉 3rd Place', 
  participated: '🎖️ Participated' 
};

const DURATION_LABEL = { 
  short: '⏱️ < 1 Month', 
  medium: '⏱️ 1–3 Months', 
  long: '⏱️ 3+ Months' 
};

export default function Approvals() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const areAchievementsEqual = (listA, listB) => {
    if (listA === listB) return true;
    if (!listA || !listB) return false;
    if (listA.length !== listB.length) return false;

    for (let i = 0; i < listA.length; i++) {
      const a = listA[i];
      const b = listB[i];
      if (
        a.id !== b.id ||
        a.user_id !== b.user_id ||
        a.status !== b.status ||
        a.verified !== b.verified ||
        a.title !== b.title ||
        a.description !== b.description ||
        a.position !== b.position ||
        a.duration !== b.duration ||
        a.points !== b.points ||
        a.student_name !== b.student_name ||
        a.roll_no !== b.roll_no ||
        a.class !== b.class ||
        a.batch !== b.batch ||
        a.created_at !== b.created_at
      ) {
        return false;
      }
    }
    return true;
  };

  const fetchPending = async ({ showLoader = false, isManualRefresh = false } = {}) => {
    if (showLoader) setLoading(true);
    if (isManualRefresh) setRefreshing(true);

    try {
      const res = await client.get('/achievements/all/pending');
      const newData = res.data || [];
      setAchievements(prev => {
        if (areAchievementsEqual(prev, newData)) {
          return prev;
        }
        return newData;
      });
    } catch {
      if (showLoader || isManualRefresh) {
        showToast('Failed to load pending achievements.', 'error');
      }
    } finally {
      if (showLoader) setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPending({ showLoader: true });

    const unsubscribe = subscribeAchievementEvents((detail) => {
      const { action, achievement, achievementId } = detail;
      if (action === 'created' && achievement && (achievement.status === 'pending' || !achievement.verified)) {
        setAchievements(prev => {
          if (prev.some(a => a.id === achievement.id)) return prev;
          return [achievement, ...prev];
        });
      } else if ((action === 'approved' || action === 'rejected' || action === 'deleted') && (achievementId || achievement?.id)) {
        const targetId = achievementId || achievement?.id;
        setAchievements(prev => prev.filter(a => a.id !== targetId));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isAdmin = Boolean(user && (user.is_admin || user.role === 'admin' || user.role === 'faculty'));
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleApprove = async (ach) => {
    // 1. Instantly remove locally from UI & update notification badge (0ms delay)
    setAchievements(prev => prev.filter(a => a.id !== ach.id));
    showToast(`✓ Approved "${ach.title}"! +${ach.points} pts awarded to ${ach.student_name}.`);

    dispatchAchievementEvent({
      action: 'approved',
      userId: ach.user_id,
      achievementId: ach.id,
      achievement: { ...ach, status: 'approved', verified: true }
    });

    try {
      const res = await client.patch(`/achievements/${ach.id}/approve`);
      const resData = res.data || {};
      if (typeof resData.score === 'number') {
        dispatchAchievementEvent({
          action: 'approved',
          userId: resData.userId || ach.user_id,
          achievement: resData.achievement || { ...ach, status: 'approved', verified: true },
          score: resData.score,
          achievement_count: resData.achievement_count
        });
      }
    } catch (err) {
      // Rollback on failure
      setAchievements(prev => [ach, ...prev]);
      dispatchAchievementEvent({
        action: 'created',
        userId: ach.user_id,
        achievement: ach
      });
      showToast(err.response?.data?.error || 'Approval failed. Please try again.', 'error');
    }
  };

  const handleReject = async (ach, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Please provide a reason for rejection.', 'error');
      return;
    }
    const cleanReason = reason.trim();
    setRejectConfirm(null);

    // 1. Instantly remove locally from UI & update notification badge (0ms delay)
    setAchievements(prev => prev.filter(a => a.id !== ach.id));
    showToast(`✕ Rejected submission for ${ach.student_name}.`, 'error');

    dispatchAchievementEvent({
      action: 'rejected',
      userId: ach.user_id,
      achievementId: ach.id,
      achievement: { ...ach, status: 'rejected', verified: false, rejection_reason: cleanReason }
    });

    try {
      const res = await client.patch(`/achievements/${ach.id}/reject`, { rejection_reason: cleanReason });
      const resData = res.data || {};
      if (typeof resData.score === 'number') {
        dispatchAchievementEvent({
          action: 'rejected',
          userId: resData.userId || ach.user_id,
          achievement: resData.achievement || { ...ach, status: 'rejected', verified: false, rejection_reason: cleanReason },
          score: resData.score,
          achievement_count: resData.achievement_count
        });
      }
    } catch (err) {
      // Rollback on failure
      setAchievements(prev => [ach, ...prev]);
      dispatchAchievementEvent({
        action: 'created',
        userId: ach.user_id,
        achievement: ach
      });
      showToast(err.response?.data?.error || 'Rejection failed. Please try again.', 'error');
    }
  };

  // Filtering
  const filtered = achievements.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = 
      !search ||
      a.title?.toLowerCase().includes(q) ||
      a.student_name?.toLowerCase().includes(q) ||
      a.roll_no?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q);

    const matchType = typeFilter === 'all' || a.type === typeFilter;
    const matchClass = classFilter === 'all' || a.class === classFilter;

    return matchSearch && matchType && matchClass;
  });

  const totalPendingPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);
  const classes = [...new Set(achievements.map(a => a.class).filter(Boolean))].sort();

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="approvals-header animate-fadeInUp">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Link to="/admin" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                <ArrowLeft size={16} /> Admin Panel
              </Link>
            </div>
            <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={28} className="text-gradient" /> 
              <span className="text-gradient">Achievement Approval Portal</span>
            </h1>
            <p className="section-subtitle">
              Inspect student achievement submissions, verify attached documentation, and award merit points.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchPending({ isManualRefresh: true })} disabled={loading || refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} className={refreshing ? 'anim-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="approvals-stats animate-fadeInUp delay-1">
          <div className="card approval-stat-card">
            <div className="stat-icon" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#EA580C' }}>
              <Hourglass size={22} />
            </div>
            <div>
              <div className="stat-val">{achievements.length}</div>
              <div className="stat-label">Pending Reviews</div>
            </div>
          </div>

          <div className="card approval-stat-card">
            <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#CA8A04' }}>
              <Trophy size={22} />
            </div>
            <div>
              <div className="stat-val">+{totalPendingPoints}</div>
              <div className="stat-label">Points to Award</div>
            </div>
          </div>

          <div className="card approval-stat-card">
            <div className="stat-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>
              <Zap size={22} />
            </div>
            <div>
              <div className="stat-val">{achievements.filter(a => a.type === 'hackathon').length}</div>
              <div className="stat-label">Hackathons</div>
            </div>
          </div>

          <div className="card approval-stat-card">
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-green)' }}>
              <Briefcase size={22} />
            </div>
            <div>
              <div className="stat-val">{achievements.filter(a => a.type === 'internship').length}</div>
              <div className="stat-label">Internships</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card animate-fadeInUp delay-2" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1, minWidth: 260 }}>
            <div className="search-input-wrap" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search by student, roll no, or title..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: 36, height: 40 }}
              />
            </div>

            <select 
              className="form-select" 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 140, height: 40 }}
            >
              <option value="all">All Types</option>
              <option value="hackathon">Hackathon</option>
              <option value="internship">Internship</option>
              <option value="project">Project</option>
              <option value="course">Course</option>
              <option value="certification">Certification</option>
            </select>

            {classes.length > 0 && (
              <select 
                className="form-select" 
                value={classFilter} 
                onChange={e => setClassFilter(e.target.value)}
                style={{ width: 'auto', minWidth: 130, height: 40 }}
              >
                <option value="all">All Sections</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Showing {filtered.length} of {achievements.length}
          </span>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="grid-auto" style={{ gap: 20 }}>
            <div className="card skeleton-card" style={{ height: 200 }} />
            <div className="card skeleton-card" style={{ height: 200 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card empty-state animate-fadeInUp">
            <div className="empty-icon">
              <CheckCircle size={48} color="var(--color-green)" style={{ opacity: 0.8 }} />
            </div>
            <h3>All Caught Up! 🎉</h3>
            <p>
              {achievements.length === 0 
                ? 'There are no pending achievement submissions awaiting review.' 
                : 'No pending submissions match your current search filters.'}
            </p>
          </div>
        ) : (
          <div className="approvals-list animate-fadeInUp delay-3" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filtered.map(ach => {
              const cfg = TYPE_CONFIG[ach.type] || TYPE_CONFIG.certification;
              const isWorking = actionInProgress === ach.id;

              return (
                <div key={ach.id} className="card approval-card" style={{ opacity: isWorking ? 0.6 : 1, transition: 'all 0.2s ease' }}>
                  {/* Left: Student Meta & Type */}
                  <div className="approval-card-main">
                    <div className="student-profile-strip">
                      <div className="student-avatar-sm">
                        {ach.avatar_url ? (
                          <img src={ach.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          ach.student_name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Link to={`/profile/${ach.user_id}`} className="student-name-link">
                            {ach.student_name}
                          </Link>
                          <span className="badge" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--color-text-muted)', background: 'rgba(255, 255, 255, 0.08)', borderColor: 'var(--color-border)' }}>{ach.roll_no}</span>
                          {ach.class && <span className="badge" style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-hover)' }}>{ach.class}</span>}
                          {ach.batch && <span className="badge" style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-hover)' }}>{ach.batch}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} /> Submitted {new Date(ach.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Achievement Details */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className={`badge ${cfg.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {cfg.icon} {cfg.label}
                        </span>

                        {ach.position && (
                          <span className="badge badge-gold" style={{ fontSize: 12 }}>
                            {POSITION_LABEL[ach.position] || ach.position}
                          </span>
                        )}

                        {ach.duration && (
                          <span className="badge" style={{ fontSize: 12, background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                            {DURATION_LABEL[ach.duration] || ach.duration}
                          </span>
                        )}

                        <span className="points-pill">
                          +{ach.points} Points
                        </span>
                      </div>

                      <h3 className="achievement-heading">{ach.title}</h3>
                      
                      {ach.description && (
                        <p className="achievement-desc-box">
                          "{ach.description}"
                        </p>
                      )}
                    </div>

                    {/* Document / Proof Section */}
                    <div className="proof-inspection-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} color="var(--color-green)" />
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Verification Document:</span>
                      </div>

                      {ach.proof_url ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <a 
                            href={ach.proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, borderColor: 'var(--color-green)', color: 'var(--color-green)' }}
                          >
                            <ExternalLink size={14} /> Inspect Document / Certificate ↗
                          </a>
                          <span style={{ fontSize: 12, color: 'var(--color-text-faint)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ach.proof_url}
                          </span>
                        </div>
                      ) : (
                        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={12} /> No document link provided
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Decision Actions */}
                  <div className="approval-card-actions">
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleApprove(ach)}
                      disabled={isWorking}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', minWidth: 150 }}
                    >
                      <Check size={16} /> Approve & Award
                    </button>

                    <button 
                      className="btn btn-danger" 
                      onClick={() => { setRejectionReason('Verification document incomplete or invalid'); setRejectConfirm(ach); }}
                      disabled={isWorking}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', minWidth: 150 }}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {rejectConfirm && (
          <div className="modal-overlay animate-fadeIn" onClick={e => e.target === e.currentTarget && setRejectConfirm(null)}>
            <div className="modal card" style={{ maxWidth: 500, padding: 0, overflow: 'hidden', border: '1px solid rgba(220, 38, 38, 0.25)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)' }}>
              
              {/* Modal Banner Header */}
              <div style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)', padding: '18px 24px', borderBottom: '1px solid rgba(220, 38, 38, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: '#DC2626', color: '#fff', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}>
                    <XCircle size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Reject Achievement</h2>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Provide feedback for student rejection</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setRejectConfirm(null)} style={{ padding: 6, borderRadius: '50%' }}><X size={18} /></button>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Context Card */}
                <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Submission Details</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>"{rejectConfirm.title}"</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>Submitted by <strong>{rejectConfirm.student_name}</strong> ({rejectConfirm.roll_no || rejectConfirm.class || 'Student'})</div>
                </div>

                {/* Quick Chips */}
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6, display: 'block', color: 'var(--color-text-muted)' }}>Quick Reason Selection:</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      'Verification document incomplete or invalid',
                      'Student name missing on certificate',
                      'Invalid or unreadable document link',
                      'Duplicate achievement submission'
                    ].map(reason => (
                      <button
                        key={reason}
                        type="button"
                        className="btn btn-xs"
                        style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: rejectionReason === reason ? 'rgba(220, 38, 38, 0.15)' : 'var(--bg-hover)',
                          color: rejectionReason === reason ? '#DC2626' : 'var(--color-text-muted)',
                          border: rejectionReason === reason ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid var(--color-border)',
                          fontWeight: rejectionReason === reason ? 700 : 500
                        }}
                        onClick={() => setRejectionReason(reason)}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                    Detailed Rejection Reason <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Enter rejection reason for the student..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    style={{ resize: 'vertical', fontSize: 13.5, borderRadius: 'var(--radius-md)' }}
                    required
                  />
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setRejectConfirm(null)} style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleReject(rejectConfirm, rejectionReason)}
                    disabled={!rejectionReason.trim()}
                    style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <XCircle size={15} /> Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
            {toast.msg}
          </div>
        )}

        <style>{`
          .approvals-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }
          .approvals-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .approval-stat-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 18px 20px;
          }
          .stat-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .stat-val {
            font-size: 24px;
            font-weight: 900;
            font-family: 'Space Grotesk', sans-serif;
            color: var(--color-text);
          }
          .stat-label {
            font-size: 12px;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-top: 2px;
          }
          .approvals-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .approval-card {
            padding: 22px 24px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            transition: all var(--transition);
          }
          .approval-card:hover {
            border-color: var(--color-green);
          }
          @media (max-width: 768px) {
            .approval-card {
              flex-direction: column;
            }
          }
          .approval-card-main {
            flex: 1;
            min-width: 0;
          }
          .approval-card-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex-shrink: 0;
            align-self: center;
          }
          @media (max-width: 768px) {
            .approval-card-actions {
              flex-direction: row;
              width: 100%;
            }
          }
          .student-profile-strip {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .student-avatar-sm {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--color-green);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            flex-shrink: 0;
          }
          .student-name-link {
            font-weight: 700;
            font-size: 15px;
            color: var(--color-text);
            text-decoration: none;
          }
          .student-name-link:hover {
            color: var(--color-green);
          }
          .achievement-heading {
            font-size: 18px;
            font-weight: 800;
            line-height: 1.35;
            color: var(--color-text);
            margin-bottom: 8px;
          }
          .achievement-desc-box {
            font-size: 14px;
            line-height: 1.6;
            color: var(--color-text-muted);
            background: var(--bg-hover);
            padding: 10px 14px;
            border-radius: 8px;
            margin-bottom: 12px;
            font-style: italic;
          }
          .points-pill {
            font-size: 12px;
            font-weight: 800;
            font-family: 'Space Grotesk', sans-serif;
            color: var(--color-gold);
            background: rgba(234, 179, 8, 0.1);
            padding: 3px 8px;
            border-radius: var(--radius-full);
            border: 1px solid rgba(234, 179, 8, 0.25);
          }
          .proof-inspection-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            padding: 12px 16px;
            background: rgba(34, 197, 94, 0.04);
            border: 1px solid rgba(34, 197, 94, 0.15);
            border-radius: 10px;
            margin-top: 14px;
          }
        `}</style>
      </div>
    </div>
  );
}
