import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Admin() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([
      client.get('/users'),
      client.get('/achievements/all/pending'),
    ]).then(([uRes, aRes]) => {
      setStudents(uRes.data);
      setAchievements(aRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (!user?.is_admin) return <Navigate to="/" replace />;

  const totalScore = students.reduce((s, u) => s + u.score, 0);
  const avgScore = students.length ? Math.round(totalScore / students.length) : 0;

  const verifyAch = async (id, verified) => {
    await client.patch(`/achievements/${id}/verify`, { verified });
    setAchievements(prev => prev.filter(a => a.id !== id));
    showToast(verified ? 'Achievement verified ✅' : 'Achievement rejected');
  };

  return (
    <div className="page-content">
      <div className="container">
        <div className="admin-header animate-fadeInUp">
          <div>
            <h1 className="section-title">🛡️ <span className="text-gradient">Admin Panel</span></h1>
            <p className="section-subtitle">Sri Shakthi Institute of Engineering and Technology — CSE Department</p>
          </div>
          <div className="badge badge-gold" style={{ padding: '8px 16px', fontSize: 13 }}>👨‍🏫 {user.name}</div>
        </div>

        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: 28 }}>
          {[{ id: 'overview', l: '📊 Overview' }, { id: 'students', l: '👩‍💻 Students' }, { id: 'pending', l: `⏳ Pending (${achievements.length})` }].map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
          <>
            {tab === 'overview' && (
              <div className="animate-fadeIn">
                <div className="admin-stats">
                  {[
                    { n: students.length, l: 'Total Students', i: '👩‍💻', c: 'var(--color-violet)' },
                    { n: students.reduce((s, u) => s + u.achievement_count, 0), l: 'Total Achievements', i: '🏅', c: 'var(--color-gold)' },
                    { n: avgScore, l: 'Avg Score', i: '📈', c: 'var(--color-blue)' },
                    { n: achievements.length, l: 'Pending Reviews', i: '⏳', c: 'var(--color-orange)' },
                  ].map((s, i) => (
                    <div key={i} className="admin-stat card" style={{ borderTop: `3px solid ${s.c}` }}>
                      <div style={{ fontSize: 28 }}>{s.i}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Space Grotesk', sans-serif", color: s.c }}>{s.n}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: '20px 24px', marginTop: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Top 5 Students by Score</h3>
                  {students.slice(0, 5).map((s, i) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, fontSize: 16, minWidth: 24 }}>#{i + 1}</span>
                      <div style={{ width: 36, height: 36, background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>{s.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</Link>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.class} · Year {s.year}</div>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--color-gold)', fontFamily: "'Space Grotesk', sans-serif" }}>{s.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'students' && (
              <div className="card animate-fadeIn" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 100px', gap: 12, padding: '12px 20px', background: 'rgba(255,255,255,0.03)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>
                  <span>Student</span><span>Year</span><span>Class</span><span>Achv.</span><span>Score</span>
                </div>
                {students.map((s, i) => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 100px', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', animation: `fadeInUp 0.3s ease ${i * 0.02}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, background: 'var(--gradient-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>{s.name[0]}</div>
                      <div>
                        <Link to={`/profile/${s.id}`} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</Link>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{s.year}</span>
                    <span><span className="badge badge-violet">{s.class}</span></span>
                    <span style={{ fontSize: 14 }}>{s.achievement_count}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{s.score}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'pending' && (
              <div className="animate-fadeIn">
                {achievements.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">✅</div><h3>All caught up!</h3><p>No pending achievement reviews.</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {achievements.map(a => (
                      <div key={a.id} className="card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={`badge type-${a.type} badge`}>{a.type}</span>
                              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>by {a.student_name} ({a.roll_no})</span>
                            </div>
                            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.title}</h4>
                            {a.description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{a.description}</p>}
                            {a.proof_url && <a href={a.proof_url} target="_blank" rel="noopener noreferrer" className="badge badge-violet" style={{ marginTop: 8, display: 'inline-flex' }}>🔗 View Proof</a>}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => verifyAch(a.id, true)}>✅ Verify</button>
                            <button className="btn btn-danger btn-sm" onClick={() => verifyAch(a.id, false)}>✕ Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <style>{`
        .admin-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
        .admin-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .admin-stat { padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 6px; align-items: center; }
        @media (max-width: 768px) { .admin-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
}
