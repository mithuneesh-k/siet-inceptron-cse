import { Link } from 'react-router-dom';

const TYPE_CONFIG = {
  hackathon: { icon: '⚡', gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)' },
  project: { icon: '🚀', gradient: 'linear-gradient(135deg, #F97316, #EF4444)' },
  research: { icon: '🔬', gradient: 'linear-gradient(135deg, #10B981, #3B82F6)' },
};

export default function TeamCard({ team, onJoin, isJoining }) {
  const cfg = TYPE_CONFIG[team.type] || TYPE_CONFIG.hackathon;

  return (
    <div className="team-card card card-hover">
      <div className="team-card-top">
        <div className="team-icon" style={{ background: cfg.gradient }}>{cfg.icon}</div>
        <div className="team-status">
          <span className={`badge ${team.is_open ? 'badge-green' : 'badge-red'}`}>
            {team.is_open ? '✓ Open' : '✗ Closed'}
          </span>
          <span className="badge badge-violet">{team.type}</span>
        </div>
      </div>

      <h3 className="team-name">{team.name}</h3>
      {team.description && <p className="team-desc">{team.description}</p>}

      <div className="team-meta">
        <span>👤 {team.member_count || 0} member{(team.member_count || 0) !== 1 ? 's' : ''}</span>
        <span>• {team.creator_name}</span>
      </div>

      <div className="team-actions">
        <Link to={`/teams?selected=${team.id}`} className="btn btn-ghost btn-sm">View Team</Link>
        {team.is_open && onJoin && (
          <button className="btn btn-primary btn-sm" onClick={() => onJoin(team.id)} disabled={isJoining}>
            {isJoining ? 'Joining...' : '+ Join'}
          </button>
        )}
      </div>

      <style>{`
        .team-card { padding: 22px; }
        .team-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .team-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .team-status { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .team-name { font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--color-text); }
        .team-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 14px; }
        .team-meta { font-size: 13px; color: var(--color-text-muted); display: flex; gap: 6px; margin-bottom: 16px; }
        .team-actions { display: flex; gap: 8px; justify-content: flex-end; }
      `}</style>
    </div>
  );
}
