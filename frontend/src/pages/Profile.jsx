import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ScoreBadge from '../components/ScoreBadge';
import AchievementCard from '../components/AchievementCard';
import CustomSelect from '../components/CustomSelect';

const ACH_TYPES = ['hackathon', 'internship', 'course', 'project', 'certification'];
const POSITIONS = ['1st', '2nd', '3rd', 'participated'];
const DURATIONS = ['short', 'medium', 'long'];

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
      // Points and count only update in DB/Refresh when verified.
      // For now, just show a message.
      setShowAddModal(false);
      setForm({ type: 'hackathon', title: '', description: '', position: '', duration: '', proof_url: '' });
      showToast(`Achievement submitted for approval! ⏳`);
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
          <div className="profile-main">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">{user.name[0]}</div>
            </div>
            <div className="profile-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 className="profile-name">{user.name}</h1>
                {user.role === 'student' && <span className="badge badge-violet">{rank} Tier</span>}
                {user.is_admin && <span className="badge badge-gold">👨‍🏫 {user.role === 'admin' ? 'Admin' : 'Faculty'}</span>}
              </div>
              <div className="profile-meta">
                {user.class && <><span>📚 {user.class}</span><span>•</span></>}
                {user.batch && <><span>{user.batch}</span><span>•</span></>}
                <span>🎓 Sri Shakthi Institute, Coimbatore</span>
              </div>

              {user.bio && <p className="profile-bio">{user.bio}</p>}

              <div className="profile-links">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {user.github && (
                    <a href={user.github.startsWith('http') ? user.github : `https://github.com/${user.github.startsWith('@') ? user.github.slice(1) : user.github}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      🐙 GitHub
                    </a>
                  )}
                  {user.linkedin && (
                    <a href={user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      💼 LinkedIn
                    </a>
                  )}
                  {user.twitter && (
                    <a href={user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter.startsWith('@') ? user.twitter.slice(1) : user.twitter}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      🐦 Twitter
                    </a>
                  )}
                  {user.instagram && (
                    <a href={user.instagram.startsWith('http') ? user.instagram : `https://instagram.com/${user.instagram.startsWith('@') ? user.instagram.slice(1) : user.instagram}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      📸 Instagram
                    </a>
                  )}
                  {user.portfolio && (
                    <a href={user.portfolio.startsWith('http') ? user.portfolio : `https://${user.portfolio}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      🌐 Portfolio
                    </a>
                  )}
                  {(user.phone && (user.phone_public || isOwn || authUser?.is_admin)) && (
                    <a href={`https://wa.me/${user.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      📞 {user.phone}
                    </a>
                  )}
                  {isOwn && (
                    <Link to="/edit-profile" className="profile-link profile-link-add">
                      ➕ Add links
                    </Link>
                  )}
                </div>
                {(user.date_of_birth && (user.dob_public || isOwn || authUser?.is_admin)) && (
                   <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                     🎂 {new Date(user.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                   </div>
                )}
              </div>
            </div>

            <div className="profile-actions">
              {user.role === 'student' && <ScoreBadge score={user.score} size="lg" />}
              {isOwn && (
                <Link to="/edit-profile" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
                  ✏️ Edit Profile
                </Link>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="profile-stats">
            {user.role === 'student' ? (
              <>
                <div className="p-stat"><div className="p-stat-n">{user.achievement_count}</div><div className="p-stat-l">Achievements</div></div>
                <div className="p-stat-divider" />
                <div className="p-stat"><div className="p-stat-n">{user.score}</div><div className="p-stat-l">Total Points</div></div>
                <div className="p-stat-divider" />
                <div className="p-stat"><div className="p-stat-n">{user.batch || '—'}</div><div className="p-stat-l">Batch</div></div>
                <div className="p-stat-divider" />
                <div className="p-stat"><div className="p-stat-n">{user.class || '—'}</div><div className="p-stat-l">Section</div></div>
              </>
            ) : (
              <>
                <div className="p-stat"><div className="p-stat-n" style={{ fontSize: 18 }}>{user.designation || 'Faculty'}</div><div className="p-stat-l">Designation</div></div>
                <div className="p-stat-divider" />
                <div className="p-stat"><div className="p-stat-n" style={{ fontSize: 18 }}>{user.department || 'CSE'}</div><div className="p-stat-l">Department</div></div>
                <div className="p-stat-divider" />
                <div className="p-stat"><div className="p-stat-n" style={{ fontSize: 18 }}>{user.advising_class || 'None'}</div><div className="p-stat-l">Advising Section</div></div>
                <div className="p-stat-divider" />
                <div className="p-stat"><div className="p-stat-n" style={{ fontSize: 18 }}>{user.advising_batch || 'None'}</div><div className="p-stat-l">Advising Batch</div></div>
              </>
            )}
          </div>
        </div>

        {/* Breakdown */}
        {user.role === 'student' && typeBreakdown.length > 0 && (
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
        {user.role === 'student' && (
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
        )}
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
                <CustomSelect 
                  value={form.type} 
                  onChange={val => setForm(f => ({ ...f, type: val, position: '', duration: '' }))}
                  options={ACH_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Smart India Hackathon 2025" required />
              </div>

              <div className="form-group">
                <label className="form-label">Description (max 300 chars)</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description..." maxLength={300} style={{ resize: 'vertical' }} />
              </div>

              {form.type === 'hackathon' && (
                <div className="form-group">
                  <label className="form-label">Position *</label>
                  <CustomSelect 
                    value={form.position} 
                    onChange={val => setForm(f => ({ ...f, position: val }))}
                    placeholder="Select position"
                    options={POSITIONS.map(p => ({ value: p, label: p === 'participated' ? 'Participated' : `${p} Place` }))}
                  />
                </div>
              )}

              {form.type === 'internship' && (
                <div className="form-group">
                  <label className="form-label">Duration *</label>
                  <CustomSelect 
                    value={form.duration} 
                    onChange={val => setForm(f => ({ ...f, duration: val }))}
                    placeholder="Select duration"
                    options={[
                      { value: 'short', label: 'Short (less than 1 month)' },
                      { value: 'medium', label: 'Medium (1–3 months)' },
                      { value: 'long', label: 'Long (3+ months)' }
                    ]}
                  />
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
        .profile-header { overflow: hidden; position: relative; margin-bottom: 16px; border-radius: var(--radius-lg); }
        .profile-main { position: relative; display: flex; align-items: flex-start; gap: 24px; padding: 28px 28px 20px; flex-wrap: wrap; }
        .profile-avatar-wrap { flex-shrink: 0; }
        .profile-avatar { width: 90px; height: 90px; border-radius: 50%; background: var(--color-green); display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; color: #fff; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 8px 25px rgba(34,197,94,0.25); }
        .profile-info { flex: 1; min-width: 0; padding-top: 8px; }
        .profile-name { font-size: 26px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; }
        .profile-meta { display: flex; gap: 8px; font-size: 13px; color: var(--color-text-muted); margin-top: 6px; align-items: center; flex-wrap: wrap; }
        .profile-bio { font-size: 14px; color: var(--color-text-muted); margin-top: 10px; line-height: 1.6; }
        .profile-links { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .profile-link { font-size: 13px; font-weight: 600; color: var(--color-green); padding: 5px 12px; background: var(--green-50); border: 1px solid rgba(34,197,94,0.2); border-radius: var(--radius-full); text-decoration: none; display: flex; align-items: center; gap: 4px; }
        .profile-link-add { background: var(--color-bg); border-style: dashed; color: var(--color-text-muted); }
        .profile-link-add:hover { border-color: var(--color-green); color: var(--color-green); background: var(--green-50); }
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
