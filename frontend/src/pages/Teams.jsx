import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, UsersRound, Plus, Rocket, X, CheckCircle2, XCircle, Medal } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import TeamCard from '../components/TeamCard';

const TEAM_TYPES = ['hackathon', 'project', 'research'];

export default function Teams() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', type: 'hackathon' });
  const [joiningId, setJoiningId] = useState(null);
  const [inviteRollNo, setInviteRollNo] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/teams${typeFilter !== 'all' ? `?type=${typeFilter}` : ''}`);
      setTeams(data);
      
      const selId = searchParams.get('selected');
      if (selId) {
        openTeamDetail(selId);
      }
    } catch (err) {
      showToast('Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeams(); }, [typeFilter]);

  const openTeamDetail = async (teamId) => {
    setSearchParams({ selected: teamId });
    try {
      const { data } = await client.get(`/teams/${teamId}`);
      setSelectedTeam(data);
    } catch (err) {
      showToast('Team details unavailable', 'error');
      setSearchParams({});
    }
  };

  const closeTeamDetail = () => {
    setSelectedTeam(null);
    setSearchParams({});
  };

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/teams', createForm);
      setTeams(prev => [data, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', type: 'hackathon' });
      showToast('Team created! <Rocket size={14} style={{display:"inline", verticalAlign:"middle"}} />');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleJoinRequest = async (teamId) => {
    if (!user) return showToast('Please login first', 'error');
    setJoiningId(teamId);
    try {
      const { data } = await client.post(`/teams/${teamId}/join`);
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, member_count: t.member_count + 1 } : t));
      setSelectedTeam(data);
      showToast('Joined the team! <CheckCircle2 size={14} style={{display:"inline", verticalAlign:"middle"}} />');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteRollNo) return;
    setIsInviting(true);
    try {
      await client.post(`/teams/${selectedTeam.id}/invite`, { roll_no: inviteRollNo });
      showToast('Invite sent! 🚀');
      setInviteRollNo('');
      openTeamDetail(selectedTeam.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleApprove = async (mid) => {
    try {
      await client.post(`/teams/invites/${mid}/approve`);
      showToast('Approved! 🎉');
      openTeamDetail(selectedTeam.id);
      fetchTeams();
    } catch (err) {
      showToast('Failed', 'error');
    }
  };

  const handleDecline = async (mid) => {
    if (!confirm('Are you sure?')) return;
    try {
      await client.delete(`/teams/invites/${mid}`);
      showToast('Removed');
      openTeamDetail(selectedTeam.id);
      fetchTeams();
    } catch (err) {
      showToast('Failed', 'error');
    }
  };

  return (
    <div className="page-content">
      <div className="container">
        <div className="section-header animate-fadeInUp">
          <div>
            <h1 className="section-title"><Users size={32} className="text-gradient" style={{display:"inline", verticalAlign:"sub", marginRight: "8px"}} /> <span className="text-gradient">Teams</span></h1>
            <p className="section-subtitle">Form teams, collaborate on hackathons and projects</p>
          </div>
          {user && <button id="create-team-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={18} /> Create Team</button>}
        </div>

        <div className="tab-bar animate-fadeInUp delay-1">
          {['all', ...TEAM_TYPES].map(t => (
            <button key={t} className={`tab-item ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="teams-layout">
          {/* Team List */}
          <div className="teams-list">
            {loading ? (
              <div className="loading-screen" style={{ minHeight: '200px' }}><div className="spinner" /></div>
            ) : teams.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><UsersRound size={48} opacity={0.6} /></div><h3>No teams yet</h3><p>Be the first to create a team!</p></div>
            ) : (
              teams.map((team, i) => (
                <div key={team.id} className={`team-list-item ${selectedTeam?.id === team.id ? 'selected' : ''} animate-fadeInUp`} style={{ animationDelay: `${i * 0.05}s` }} onClick={() => client.get(`/teams/${team.id}`).then(r => setSelectedTeam(r.data))}>
                  <TeamCard team={team} onJoin={user ? joinTeam : null} isJoining={joiningId === team.id} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeTeamDetail()}>
          <div className="modal modal-lg animate-scaleIn">
            <div className="modal-header">
               <div className="team-header-info">
                 <h2 className="modal-title">{selectedTeam.name}</h2>
                 <div className="chips">
                   <span className="badge badge-violet">{selectedTeam.type}</span>
                   <span className={`badge ${selectedTeam.is_open ? 'badge-green' : 'badge-red'}`}>
                     {selectedTeam.is_open ? 'Open' : 'Closed'}
                   </span>
                 </div>
               </div>
               <button className="modal-close btn" onClick={closeTeamDetail}>✕</button>
            </div>

          {/* Team Detail Panel */}
          {selectedTeam && (
            <div className="team-detail card animate-fadeIn">
              <div className="team-detail-header">
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedTeam.name}</h2>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-violet">{selectedTeam.type}</span>
                    <span className={`badge ${selectedTeam.is_open ? 'badge-green' : 'badge-red'}`}>
                      {selectedTeam.is_open ? <><CheckCircle2 size={12} /> Open</> : <><XCircle size={12} /> Closed</>}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTeam(null)}><X size={18} /></button>
              </div>

                {/* Lead Actions / Requests Area */}
                <div className="modal-section">
                  {selectedTeam.is_leader ? (
                    <div className="leader-panel">
                       <h3 className="section-label">Manage Requests</h3>
                       {selectedTeam.pending_members?.length === 0 ? (
                         <div className="small-empty">No pending requests</div>
                       ) : (
                         <div className="pending-list">
                            {selectedTeam.pending_members.map(m => (
                              <div key={m.id} className="pending-item">
                                <div className="member-info">
                                  <div className="m-name">{m.name}</div>
                                  <div className="m-sub">{m.roll_no}</div>
                                </div>
                                <div className="btn-group-mini">
                                  <button className="btn-icon accept" onClick={() => handleApprove(m.membership_id)}>✓</button>
                                  <button className="btn-icon decline" onClick={() => handleDecline(m.membership_id)}>✕</button>
                                </div>
                              </div>
                            ))}
                         </div>
                       )}

                       <h3 className="section-label" style={{ marginTop: 24 }}>Invite by Roll No</h3>
                       <form onSubmit={handleInvite} className="invite-form">
                         <input 
                           className="form-input" 
                           placeholder="Enter Roll No..." 
                           value={inviteRollNo} 
                           onChange={e => setInviteRollNo(e.target.value)}
                         />
                         <button className="btn btn-primary btn-sm" disabled={isInviting}>
                           {isInviting ? '...' : 'Invite'}
                         </button>
                       </form>
                    </div>
                    {m.role === 'leader' && <span className="badge badge-gold"><Medal size={12} /> Leader</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                {user && selectedTeam.is_open && !selectedTeam.is_member && (
                  <button className="btn btn-primary" onClick={() => joinTeam(selectedTeam.id)} disabled={joiningId === selectedTeam.id}>
                    {joiningId === selectedTeam.id ? 'Joining...' : <><Plus size={14} /> Join Team</>}
                  </button>
                )}
                {user && selectedTeam.is_member && selectedTeam.creator_id !== user.id && (
                  <button className="btn btn-danger btn-sm" onClick={() => leaveTeam(selectedTeam.id)}>Leave Team</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title"><UsersRound size={24} /> Create a Team</h2>
              <button className="modal-close btn" onClick={() => setShowCreate(false)}><X size={20} /></button>
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
                <button type="submit" className="btn btn-primary">Create Team <Rocket size={18} /></button>
              </div>
            </form>
          </div>
          <form onSubmit={createTeam} className="create-team-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
                {TEAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Launch Team</button>
          </form>
        </div>
      </div>}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .teams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-top: 10px; }
        .loading-grid { display: flex; align-items: center; justify-content: center; min-height: 300px; }
        
        .modal-lg { max-width: 800px; width: 92%; }
        .team-header-info { display: flex; flex-direction: column; gap: 8px; }
        .chips { display: flex; gap: 8px; }
        
        .modal-scroll-body { max-height: 70vh; overflow-y: auto; padding: 24px 0; }
        .modal-desc { font-size: 15px; line-height: 1.6; color: var(--color-text-muted); margin-bottom: 30px; }
        
        .modal-grid-cols { display: grid; grid-template-columns: 1fr 300px; gap: 40px; }
        @media (max-width: 768px) { .modal-grid-cols { grid-template-columns: 1fr; } }
        
        .section-label { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--color-green); margin-bottom: 16px; display: block; }
        
        .member-list-vertical { display: flex; flex-direction: column; gap: 12px; }
        .member-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px solid rgba(255,255,255,0.05); }
        .member-avatar-box { width: 40px; height: 40px; background: var(--color-green); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
        .member-info { flex: 1; }
        .m-name { font-size: 14px; font-weight: 700; color: var(--color-text); }
        .m-sub { font-size: 12px; color: var(--color-text-muted); }
        .me-tag { font-size: 11px; opacity: 0.5; margin-left: 4px; font-weight: 500; }
        .leader-pill { font-size: 10px; font-weight: 800; color: #DC2626; background: rgba(220, 38, 38, 0.1); padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
        
        .pending-list { display: flex; flex-direction: column; gap: 10px; }
        .pending-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(34,197,94,0.05); border-radius: 12px; }
        .btn-group-mini { display: flex; gap: 6px; }
        .btn-icon { width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s; }
        .btn-icon.accept { background: var(--color-green); color: white; }
        .btn-icon.decline { background: #EF4444; color: white; }
        
        .invite-form { display: flex; gap: 8px; margin-top: 10px; }
        .invite-form input { flex: 1; background: rgba(0,0,0,0.2); height: 40px; }
        
        .status-box { padding: 16px; background: rgba(34, 197, 94, 0.1); border-radius: 12px; color: var(--color-green); text-align: center; font-weight: 700; font-size: 14px; }
        .status-box.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        
        .small-empty { font-size: 13px; color: var(--color-text-muted); opacity: 0.6; font-style: italic; }
        .create-team-form { display: flex; flex-direction: column; gap: 20px; padding: 20px 0; }
        .btn-block { width: 100%; border-radius: 12px; height: 48px; }
      `}</style>
    </div>
  );
}
