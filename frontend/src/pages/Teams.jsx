import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import TeamCard from '../components/TeamCard';

const TEAM_TYPES = ['hackathon', 'project', 'research'];

export default function Teams() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', type: 'hackathon' });
  const [joiningId, setJoiningId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchTeams = async () => {
    const { data } = await client.get(`/teams${typeFilter !== 'all' ? `?type=${typeFilter}` : ''}`);
    setTeams(data);
    setLoading(false);
    const selId = searchParams.get('selected');
    if (selId) {
      const { data: td } = await client.get(`/teams/${selId}`);
      setSelectedTeam(td);
    }
  };

  useEffect(() => { fetchTeams(); }, [typeFilter]);

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/teams', createForm);
      setTeams(prev => [data, ...prev]);
      setSelectedTeam(data);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', type: 'hackathon' });
      showToast('Team created! 🎉');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create team', 'error');
    }
  };

  const joinTeam = async (teamId) => {
    if (!user) return showToast('Please login to join a team', 'error');
    setJoiningId(teamId);
    try {
      const { data } = await client.post(`/teams/${teamId}/join`);
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, member_count: t.member_count + 1 } : t));
      setSelectedTeam(data);
      showToast('Joined the team! 🎉');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to join', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const leaveTeam = async (teamId) => {
    await client.delete(`/teams/${teamId}/leave`);
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, member_count: t.member_count - 1 } : t));
    if (selectedTeam?.id === teamId) setSelectedTeam(null);
    showToast('Left the team');
  };

  return (
    <div className="page-content">
      <div className="container">
        <div className="section-header animate-fadeInUp">
          <div>
            <h1 className="section-title">👥 <span className="text-gradient">Teams</span></h1>
            <p className="section-subtitle">Form teams, collaborate on hackathons and projects</p>
          </div>
          {user && <button id="create-team-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Team</button>}
        </div>

        {/* Filters */}
        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: '28px' }}>
          {['all', ...TEAM_TYPES].map(t => (
            <button key={t} className={`tab-item ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All Teams' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="teams-layout">
          {/* Team List */}
          <div className="teams-list">
            {loading ? (
              <div className="loading-screen" style={{ minHeight: '200px' }}><div className="spinner" /></div>
            ) : teams.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">👥</div><h3>No teams yet</h3><p>Be the first to create a team!</p></div>
            ) : (
              teams.map((team, i) => (
                <div key={team.id} className={`team-list-item ${selectedTeam?.id === team.id ? 'selected' : ''} animate-fadeInUp`} style={{ animationDelay: `${i * 0.05}s` }} onClick={() => client.get(`/teams/${team.id}`).then(r => setSelectedTeam(r.data))}>
                  <TeamCard team={team} onJoin={user ? joinTeam : null} isJoining={joiningId === team.id} />
                </div>
              ))
            )}
          </div>

          {/* Team Detail Panel */}
          {selectedTeam && (
            <div className="team-detail card animate-fadeIn">
              <div className="team-detail-header">
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedTeam.name}</h2>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-violet">{selectedTeam.type}</span>
                    <span className={`badge ${selectedTeam.is_open ? 'badge-green' : 'badge-red'}`}>{selectedTeam.is_open ? '✓ Open' : '✗ Closed'}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTeam(null)}>✕</button>
              </div>

              {selectedTeam.description && <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>{selectedTeam.description}</p>}

              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Team Members ({selectedTeam.members?.length || 0})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedTeam.members?.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 16 }}>{m.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{m.class} · {m.score} pts</div>
                    </div>
                    {m.role === 'leader' && <span className="badge badge-gold">👑 Leader</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                {user && selectedTeam.is_open && !selectedTeam.is_member && (
                  <button className="btn btn-primary" onClick={() => joinTeam(selectedTeam.id)} disabled={joiningId === selectedTeam.id}>
                    {joiningId === selectedTeam.id ? 'Joining...' : '+ Join Team'}
                  </button>
                )}
                {user && selectedTeam.is_member && selectedTeam.creator_id !== user.id && (
                  <button className="btn btn-danger btn-sm" onClick={() => leaveTeam(selectedTeam.id)}>Leave Team</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">👥 Create a Team</h2>
              <button className="modal-close btn" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={createTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input className="form-input" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bug Busters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description (max 300 chars)</label>
                <textarea className="form-input" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What are you building? Who are you looking for?" maxLength={300} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Team Type *</label>
                <select className="form-select" value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
                  {TEAM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Team 🚀</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .teams-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }
        @media (max-width: 900px) { .teams-layout { grid-template-columns: 1fr; } }
        .teams-list { display: flex; flex-direction: column; gap: 14px; }
        .team-list-item { cursor: pointer; transition: transform var(--transition); }
        .team-list-item:hover { transform: translateX(3px); }
        .team-list-item.selected > * { border-color: var(--color-violet) !important; }
        .team-detail { padding: 24px; position: sticky; top: 80px; }
        .team-detail-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
      `}</style>
    </div>
  );
}
