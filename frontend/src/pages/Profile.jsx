import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ScoreBadge from '../components/ScoreBadge';
import AchievementCard from '../components/AchievementCard';

const ACH_TYPES = ['hackathon', 'internship', 'course', 'project', 'certification'];
const POSITIONS = ['1st', '2nd', '3rd', 'participated'];
const DURATIONS = ['short', 'medium', 'long'];

const getBatchString = (year) => {
  if (!year) return '';
  const joinYear = 2026 - parseInt(year);
  return `Batch ${String(joinYear).slice(-2)}-${String(joinYear + 4).slice(-2)}`;
};

export default function Profile() {
  const { id } = useParams();
  const { user: authUser, refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ type: 'hackathon', title: '', description: '', position: '', duration: '', proof_url: '' });
  const [toast, setToast] = useState(null);
  const isOwn = authUser?.id === id;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      const [userRes, achRes] = await Promise.all([
        client.get(`/users/${id}`),
        client.get(`/achievements/user/${id}`)
      ]);
      setUser(userRes.data);
      setAchievements(achRes.data);
      setUser(userRes.data);
      setAchievements(achRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const addAchievement = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/achievements', form);
      setAchievements(prev => [data, ...prev]);
      setUser(u => ({ ...u, score: u.score + data.points, achievement_count: u.achievement_count + 1 }));
      setShowAddModal(false);
      setForm({ type: 'hackathon', title: '', description: '', position: '', duration: '', proof_url: '' });
      showToast(`+${data.points} points added! 🎉`);
      if (isOwn) refreshUser();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add achievement', 'error');
    }
  };

  const deleteAchievement = async (achId) => {
    const ach = achievements.find(a => a.id === achId);
    if (!ach) return;
    await client.delete(`/achievements/${achId}`);
    setAchievements(prev => prev.filter(a => a.id !== achId));
    setUser(u => ({ ...u, score: u.score - ach.points, achievement_count: u.achievement_count - 1 }));
    showToast('Achievement removed');
    if (isOwn) refreshUser();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <div className="page-content container"><div className="empty-state"><h3>User not found</h3></div></div>;

  const rank = user.score >= 300 ? 'Platinum' : user.score >= 200 ? 'Gold' : user.score >= 100 ? 'Silver' : 'Bronze';
  const typeBreakdown = ACH_TYPES.map(t => ({
    type: t, count: achievements.filter(a => a.type === t).length,
    pts: achievements.filter(a => a.type === t).reduce((s, a) => s + a.points, 0)
  })).filter(t => t.count > 0);

  return (
    <div className="page-content">
      <div className="container">
        {/* Profile Header */}
        <div className="profile-header card animate-fadeInUp">
          <div className="profile-hero-bg" />
          <div className="profile-main">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">{user.name[0]}</div>
            </div>
            <div className="profile-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 className="profile-name">{user.name}</h1>
                <span className="badge badge-violet">{rank} Tier</span>
                {user.is_admin && <span className="badge badge-gold">👨‍🏫 Admin</span>}
              </div>
              <div className="profile-meta">
                <span>📚 {user.class}</span>
                <span>•</span>
                <span>{getBatchString(user.year)}</span>
                <span>•</span>
                <span>🎓 Sri Shakthi Institute, Coimbatore</span>
              </div>

              {user.bio && <p className="profile-bio">{user.bio}</p>}

              <div className="profile-links">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {user.github && (
                    <a href={`https://github.com/${user.github}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      🔗 GitHub
                    </a>
                  )}
                  {user.linkedin && (
                    <a href={`https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      💼 LinkedIn
                    </a>
                  )}
                  {user.phone && (
                    <a href={`https://wa.me/${user.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      📞 {user.phone}
                    </a>
                  )}
                  {!user.github && !user.linkedin && !user.phone && isOwn && (
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>✏️ Click Edit Profile to add your links</span>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <ScoreBadge score={user.score} size="lg" />
              {isOwn && (
                <Link to="/edit-profile" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
                  ✏️ Edit Profile
                </Link>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="profile-stats">
            <div className="p-stat"><div className="p-stat-n">{user.achievement_count}</div><div className="p-stat-l">Achievements</div></div>
            <div className="p-stat-divider" />
            <div className="p-stat"><div className="p-stat-n">{user.score}</div><div className="p-stat-l">Total Points</div></div>
            <div className="p-stat-divider" />
            <div className="p-stat"><div className="p-stat-n">{getBatchString(user.year).replace('Batch ', '')}</div><div className="p-stat-l">Batch</div></div>
            <div className="p-stat-divider" />
            <div className="p-stat"><div className="p-stat-n">{user.class}</div><div className="p-stat-l">Section</div></div>
          </div>
        </div>

        {/* Breakdown */}
        {typeBreakdown.length > 0 && (
          <div className="breakdown-grid animate-fadeInUp delay-1">
            {typeBreakdown.map(b => (
              <div key={b.type} className={`breakdown-card card badge ${b.type === 'hackathon' ? 'type-hackathon' : b.type === 'internship' ? 'type-internship' : b.type === 'course' ? 'type-course' : b.type === 'project' ? 'type-project' : 'type-certification'}`} style={{ display: 'block', padding: '16px 20px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{b.count}</div>
                <div style={{ fontSize: 12, textTransform: 'capitalize', marginBottom: 2 }}>{b.type}s</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>+{b.pts} pts</div>
              </div>
            ))}
          </div>
        )}

        {/* Achievements */}
        <div className="animate-fadeInUp delay-2">
          <div className="section-header" style={{ marginTop: '36px' }}>
            <h2 className="section-title">🏅 Achievements</h2>
            {isOwn && <button id="add-achievement-btn" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add Achievement</button>}
          </div>

          {achievements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No achievements yet</h3>
              <p>{isOwn ? 'Add your first achievement to start earning points!' : 'This student hasn\'t added any achievements yet.'}</p>
              {isOwn && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>+ Add First Achievement</button>}
            </div>
          ) : (
            <div className="grid-auto">
              {achievements.map(a => (
                <AchievementCard key={a.id} achievement={a} showDelete={isOwn || authUser?.is_admin} onDelete={deleteAchievement} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Achievement Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">➕ Add Achievement</h2>
              <button className="modal-close btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={addAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, position: '', duration: '' }))}>
                  {ACH_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Smart India Hackathon 2025" required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description..." style={{ resize: 'vertical' }} />
              </div>

              {form.type === 'hackathon' && (
                <div className="form-group">
                  <label className="form-label">Position *</label>
                  <select className="form-select" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} required>
                    <option value="">Select position</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p === 'participated' ? 'Participated' : `${p} Place`}</option>)}
                  </select>
                </div>
              )}

              {form.type === 'internship' && (
                <div className="form-group">
                  <label className="form-label">Duration *</label>
                  <select className="form-select" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required>
                    <option value="">Select duration</option>
                    <option value="short">Short (less than 1 month)</option>
                    <option value="medium">Medium (1–3 months)</option>
                    <option value="long">Long (3+ months)</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Proof URL (certificate / LinkedIn post)</label>
                <input className="form-input" type="url" value={form.proof_url} onChange={e => setForm(f => ({ ...f, proof_url: e.target.value }))} placeholder="https://..." />
              </div>

              <div className="alert alert-info">
                💡 Points: {
                  form.type === 'hackathon' ? (form.position === '1st' ? 100 : form.position === '2nd' ? 60 : form.position === '3rd' ? 40 : 10)
                  : form.type === 'internship' ? (form.duration === 'long' ? 70 : form.duration === 'medium' ? 40 : 20)
                  : form.type === 'course' ? 15 : form.type === 'project' ? 25 : 10
                } pts will be added to your score.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Achievement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .profile-header { overflow: hidden; position: relative; margin-bottom: 16px; }
        .profile-hero-bg { position: absolute; top: 0; left: 0; right: 0; height: 100px; background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1)); }
        .profile-main { position: relative; display: flex; align-items: flex-start; gap: 24px; padding: 28px 28px 20px; flex-wrap: wrap; }
        .profile-avatar-wrap { flex-shrink: 0; }
        .profile-avatar { width: 90px; height: 90px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; color: #fff; border: 3px solid rgba(255,255,255,0.1); box-shadow: 0 8px 25px rgba(124,58,237,0.35); }
        .profile-info { flex: 1; min-width: 0; padding-top: 8px; }
        .profile-name { font-size: 26px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; }
        .profile-meta { display: flex; gap: 8px; font-size: 13px; color: var(--color-text-muted); margin-top: 6px; align-items: center; flex-wrap: wrap; }
        .profile-bio { font-size: 14px; color: var(--color-text-muted); margin-top: 10px; line-height: 1.6; }
        .profile-links { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .profile-link { font-size: 13px; font-weight: 600; color: var(--color-violet-light); padding: 5px 12px; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); border-radius: var(--radius-full); }
        .profile-actions { margin-left: auto; display: flex; flex-direction: column; align-items: center; padding-top: 8px; }
        .profile-stats { display: flex; gap: 0; border-top: 1px solid var(--border); padding: 16px 28px; align-items: center; }
        .p-stat { flex: 1; text-align: center; }
        .p-stat-n { font-size: 22px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; color: var(--color-text); }
        .p-stat-l { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
        .p-stat-divider { width: 1px; background: var(--border); height: 32px; }
        .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 8px; }
        .breakdown-card { text-align: center; }
      `}</style>
    </div>
  );
}
