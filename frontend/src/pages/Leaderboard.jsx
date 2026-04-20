import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScoreBadge from '../components/ScoreBadge';
import CustomSelect from '../components/CustomSelect';
import FilterModal from '../components/FilterModal';
import { Users, Award, Trophy, Briefcase, Medal, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const BATCH_OPTIONS = ['2026-2030', '2025-2029', '2024-2028', '2023-2027', '2022-2026'];
const CLASS_OPTIONS = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function Leaderboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [stats, setStats] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (batchFilter) params.set('batch', batchFilter);
    if (classFilter) params.set('class', classFilter);
    Promise.all([
      client.get(`/leaderboard?${params.toString()}`),
      client.get('/leaderboard/stats'),
    ]).then(([lRes, sRes]) => {
      setStudents(lRes.data);
      setStats(sRes.data);
    }).finally(() => setLoading(false));
  }, [batchFilter, classFilter]);

  const top3 = students.slice(0, 3);
  const rest = students.slice(3);

  return (
    <div className="page-content">
      <div className="container">
        <div className="lb-header animate-fadeInUp">
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={28} className="text-gradient" /> <span className="text-gradient">Leaderboard</span></h1>
          <p className="section-subtitle">Ranked by total achievement score across SIET CSE Department</p>
        </div>

        {/* Dept Stats */}
        <div className="lb-stats-row animate-fadeInUp delay-1">
          {[
            { n: stats.totalStudents, l: 'Students', i: <Users size={24} /> },
            { n: stats.totalAchievements, l: 'Achievements', i: <Award size={24} /> },
            { n: stats.totalHackathonWins, l: 'Hackathon Wins', i: <Trophy size={24} /> },
            { n: stats.totalInternships, l: 'Internships', i: <Briefcase size={24} /> },
          ].map((s, i) => (
            <div key={i} className="lb-stat card">
              <span className="lb-stat-i">{s.i}</span>
              <span className="lb-stat-n">{s.n}</span>
              <span className="lb-stat-l">{s.l}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="lb-filters animate-fadeInUp delay-2">
          <button 
            className={`btn ${batchFilter || classFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters {(batchFilter || classFilter) && '(Active)'}
          </button>
        </div>

        <FilterModal 
          isOpen={showFilters} 
          onClose={() => setShowFilters(false)}
          onClear={() => { setBatchFilter(''); setClassFilter(''); }}
        >
          <div className="form-group">
            <label className="form-label">Batch</label>
            <CustomSelect
              value={batchFilter}
              onChange={setBatchFilter}
              options={[{ value: '', label: 'All Batches' }, ...BATCH_OPTIONS.map(b => ({ value: b, label: b }))]}
              placeholder="All Batches"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <CustomSelect
              value={classFilter}
              onChange={setClassFilter}
              options={[{ value: '', label: 'All Sections' }, ...CLASS_OPTIONS.map(c => ({ value: c, label: c }))]}
              placeholder="All Sections"
            />
          </div>
          <div style={{ height: '120px' }}></div>
        </FilterModal>

        {loading ? (
          <div className="lb-table card">
            <div className="lb-table-header">
              <span>Rank</span>
              <span>Student</span>
              <span>Section</span>
              <span>Wins</span>
              <span>Achievements</span>
              <span>Score</span>
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="lb-row">
                <div className="skeleton skeleton-text" style={{ width: '24px', margin: 0 }} />
                <div className="lb-student">
                  <div className="skeleton skeleton-circle" style={{ width: '34px', height: '34px' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: '120px', margin: '0 0 4px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '60px', height: '10px', margin: 0 }} />
                  </div>
                </div>
                <div className="skeleton skeleton-text" style={{ width: '40px', margin: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '30px', margin: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '20px', margin: 0 }} />
                <div className="skeleton skeleton-text" style={{ width: '40px', margin: 0 }} />
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state"><div className="empty-icon" style={{ marginBottom: '16px' }}><Trophy size={48} color="var(--color-green)" strokeWidth={1.5} opacity={0.6} /></div><h3>No students found</h3></div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {!batchFilter && !classFilter && top3.length === 3 && (
              <div className="podium animate-fadeInUp delay-2">
                {[top3[1], top3[0], top3[2]].map((s, i) => {
                  const actualRank = s.rank;
                  const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
                  const realH = [140, 180, 120][i]; // 2nd, 1st, 3rd Heights
                  const realC = colors[actualRank - 1];
                  return (
                    <div key={s.id} className="podium-col">
                      <Link to={`/profile/${s.id}`} className="podium-student" style={{ borderColor: realC + '40' }}>
                        <div className="podium-ava" style={{ boxShadow: `0 0 20px ${realC}50` }}>{s.name[0]}</div>
                        <div className="podium-sname">{s.name.split(' ')[0]}</div>
                        <div className="podium-sclass">{s.class}</div>
                        <ScoreBadge score={s.score} />
                      </Link>
                      <div className="podium-block" style={{ height: realH, background: `linear-gradient(to top, ${realC}20, ${realC}08)`, borderTop: `3px solid ${realC}`, borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Medal size={28} color={realC} strokeWidth={2.5} /></span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: realC }}>{actualRank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ranking Table */}
            <div className="lb-table card animate-fadeInUp delay-3">
              <div className="lb-table-header">
                <span>Rank</span>
                <span>Student</span>
                <span>Section</span>
                <span>Wins</span>
                <span>Achievements</span>
                <span>Score</span>
              </div>
              {(!batchFilter && !classFilter ? rest : students).map((s, idx) => {
                const displayRank = !batchFilter && !classFilter ? s.rank : idx + 1;
                // Mock delta logic
                const deltaId = String(s.id).charCodeAt(0) || idx;
                const mockDelta = deltaId % 3 === 0 ? <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center' }}><ArrowUp size={12} /> {(deltaId%2)+1}</span> 
                                : deltaId % 5 === 0 ? <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}><ArrowDown size={12} /> 1</span> 
                                : <span style={{ color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center' }}><Minus size={12} /></span>;

                return (
                  <Link to={`/profile/${s.id}`} key={s.id} className="lb-row" style={{ animationDelay: `${idx * 0.03}s` }}>
                    <div className="lb-rank-container">
                      <span className={`lb-rank ${displayRank <= 3 ? `rank-${displayRank}` : ''}`}>#{displayRank}</span>
                      <div style={{ marginTop: '2px', fontWeight: 'bold' }}>{mockDelta}</div>
                    </div>
                    <div className="lb-student">
                      <div className="lb-ava">{s.name[0]}</div>
                      <div>
                        <div className="lb-name">{s.name}</div>
                        <div className="lb-year">{s.batch || '—'}</div>
                      </div>
                    </div>
                    <span className="lb-cell"><span className="badge badge-violet">{s.class}</span></span>
                    <span className="lb-cell" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{s.gold_wins || 0} <Medal size={14} color="#eab308" /></span>
                    <span className="lb-cell">{s.achievement_count}</span>
                    <span className="lb-score text-gradient">{s.score}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .lb-header { margin-bottom: 28px; }
        .lb-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
        .lb-stat { padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; border-top: 3px solid var(--color-green); }
        .lb-stat-i { font-size: 22px; }
        .lb-stat-n { font-size: 26px; font-weight: 900; font-family: 'Space Grotesk', sans-serif; color: var(--color-green); }
        .lb-stat-l { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        @media (max-width: 600px) { .lb-stats-row { grid-template-columns: repeat(2, 1fr); } }

        .lb-filters { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 32px; }
        .filter-label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700; }

        /* Podium — flat 2D */
        .podium { display: flex; justify-content: center; align-items: flex-end; gap: 16px; margin-bottom: 40px; }
        .podium-col { display: flex; flex-direction: column; align-items: center; }
        .podium-student { padding: 16px 14px; border: 2px solid var(--border); border-radius: var(--radius-lg); text-align: center; text-decoration: none; color: inherit; transition: border-color var(--transition); min-width: 130px; background: #fff; }
        .podium-student:hover { border-color: var(--color-green); }
        .podium-ava { width: 60px; height: 60px; background: var(--color-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #fff; margin: 0 auto 8px; }
        .podium-sname { font-size: 14px; font-weight: 700; margin-bottom: 2px; color: var(--color-text); }
        .podium-sclass { font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; }
        .podium-block { width: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-radius: 0 0 var(--radius-sm) var(--radius-sm); }

        /* Table */
        .lb-table { overflow: hidden; margin-top: 8px; }
        .lb-table-header { display: grid; grid-template-columns: 60px 2fr 100px 70px 120px 100px; gap: 12px; padding: 12px 20px; background: var(--bg-primary); font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1.5px solid var(--border); }
        .lb-row { display: grid; grid-template-columns: 60px 2fr 100px 70px 120px 100px; gap: 12px; padding: 13px 20px; border-bottom: 1px solid var(--border); align-items: center; text-decoration: none; color: inherit; transition: background var(--transition); animation: fadeInUp 0.3s ease both; }
        .lb-row:last-child { border-bottom: none; }
        .lb-row:hover { background: var(--green-50); }
        .lb-rank-container { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
        .lb-rank { font-size: 14px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; color: var(--color-text-muted); line-height: 1; }
        .lb-student { display: flex; align-items: center; gap: 10px; }
        .lb-ava { width: 34px; height: 34px; background: var(--color-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .lb-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
        .lb-year { font-size: 12px; color: var(--color-text-muted); }
        .lb-cell { font-size: 14px; color: var(--color-text-muted); }
        .lb-score { font-size: 18px; font-weight: 900; font-family: 'Space Grotesk', sans-serif; color: var(--color-green); }
        @media (max-width: 640px) {
          .lb-table-header { display: none; }
          .lb-row { 
            display: flex; flex-wrap: wrap; 
            padding: 16px; gap: 8px; 
            border: 1px solid var(--border); 
            border-radius: var(--radius-md); 
            margin-bottom: 12px; 
            position: relative;
          }
          .lb-row:last-child { border-bottom: 1px solid var(--border); }
          .lb-rank-container { position: absolute; top: 16px; right: 16px; align-items: flex-end; }
          .lb-student { width: 100%; margin-bottom: 8px; padding-right: 40px; }
          .lb-cell { display: inline-flex; background: var(--bg-hover); padding: 4px 8px; border-radius: var(--radius-sm); font-size: 12px; margin-right: 4px; }
          .lb-score { width: 100%; text-align: center; border-top: 1px dashed var(--border); padding-top: 10px; margin-top: 4px; }
        }
      `}</style>
    </div>
  );
}
