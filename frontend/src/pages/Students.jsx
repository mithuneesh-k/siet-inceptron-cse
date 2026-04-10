import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

const CLASSES = ['All', 'CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  useEffect(() => {
    client.get('/users').then(res => {
      const nonAdmins = res.data.filter(u => !u.is_admin);
      const sorted = nonAdmins.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(sorted);
      setFiltered(sorted);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = students;
    if (classFilter !== 'All') result = result.filter(s => s.class === classFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roll_no.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, classFilter, students]);

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="section-header animate-fadeInUp" style={{ marginBottom: '28px' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '32px' }}>👨‍🎓 Students</h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
              {filtered.length} of {students.length} students — CSE Batch 2025
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="students-filters animate-fadeInUp" style={{ marginBottom: '24px' }}>
          <input
            id="student-search"
            className="form-input"
            style={{ maxWidth: 320 }}
            placeholder="🔍 Search by name, roll no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="students-class-tabs">
            {CLASSES.map(c => (
              <button
                key={c}
                className={`tab-btn ${classFilter === c ? 'active' : ''}`}
                onClick={() => setClassFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No students found</h3>
            <p>Try adjusting your search or class filter.</p>
          </div>
        ) : (
          <div className="students-grid animate-fadeInUp">
            {filtered.map(s => (
              <Link
                key={s.id}
                to={`/profile/${s.id}`}
                className="student-card card"
                id={`student-${s.roll_no}`}
              >
                <div className="student-card-avatar">{s.name[0]}</div>
                <div className="student-card-info">
                  <div className="student-card-name">{s.name}</div>
                  <div className="student-card-meta">
                    <span className="badge badge-violet" style={{ fontSize: 10 }}>{s.class}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{s.roll_no}</span>
                  </div>
                  {s.score > 0 && (
                    <div className="student-card-score">
                      <span>⭐ {s.score} pts</span>
                      <span>· {s.achievement_count} achievements</span>
                    </div>
                  )}
                  {s.github && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      🔗 {s.github}
                    </div>
                  )}
                </div>
                <div className="student-card-arrow">›</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .students-filters { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .students-class-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .tab-btn { padding: 6px 14px; border-radius: var(--radius-full); border: 1px solid var(--border); background: transparent; color: var(--color-text-muted); font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .tab-btn:hover { border-color: var(--color-violet); color: var(--color-violet-light); }
        .tab-btn.active { background: var(--gradient-primary); color: #fff; border-color: transparent; font-weight: 600; }
        .students-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .student-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .student-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.18); border-color: rgba(124,58,237,0.3); }
        .student-card-avatar { width: 46px; height: 46px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .student-card-info { flex: 1; min-width: 0; }
        .student-card-name { font-weight: 700; font-size: 14px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .student-card-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
        .student-card-score { font-size: 12px; color: var(--color-violet-light); margin-top: 4px; font-weight: 500; }
        .student-card-arrow { font-size: 22px; color: var(--color-text-muted); flex-shrink: 0; }
      `}</style>
    </div>
  );
}
