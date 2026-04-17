export default function LiveFeedCard({ item, type }) {
  const config = {
    hackathon: { accent: 'var(--color-violet)', badgeCls: 'badge-violet', prizeLabel: 'Prize', dateLabel: 'Deadline', modeLabel: 'mode' },
    internship: { accent: 'var(--color-blue)', badgeCls: 'badge-blue', prizeLabel: 'Stipend', dateLabel: 'Deadline', modeLabel: 'location' },
    job: { accent: 'var(--color-green)', badgeCls: 'badge-green', prizeLabel: 'Package', dateLabel: 'Deadline', modeLabel: 'type' },
  }[type] || {};

  const prize = item.prize || item.stipend || item.package;
  const organizer = item.organizer || item.company;
  const mode = item.mode || item.location || item.type;
  const deadline = item.deadline;

  const isExpiring = deadline && (new Date(deadline) - new Date()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="live-card card card-hover" style={{ borderLeft: `3px solid ${config.accent}` }}>
      <div className="live-top">
        <span className="live-emoji">{item.logo}</span>
        <div className="live-badges">
          {item.difficulty && <span className={`badge ${config.badgeCls}`}>{item.difficulty}</span>}
          {isExpiring && <span className="badge badge-red">🔥 Closing Soon</span>}
        </div>
      </div>

      <h3 className="live-title">{item.title}</h3>
      <p className="live-org">{organizer}</p>
      {item.description && <p className="live-desc">{item.description}</p>}

      <div className="live-details">
        {prize && <div className="live-detail"><span>💰</span><span>{prize}</span></div>}
        {mode && <div className="live-detail"><span>📍</span><span>{mode}</span></div>}
        {deadline && <div className="live-detail"><span>📅</span><span>Due: {deadline}</span></div>}
        {item.duration && <div className="live-detail"><span>⏱️</span><span>{item.duration}</span></div>}
      </div>

      {item.tags?.length > 0 && (
        <div className="tags" style={{ marginBottom: '16px' }}>
          {item.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}

      <a href={item.link || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
        Apply Now →
      </a>

      <style>{`
        .live-card { padding: 20px; transition: all var(--transition); }
        .live-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .live-emoji { font-size: 28px; }
        .live-badges { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .live-title { font-size: 15px; font-weight: 700; line-height: 1.4; margin-bottom: 4px; }
        .live-org { font-size: 13px; color: var(--color-text-muted); margin-bottom: 10px; }
        .live-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 14px; }
        .live-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .live-detail { display: flex; gap: 8px; font-size: 13px; color: var(--color-text-muted); align-items: center; }
      `}</style>
    </div>
  );
}
