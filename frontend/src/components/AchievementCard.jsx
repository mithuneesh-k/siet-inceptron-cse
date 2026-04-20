import { useState } from 'react';
import { Zap, Briefcase, BookOpen, Rocket, Award, ExternalLink, Calendar, Trophy, Clock, Trash2, Hourglass } from 'lucide-react';

const TYPE_CONFIG = {
  hackathon: { icon: <Zap size={14} style={{ flexShrink: 0 }} />, label: 'Hackathon', cls: 'type-hackathon badge' },
  internship: { icon: <Briefcase size={14} style={{ flexShrink: 0 }} />, label: 'Internship', cls: 'type-internship badge' },
  course: { icon: <BookOpen size={14} style={{ flexShrink: 0 }} />, label: 'Course', cls: 'type-course badge' },
  project: { icon: <Rocket size={14} style={{ flexShrink: 0 }} />, label: 'Project', cls: 'type-project badge' },
  certification: { icon: <Award size={14} style={{ flexShrink: 0 }} />, label: 'Certification', cls: 'type-certification badge' },
};

const POSITION_LABEL = { 
  '1st': <><MedalIcon color="#B45309" rank="1st" /> 1st Place</>, 
  '2nd': <><MedalIcon color="#4B5563" rank="2nd" /> 2nd Place</>, 
  '3rd': <><MedalIcon color="#92400E" rank="3rd" /> 3rd Place</>, 
  participated: <><Award size={14} /> Participated</> 
};
const DURATION_LABEL = { short: '< 1 Month', medium: '1–3 Months', long: '3+ Months' };

function MedalIcon({ color, rank }) {
  return <Award size={14} color={color} style={{ flexShrink: 0 }} />;
}

export default function AchievementCard({ achievement, onDelete, showDelete }) {
  const [showModal, setShowModal] = useState(false);
  const cfg = TYPE_CONFIG[achievement.type] || TYPE_CONFIG.course;

  return (
    <>
      <div 
        className="achievement-card card card-hover animate-fadeInUp" 
        onClick={() => setShowModal(true)}
        style={{ cursor: 'pointer' }}
      >
        <div className="ach-top">
          <span className={cfg.cls} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{cfg.icon} {cfg.label}</span>
          {!achievement.verified && <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Hourglass size={12} /> Pending</span>}
        </div>

        <h4 className="ach-title">{achievement.title}</h4>
        
        <div className="ach-footer">
          <span className="ach-date">{new Date(achievement.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
          <span className="ach-points">+{achievement.points} pts</span>
        </div>

        <style>{`
          .achievement-card { padding: 18px; position: relative; display: flex; flex-direction: column; ${!achievement.verified ? 'opacity: 0.85; border: 1.5px dashed var(--border);' : ''} }
          .ach-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
          .ach-points { font-size: 14px; font-weight: 800; color: var(--color-gold); }
          .ach-title { font-size: 15px; font-weight: 700; line-height: 1.4; margin-bottom: 20px; color: var(--color-text); }
          .ach-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
          .ach-date { font-size: 12px; color: var(--color-text-faint); font-weight: 600; }
        `}</style>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={cfg.cls} style={{ fontSize: '13px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{cfg.icon} {cfg.label}</span>
                {!achievement.verified && <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Hourglass size={12} /> Pending Approval</span>}
              </div>
              <button className="modal-close btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', lineHeight: 1.3 }}>{achievement.title}</h2>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              <span className="badge" style={{ background: 'var(--green-50)', color: 'var(--color-green)', borderColor: 'var(--green-100)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} /> {new Date(achievement.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="badge" style={{ background: '#FFFBEB', color: '#B45309', borderColor: '#FEF3C7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={13} /> +{achievement.points} Points
              </span>
              {achievement.position && (
                <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFDF0', color: '#B45309', borderColor: '#FEF3C7' }}>
                  {POSITION_LABEL[achievement.position] || achievement.position}
                </span>
              )}
              {achievement.duration && (
                <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}>
                  <Clock size={13} /> {DURATION_LABEL[achievement.duration]}
                </span>
              )}
            </div>

            {achievement.description && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-text-faint)', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '700' }}>Description</h4>
                <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--color-text)' }}>{achievement.description}</p>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              {achievement.proof_url ? (
                <a href={achievement.proof_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ExternalLink size={16} /> View External Proof
                </a>
              ) : <div />}
              
              {showDelete && (
                <button className="btn btn-danger" onClick={() => { onDelete(achievement.id); setShowModal(false); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
