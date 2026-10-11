import { useState, useEffect } from 'react';
import client from '../api/client';
import CustomSelect from './CustomSelect';
import {
  Trophy, Medal, Award, Search, GraduationCap,
  BookOpen, Sparkles, User, RefreshCw, AlertCircle
} from 'lucide-react';

const BATCH_OPTIONS = ['2025-2029', '2024-2028', '2023-2027', '2022-2026'];
const CLASS_OPTIONS = ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D', 'CSE-E'];
const SEMESTER_OPTIONS = ['Semester 2', 'Semester 1'];

export default function CgpaLeaderboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batchFilter, setBatchFilter] = useState('2025-2029');
  const [classFilter, setClassFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchCgpaLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (batchFilter && batchFilter !== 'all') params.append('batch', batchFilter);
      if (classFilter && classFilter !== 'all') params.append('class', classFilter);
      if (semesterFilter && semesterFilter !== 'all') {
        const semNum = semesterFilter.replace('Semester ', '');
        params.append('semester', semNum);
      }
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', page);
      params.append('limit', '50');

      // Try /academics/leaderboard, fallback to /leaderboard/cgpa
      let res;
      try {
        res = await client.get(`/academics/leaderboard?${params}`);
      } catch (e) {
        res = await client.get(`/leaderboard/cgpa?${params}`);
      }

      const data = res.data || {};
      const list = data.students || (Array.isArray(data) ? data : []);
      setStudents(list);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total !== undefined ? data.total : list.length);
    } catch (err) {
      console.error('Failed to load CGPA leaderboard:', err);
      setError('Unable to load CGPA academic leaderboard. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCgpaLeaderboard();
  }, [batchFilter, classFilter, semesterFilter, searchQuery, page]);

  const top3 = page === 1 && !searchQuery.trim() ? students.slice(0, 3) : [];
  const listStudents = page === 1 && !searchQuery.trim() ? students.slice(3) : students;

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FILTER CONTROLS */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'var(--bg-card, #121c16)',
          border: '1px solid var(--border, rgba(16, 185, 129, 0.2))',
          borderRadius: 'var(--radius-lg, 16px)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ minWidth: '150px' }}>
            <CustomSelect
              options={['All Batches', ...BATCH_OPTIONS]}
              value={batchFilter === 'all' ? 'All Batches' : batchFilter}
              onChange={(val) => {
                setBatchFilter(val === 'All Batches' ? 'all' : val);
                setPage(1);
              }}
              placeholder="Batch"
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <CustomSelect
              options={['All Sections', ...CLASS_OPTIONS]}
              value={classFilter === 'all' ? 'All Sections' : classFilter}
              onChange={(val) => {
                setClassFilter(val === 'All Sections' ? 'all' : val);
                setPage(1);
              }}
              placeholder="Section"
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <CustomSelect
              options={['All Semesters', ...SEMESTER_OPTIONS]}
              value={semesterFilter === 'all' ? 'All Semesters' : semesterFilter}
              onChange={(val) => {
                setSemesterFilter(val === 'All Semesters' ? 'all' : val);
                setPage(1);
              }}
              placeholder="Semester"
            />
          </div>
        </div>

        {/* SEARCH BOX */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #94a3b8)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search student or roll no..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              paddingLeft: '36px',
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-hover, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              borderRadius: 'var(--radius-md, 10px)'
            }}
          />
        </div>
      </div>

      {/* METRIC BADGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem' }}>
          <GraduationCap size={18} style={{ color: 'var(--accent, #10b981)' }} />
          <span>Showing <strong>{students.length}</strong> of <strong>{totalRecords}</strong> academic records</span>
        </div>
        <button
          onClick={fetchCgpaLeaderboard}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ERROR NOTICE */}
      {error && (
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !students.length && (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent, #10b981)' }} />
          <p>Calculating department CGPA leaderboard & ranking...</p>
        </div>
      )}

      {/* TOP 3 PODIUM */}
      {!loading && top3.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '10px'
          }}
        >
          {top3.map((s, idx) => {
            const rank = idx + 1;
            const rankColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : '#d97706';
            const rankTitle = rank === 1 ? '1st Rank' : rank === 2 ? '2nd Rank' : '3rd Rank';
            return (
              <div
                key={s.roll_no}
                className="card"
                style={{
                  position: 'relative',
                  padding: '24px',
                  borderRadius: 'var(--radius-lg, 16px)',
                  background: 'var(--bg-card, #121c16)',
                  border: `2px solid ${rankColor}`,
                  boxShadow: rank === 1 ? '0 10px 30px rgba(251, 191, 36, 0.15)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'transform 0.2s ease',
                  overflow: 'hidden'
                }}
              >
                {/* Crown / Rank Banner */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: `${rankColor}22`,
                    color: rankColor,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  <Trophy size={14} /> #{rank}
                </div>

                {/* Photo or Avatar */}
                <div
                  style={{
                    position: 'relative',
                    width: '90px',
                    height: '90px',
                    margin: '8px auto 14px',
                    borderRadius: '50%',
                    padding: '3px',
                    background: `linear-gradient(135deg, ${rankColor}, transparent)`,
                    boxShadow: `0 8px 20px ${rankColor}33`
                  }}
                >
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt={s.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        background: '#1a2720'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: s.photo_url ? 'none' : 'flex',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: rankColor,
                      fontSize: '1.5rem',
                      fontWeight: 700
                    }}
                  >
                    {s.name ? s.name.charAt(0) : <User size={32} />}
                  </div>
                </div>

                {/* Student Info */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text, #fff)' }}>
                  {s.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '12px' }}>
                  <span>{s.roll_no}</span> • <span style={{ color: 'var(--accent, #10b981)', fontWeight: 600 }}>{s.class || 'CSE'}</span>
                </div>

                {/* Scores Grid */}
                <div
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '12px 8px',
                    borderRadius: '12px',
                    background: 'var(--bg-hover, rgba(255, 255, 255, 0.03))',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.06))'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)' }}>CGPA</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: rankColor }}>
                      {parseFloat(s.cgpa).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)' }}>SGPA</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text, #e2e8f0)' }}>
                      {s.sgpa ? parseFloat(s.sgpa).toFixed(2) : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)' }}>Credits</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text, #e2e8f0)' }}>
                      {s.cumulative_credits || s.earned_credits || '-'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED RANKING TABLE */}
      {!loading && students.length > 0 && (
        <div
          className="card"
          style={{
            overflowX: 'auto',
            background: 'var(--bg-card, #121c16)',
            borderRadius: 'var(--radius-lg, 16px)',
            border: '1px solid var(--border, rgba(16, 185, 129, 0.2))',
            padding: 0
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  background: 'var(--bg-hover, rgba(255, 255, 255, 0.02))',
                  color: 'var(--text-muted, #94a3b8)'
                }}
              >
                <th style={{ padding: '14px 16px', width: '60px', textAlign: 'center' }}>Rank</th>
                <th style={{ padding: '14px 16px' }}>Student</th>
                <th style={{ padding: '14px 16px', width: '100px' }}>Section</th>
                <th style={{ padding: '14px 16px', width: '90px', textAlign: 'center' }}>SGPA</th>
                <th style={{ padding: '14px 16px', width: '100px', textAlign: 'center' }}>CGPA</th>
                <th style={{ padding: '14px 16px', width: '90px', textAlign: 'center' }}>Credits</th>
                <th style={{ padding: '14px 16px', width: '110px', textAlign: 'center' }}>Class Rank</th>
              </tr>
            </thead>
            <tbody>
              {listStudents.map((s, idx) => {
                const overallRank = s.batch_rank || (page - 1) * 50 + idx + 4;
                const isTop10 = overallRank <= 10;
                return (
                  <tr
                    key={s.roll_no}
                    style={{
                      borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover, rgba(255, 255, 255, 0.04))'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isTop10 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          color: isTop10 ? 'var(--accent, #10b981)' : 'var(--text-muted, #94a3b8)'
                        }}
                      >
                        {overallRank}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#1a2720',
                            flexShrink: 0
                          }}
                        >
                          {s.photo_url ? (
                            <img
                              src={s.photo_url}
                              alt={s.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              display: s.photo_url ? 'none' : 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: 'var(--accent, #10b981)',
                              fontSize: '0.85rem',
                              fontWeight: 700
                            }}
                          >
                            {s.name ? s.name.charAt(0) : <User size={16} />}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text, #fff)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{s.roll_no}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text, #e2e8f0)'
                        }}
                      >
                        {s.class || 'CSE'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                      {s.sgpa ? parseFloat(s.sgpa).toFixed(2) : '-'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 800,
                          fontSize: '0.9rem'
                        }}
                      >
                        {parseFloat(s.cgpa).toFixed(2)}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                      {s.cumulative_credits || s.earned_credits || '-'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {s.class_rank ? (
                        <span style={{ fontWeight: 600, color: 'var(--accent, #10b981)' }}>#{s.class_rank}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #94a3b8)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EMPTY RESULTS */}
      {!loading && students.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
          <Sparkles size={36} style={{ margin: '0 auto 12px', color: 'var(--accent, #10b981)' }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--text, #fff)' }}>No Academic Records Found</h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            No students matched your selected batch ({batchFilter}) and section ({classFilter}) filters.
          </p>
        </div>
      )}
    </div>
  );
}
