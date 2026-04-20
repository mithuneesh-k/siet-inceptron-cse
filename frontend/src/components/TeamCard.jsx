import { Link } from 'react-router-dom';

const TYPE_CONFIG = {
  hackathon: { icon: '⚡', gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)' },
  project: { icon: '🚀', gradient: 'linear-gradient(135deg, #F97316, #EF4444)' },
  research: { icon: '🔬', gradient: 'linear-gradient(135deg, #10B981, #3B82F6)' },
};

export default function TeamCard({ team, onJoin, isJoining }) {
  const cfg = TYPE_CONFIG[team.type] || TYPE_CONFIG.hackathon;

  return (
    <div className="team-card animate-fadeInUp">
      <div className="team-glass-bg" />
      
      <div className="team-card-inner">
        <div className="team-card-top">
          <div className="team-icon-box" style={{ background: cfg.gradient }}>
            {cfg.icon}
          </div>
          <div className="team-labels">
            <span className={`status-dot ${team.is_open ? 'open' : 'closed'}`} />
            <span className="type-badge">{team.type}</span>
          </div>
        </div>

        <div className="team-card-content">
          <h3 className="team-name">{team.name}</h3>
          <p className="team-desc">{team.description || "No description provided."}</p>
        </div>

        <div className="team-card-meta">
          <div className="member-stack">
            {team.member_ids?.slice(0, 3).map((id, i) => (
              <div key={i} className="mini-avatar" style={{ zIndex: 10 - i }}>?</div>
            ))}
            {team.member_count > 3 && <span className="more-members">+{team.member_count - 3}</span>}
          </div>
          <span className="member-text">{team.member_count} Member{team.member_count !== 1 ? 's' : ''}</span>
        </div>

        <div className="team-card-footer">
          <span className="creator-tag">By {team.creator_name}</span>
          <div className="team-btn-group">
             <Link to={`/teams?selected=${team.id}`} className="btn-details">Details</Link>
             {team.is_open && onJoin && (
               <button 
                 className="btn-join-minimal" 
                 onClick={() => onJoin(team.id)} 
                 disabled={isJoining}
               >
                 {isJoining ? '...' : 'Join'}
               </button>
             )}
          </div>
        </div>
      </div>

      <style>{`
        .team-card {
          position: relative;
          border-radius: 20px;
          padding: 24px;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .team-card:hover {
          transform: translateY(-8px);
          border-color: var(--color-green);
          box-shadow: 0 12px 30px rgba(34, 197, 94, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .team-glass-bg {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.03) 0%, transparent 70%);
          pointer-events: none;
        }

        .team-card-inner { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }

        .team-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .team-icon-box { 
          width: 52px; height: 52px; border-radius: 16px; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 24px; box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .team-labels { display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.open { background: #10B981; box-shadow: 0 0 10px #10B981; }
        .status-dot.closed { background: #EF4444; }
        .type-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-muted); padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 6px; }

        .team-name { font-size: 20px; font-weight: 800; color: var(--color-text); margin-bottom: 10px; font-family: 'Space Grotesk', sans-serif; }
        .team-desc { font-size: 14px; color: var(--color-text-muted); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 24px; flex-grow: 1; }

        .team-card-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .member-stack { display: flex; align-items: center; }
        .mini-avatar { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--color-bg); background: var(--bg-hover); margin-left: -10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-text-muted); }
        .mini-avatar:first-child { margin-left: 0; }
        .more-members { font-size: 12px; font-weight: 700; color: var(--color-text-muted); margin-left: 6px; }
        .member-text { font-size: 13px; font-weight: 600; color: var(--color-text-muted); }

        .team-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .creator-tag { font-size: 12px; color: var(--color-text-muted); font-weight: 600; }
        .team-btn-group { display: flex; gap: 10px; }
        
        .btn-details { font-size: 13px; font-weight: 700; color: var(--color-green); text-decoration: none; padding: 6px 14px; border-radius: 10px; background: rgba(34, 197, 94, 0.1); transition: all 0.2s; }
        .btn-details:hover { background: var(--color-green); color: white; }
        
        .btn-join-minimal { border: none; background: transparent; font-size: 13px; font-weight: 700; color: var(--color-text-muted); cursor: pointer; padding: 6px 4px; }
        .btn-join-minimal:hover { color: var(--color-green); }
      `}</style>
    </div>
  );
}
