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
    setActionInProgress(ach.id);
    try {
      const res = await client.patch(`/achievements/${ach.id}/approve`);
      const resData = res.data || {};
      setAchievements(prev => prev.filter(a => a.id !== ach.id));
      showToast(`✓ Approved "${ach.title}"! +${ach.points} pts awarded to ${ach.student_name}.`);

      dispatchAchievementEvent({
        action: 'approved',
        userId: resData.userId || ach.user_id,
        achievement: resData.achievement,
        score: resData.score,
        achievement_count: resData.achievement_count
      });
    } catch (err) {
      showToast(err.response?.data?.error || 'Approval failed. Please try again.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (ach, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Please provide a reason for rejection.', 'error');
      return;
    }
    const cleanReason = reason.trim();
    setActionInProgress(ach.id);
    setRejectConfirm(null);
    try {
      const res = await client.patch(`/achievements/${ach.id}/reject`, { rejection_reason: cleanReason });
      const resData = res.data || {};
      setAchievements(prev => prev.filter(a => a.id !== ach.id));
      showToast(`✕ Rejected submission for ${ach.student_name}.`, 'error');

      dispatchAchievementEvent({
        action: 'rejected',
        userId: resData.userId || ach.user_id,
        achievement: resData.achievement,
        score: resData.score,
        achievement_count: resData.achievement_count
      });
    } catch (err) {
      showToast(err.response?.data?.error || 'Rejection failed. Please try again.', 'error');
    } finally {
      setActionInProgress(null);
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

        {/* List of Pending Items */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card skeleton-card" style={{ height: 140, padding: 20 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>All Caught Up!</h3>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 420, margin: '0 auto', fontSize: 14 }}>
              {search || typeFilter !== 'all' || classFilter !== 'all' 
                ? 'No pending achievements match your active filters.' 
                : 'There are no pending student achievement submissions waiting for verification.'}
            </p>
          </div>
        ) : (
          <div className="approvals-list">
            {filtered.map(ach => {
              const cfg = TYPE_CONFIG[ach.type] || TYPE_CONFIG.course;
              const isWorking = actionInProgress === ach.id;

              return (
                <div key={ach.id} className="card approval-card animate-fadeInUp">
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
                          <span className="badge badge-green" style={{ fontSize: 11, padding: '2px 8px' }}>{ach.roll_no}</span>
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
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRejectConfirm(null)}>
            <div className="modal" style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626' }}>
                  <XCircle size={22} /> Reject Achievement
                </h2>
                <button className="modal-close btn btn-ghost" onClick={() => setRejectConfirm(null)}>✕</button>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Rejecting <strong>"{rejectConfirm.title}"</strong> submitted by <strong>{rejectConfirm.student_name}</strong>. The achievement will remain in the student's profile marked as 🔴 <strong>Rejected</strong>, and 0 points will be added to the leaderboard.
              </p>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                  Reason for Rejection <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Uploaded certificate does not clearly show the student's name..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setRejectConfirm(null)}>Cancel</button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleReject(rejectConfirm, rejectionReason)}
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Rejection
                </button>
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
