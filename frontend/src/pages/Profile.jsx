import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ScoreBadge from '../components/ScoreBadge';
import AchievementCard from '../components/AchievementCard';
import CustomSelect from '../components/CustomSelect';
import TruncatedText from '../components/TruncatedText';
import { 
  Shield, Book, GraduationCap, Terminal, Briefcase, AtSign, 
  Camera, Globe, Phone, Plus, Cake, Edit3, Award, Lightbulb, Hourglass 
} from 'lucide-react';

const ACH_TYPES = ['hackathon', 'internship', 'course', 'project', 'certification'];
const POSITIONS = ['1st', '2nd', '3rd', 'participated'];
const DURATIONS = ['short', 'medium', 'long'];

export default function Profile() {
  const { id } = useParams();
  const { user: authUser, refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
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
      const [userRes, achRes, teamRes] = await Promise.all([
        client.get(`/users/${id}`).catch(err => { console.error(err); return { data: null }; }),
        client.get(`/achievements/user/${id}`).catch(err => { console.error(err); return { data: [] }; }),
        client.get(`/teams/user/${id}`).catch(err => { console.error(err); return { data: [] }; })
      ]);
      setUser(userRes.data);
      setAchievements(achRes.data);
      setTeams(teamRes.data);

      if (authUser?.id === id) {
        const { data: invRes } = await client.get('/teams/my-invites');
        setInvites(invRes);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      if (action === 'approve') await client.post(`/teams/invites/${inviteId}/approve`);
      else await client.delete(`/teams/invites/${inviteId}`);
      showToast(action === 'approve' ? 'Joined team! 🎉' : 'Invite declined');
      fetchData();
    } catch (err) {
      showToast('Action failed', 'error');
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
      showToast(<span>Achievement submitted for approval! <Hourglass size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /></span>);
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

  const renderSkeleton = () => (
    <div className="page-content container">
      <div className="profile-header card skeleton-card" style={{ padding: '28px', border: 'none' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div className="skeleton skeleton-circle" style={{ width: '90px', height: '90px' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '250px', height: '32px' }} />
            <div className="skeleton skeleton-text" style={{ width: '150px' }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: '16px', height: '60px' }} />
          </div>
        </div>
      </div>
      <div className="grid-auto" style={{ marginTop: '24px' }}>
        <div className="skeleton skeleton-card" style={{ height: '140px' }} />
        <div className="skeleton skeleton-card" style={{ height: '140px' }} />
      </div>
    </div>
  );

  if (loading) return renderSkeleton();
  if (!user) return <div className="page-content container"><div className="empty-state"><h3>User not found</h3></div></div>;

  const rank = user.score >= 300 ? 'Platinum' : user.score >= 200 ? 'Gold' : user.score >= 100 ? 'Silver' : 'Bronze';

  // Calculate Profile Completion
  let completionPct = 0;
  if (user) {
    const fields = ['bio', 'github', 'linkedin', 'portfolio', 'phone', 'date_of_birth'];
    const filled = fields.filter(f => !!user[f]).length;
    completionPct = Math.round((filled / fields.length) * 100);
  }
  const typeBreakdown = ACH_TYPES.map(t => ({
    type: t, count: achievements.filter(a => a.type === t).length,
    pts: achievements.filter(a => a.type === t).reduce((s, a) => s + a.points, 0)
  })).filter(t => t.count > 0);

  return (
    <div className="page-content">
      <div className="container">

        {/* Invitations Alert */}
        {isOwn && invites.length > 0 && (
          <div className="invite-alert animate-fadeIn">
            <div className="invite-alert-content">
              <Plus size={20} className="shake" />
              <span>You have <strong>{invites.length}</strong> pending team invite{invites.length > 1 ? 's' : ''}!</span>
            </div>
            <div className="invite-cards">
              {invites.map(inv => (
                <div key={inv.id} className="invite-card-mini">
                  <div className="inv-info"><strong>{inv.teams.name}</strong></div>
                  <div className="inv-actions">
                    <button className="btn-mini acc" onClick={() => handleInviteAction(inv.id, 'approve')}>Accept</button>
                    <button className="btn-mini dec" onClick={() => handleInviteAction(inv.id, 'decline')}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Breadcrumbs */}
        {authUser?.is_admin && !isOwn && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <Link to="/admin" style={{ color: 'var(--color-green)', fontWeight: '600' }}>Admin Panel</Link>
            <span>/</span>
            {user.batch && <><span>{user.batch}</span><span>/</span></>}
            {user.class && <><span>{user.class}</span><span>/</span></>}
            <span style={{ color: 'var(--color-text)' }}>{user.name}</span>
          </div>
        )}

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
                {user.is_admin && <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shield size={14} /> {user.role === 'admin' ? 'Admin' : 'Faculty'}</span>}
              </div>
              <div className="profile-meta">
                {user.class && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Book size={14} /> {user.class}</span>}
                {user.class && <span style={{ opacity: 0.5 }}>•</span>}
                {user.batch && <span>{user.batch}</span>}
                {user.batch && <span style={{ opacity: 0.5 }}>•</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GraduationCap size={14} /> Sri Shakthi Institute, Coimbatore</span>
              </div>

              {user.bio && (
                <div style={{ marginTop: '10px' }}>
                  <TruncatedText text={user.bio} maxLines={3} className="profile-bio" />
                </div>
              )}

              <div className="profile-links">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {user.github && (
                    <a href={user.github.startsWith('http') ? user.github : `https://github.com/${user.github.startsWith('@') ? user.github.slice(1) : user.github}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      <Terminal size={14} /> GitHub
                    </a>
                  )}
                  {user.linkedin && (
                    <a href={user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      <Briefcase size={14} /> LinkedIn
                    </a>
                  )}
                  {user.twitter && (
                    <a href={user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter.startsWith('@') ? user.twitter.slice(1) : user.twitter}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      <AtSign size={14} /> Twitter
                    </a>
                  )}
                  {user.instagram && (
                    <a href={user.instagram.startsWith('http') ? user.instagram : `https://instagram.com/${user.instagram.startsWith('@') ? user.instagram.slice(1) : user.instagram}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      <Camera size={14} /> Instagram
                    </a>
                  )}
                  {user.portfolio && (
                    <a href={user.portfolio.startsWith('http') ? user.portfolio : `https://${user.portfolio}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      <Globe size={14} /> Portfolio
                    </a>
                  )}
                  {(user.phone && (user.phone_public || isOwn || authUser?.is_admin)) && (
                    <a href={`https://wa.me/${user.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="profile-link">
                      <Phone size={14} /> {user.phone}
                    </a>
                  )}
                  {isOwn && (
                    <Link to="/edit-profile" className="profile-link profile-link-add">
                      <Plus size={14} /> Add links
                    </Link>
                  )}
                </div>
                {(user.date_of_birth && (user.dob_public || isOwn || authUser?.is_admin)) && (
                   <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                     <Cake size={14} /> {new Date(user.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                   </div>
                )}
              </div>
            </div>

            <div className="profile-actions">
              {user.role === 'student' && <ScoreBadge score={user.score} size="lg" />}
              {isOwn && (
                <Link to="/edit-profile" className="btn btn-secondary btn-sm" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={14} /> Edit Profile
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

        {/* My Teams */}
        {teams.length > 0 && (
          <div className="animate-fadeInUp delay-1" style={{ marginBottom: '32px' }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Plus size={20} className="text-gradient" /> My Teams</h2>
            <div className="grid-auto">
              {teams.map(t => (
                <Link key={t.id} to={`/teams?selected=${t.id}`} className="mini-team-card card card-hover">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="mini-team-icon">{t.type === 'hackathon' ? '⚡' : t.type === 'project' ? '🚀' : '🔬'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t.role === 'leader' ? '👑 Leader' : 'Member'}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
            <div className="section-header" style={{ marginTop: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Award size={20} className="text-gradient" /> Achievements</h2>
              {isOwn && <button id="add-achievement-btn" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={16} /> Add</button>}
            </div>

            {achievements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-green)', opacity: 0.5}}>
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                  </svg>
                </div>
                <h3>No achievements yet</h3>
                <p>{isOwn ? 'Add your first achievement to start earning points!' : 'This student hasn\'t added any achievements yet.'}</p>
                {isOwn && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>Log your first achievement →</button>}
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
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={20} /> Add Achievement</h2>
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

              <div className="alert alert-info" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Points: {
                  form.type === 'hackathon' ? (form.position === '1st' ? 100 : form.position === '2nd' ? 60 : form.position === '3rd' ? 40 : 10)
                  : form.type === 'internship' ? (form.duration === 'long' ? 70 : form.duration === 'medium' ? 40 : 20)
                  : form.type === 'course' ? 15 : form.type === 'project' ? 25 : 10
                } pts will be added to your score.</span>
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

        @media (max-width: 640px) {
          .profile-main { flex-direction: column; align-items: center; text-align: center; padding: 24px 16px 16px; gap: 16px; }
          .profile-info { padding-top: 0; display: flex; flex-direction: column; align-items: center; }
          .profile-info > div:first-child { justify-content: center; margin-bottom: 8px; }
          .profile-meta { justify-content: center; }
          .profile-links { justify-content: center; }
          .profile-actions { margin: 16px auto 0; width: 100%; display: flex; flex-direction: row; justify-content: center; gap: 12px; }
          .profile-stats { flex-wrap: wrap; gap: 16px 0; padding: 20px 16px; }
          .p-stat { flex: 0 0 50%; }
          .p-stat-divider { display: none; }
        }
      `}</style>
    </div>
  );
}
