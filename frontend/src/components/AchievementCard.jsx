const TYPE_CONFIG = {
  hackathon: { icon: '⚡', label: 'Hackathon', cls: 'type-hackathon badge' },
  internship: { icon: '💼', label: 'Internship', cls: 'type-internship badge' },
  course: { icon: '📚', label: 'Course', cls: 'type-course badge' },
  project: { icon: '🚀', label: 'Project', cls: 'type-project badge' },
  certification: { icon: '🏅', label: 'Certification', cls: 'type-certification badge' },
};

const POSITION_LABEL = { '1st': '🥇 1st Place', '2nd': '🥈 2nd Place', '3rd': '🥉 3rd Place', participated: '🎖️ Participated' };
const DURATION_LABEL = { short: '< 1 Month', medium: '1–3 Months', long: '3+ Months' };

export default function AchievementCard({ achievement, onDelete, showDelete }) {
  const cfg = TYPE_CONFIG[achievement.type] || TYPE_CONFIG.course;

  return (
    <div className="achievement-card card card-hover animate-fadeInUp">
      <div className="ach-top">
        <span className={cfg.cls}>{cfg.icon} {cfg.label}</span>
        <span className="ach-points">+{achievement.points} pts</span>
      </div>

      <h4 className="ach-title">{achievement.title}</h4>
      {achievement.description && <p className="ach-desc">{achievement.description}</p>}

      <div className="ach-meta">
        {achievement.position && (
          <span className="badge badge-gold">{POSITION_LABEL[achievement.position] || achievement.position}</span>
        )}
        {achievement.duration && (
          <span className="badge badge-blue">⏱️ {DURATION_LABEL[achievement.duration]}</span>
        )}
        {achievement.proof_url && (
          <a href={achievement.proof_url} target="_blank" rel="noopener noreferrer" className="badge badge-violet">🔗 Proof</a>
        )}
      </div>

      <div className="ach-footer">
        <span className="ach-date">{new Date(achievement.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
        {showDelete && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(achievement.id)}>Delete</button>
        )}
      </div>

      <style>{`
        .achievement-card { padding: 20px; position: relative; }
        .ach-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .ach-points { font-size: 14px; font-weight: 700; color: var(--color-gold); }
        .ach-title { font-size: 15px; font-weight: 700; line-height: 1.4; margin-bottom: 8px; color: var(--color-text); }
        .ach-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 12px; }
        .ach-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .ach-footer { display: flex; align-items: center; justify-content: space-between; }
        .ach-date { font-size: 12px; color: var(--color-text-faint); }
      `}</style>
    </div>
  );
}
