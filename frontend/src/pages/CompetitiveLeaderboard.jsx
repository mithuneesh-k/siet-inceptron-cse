import { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Trophy, ShieldAlert, CheckCircle2, Lock, ChevronRight, Search,
  Users, Award, Zap, Code, ShieldCheck, Flame, BarChart3, HelpCircle,
  RefreshCw, ExternalLink, Copy, Check
} from 'lucide-react';

export default function CompetitiveLeaderboard() {
  const { user } = useAuth();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [batchFilter, setBatchFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Breakdown Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalSyncingMap, setModalSyncingMap] = useState({});
  const [modalSyncFeedback, setModalSyncFeedback] = useState(null);

  // Modal verification state
  const [showModalVerify, setShowModalVerify] = useState(false);
  const [modalVerifying, setModalVerifying] = useState(false);
  const [modalVerifyFeedback, setModalVerifyFeedback] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const isNonStudent = Boolean(user && (user.is_admin || user.role === 'admin' || user.role === 'faculty'));
  const autoSyncRan = useState(() => ({ current: false }))[0];

  const fetchLeaderboard = async () => {
    try {
      setErrorMsg(null);
      const res = await client.get(`/platforms/leaderboard?batch=${batchFilter}&class=${classFilter}`);
      setLeaderboard(res.data?.leaderboard || []);

      // Auto-sync stale platforms for student when visiting leaderboard
      if (user && !isNonStudent && !autoSyncRan.current) {
        autoSyncRan.current = true;
        try {
          const syncRes = await client.post('/platforms/sync-stale');
          if (syncRes.data?.synced && syncRes.data?.syncedPlatforms?.length > 0) {
            // Refetch leaderboard once after successful stale sync
            const updatedLeadRes = await client.get(`/platforms/leaderboard?batch=${batchFilter}&class=${classFilter}`);
            setLeaderboard(updatedLeadRes.data?.leaderboard || []);
          }
        } catch (syncErr) {
          console.error('Leaderboard student auto-sync failed:', syncErr);
        }
      }
    } catch (err) {
      console.error('Failed to load competitive leaderboard:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to load competitive leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [batchFilter, classFilter]);

  // Sync action inside student details modal
  const handleModalSync = async (platformCode) => {
    if (modalSyncingMap[platformCode]) return;
    setModalSyncingMap(prev => ({ ...prev, [platformCode]: true }));
    setModalSyncFeedback({ type: 'loading', message: `Syncing ${platformCode} metrics...` });

    try {
      const res = await client.post('/platforms/sync', { platformCode });
      const resData = res.data || {};

      if (resData.syncError) {
        setModalSyncFeedback({
          type: 'error',
          message: resData.message || `Last sync failed. ${platformCode} API is temporarily unavailable.`
        });
      } else {
        const isVer = Boolean(resData.connection?.ownershipVerified || resData.connection?.ownership_verified);
        setModalSyncFeedback({
          type: 'success',
          message: isVer
            ? 'Synced successfully — Leaderboard updated!'
            : 'Synced successfully — score will count after verification.'
        });
        setTimeout(() => setModalSyncFeedback(null), 5000);
      }

      // Refetch leaderboard to reflect new scores immediately!
      const leadRes = await client.get(`/platforms/leaderboard?batch=${batchFilter}&class=${classFilter}`);
      const updatedList = leadRes.data?.leaderboard || [];
      setLeaderboard(updatedList);

      if (selectedStudent) {
        const updatedStudent = updatedList.find(s => s.userId === selectedStudent.userId);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }
    } catch (err) {
      const isCooldown = err.response?.status === 429 || err.response?.data?.cooldown;
      const msg = err.response?.data?.error || `Failed to sync ${platformCode} data.`;
      setModalSyncFeedback({
        type: isCooldown ? 'cooldown' : 'error',
        message: msg
      });
    } finally {
      setModalSyncingMap(prev => ({ ...prev, [platformCode]: false }));
    }
  };

  const handleModalVerify = async () => {
    if (modalVerifying) return;
    setModalVerifying(true);
    setModalVerifyFeedback({ type: 'loading', message: 'Checking LeetCode profile for verification token...' });

    try {
      const res = await client.post('/platforms/verify', { platformCode: 'leetcode' });
      const resData = res.data || {};

      setModalVerifyFeedback({
        type: 'success',
        message: 'Ownership verified successfully! Competitive score updated.'
      });

      // Refetch leaderboard immediately
      const leadRes = await client.get(`/platforms/leaderboard?batch=${batchFilter}&class=${classFilter}`);
      const updatedList = leadRes.data?.leaderboard || [];
      setLeaderboard(updatedList);

      if (selectedStudent) {
        const updatedStudent = updatedList.find(s => s.userId === selectedStudent.userId);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }

      setTimeout(() => setShowModalVerify(false), 2000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification code was not found in your LeetCode profile.';
      setModalVerifyFeedback({
        type: 'error',
        message: msg
      });
    } finally {
      setModalVerifying(false);
    }
  };

  // Client-side search filtering
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase().trim();
    return leaderboard.filter(s =>
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(query))
    );
  }, [leaderboard, searchQuery]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalStudents = leaderboard.length;
    const verifiedProfiles = leaderboard.filter(s =>
      Object.values(s.platformBreakdown || {}).some(p => p.ownershipVerified)
    ).length;
    const totalProblemsSolved = leaderboard.reduce((acc, s) => acc + (s.totalProblems || 0), 0);
    const topScore = leaderboard.length > 0 && leaderboard[0].totalScore > 0 ? leaderboard[0].totalScore : 0;

    return {
      totalStudents,
      verifiedProfiles,
      totalProblemsSolved,
      topScore
    };
  }, [leaderboard]);

  const scoredStudents = useMemo(() => {
    return leaderboard.filter(s => s.totalScore > 0);
  }, [leaderboard]);

  const top3 = useMemo(() => {
    return scoredStudents.slice(0, 3);
  }, [scoredStudents]);

  if (loading) {
    return (
      <div className="page-content container">
        <div style={{ marginBottom: 24 }}>
          <div className="skeleton skeleton-text" style={{ width: 280, height: 32 }} />
          <div className="skeleton skeleton-text" style={{ width: 420, height: 16, marginTop: 8 }} />
        </div>
        <div className="grid-auto" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 110 }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ height: 420 }} />
      </div>
    );
  }

  const platformsList = [
    { code: 'codeforces', name: 'Codeforces', short: 'CF', activeColor: '#3B82F6' },
    { code: 'leetcode', name: 'LeetCode', short: 'LC', activeColor: '#FFA116' },
    { code: 'geeksforgeeks', name: 'GeeksforGeeks', short: 'GFG', activeColor: '#2F8D46' },
    { code: 'hackerrank', name: 'HackerRank', short: 'HR', activeColor: '#2EC866' }
  ];

  const isOwnRowSelected = Boolean(
    user && selectedStudent && user.id === selectedStudent.userId && !user.is_admin && user.role !== 'admin' && user.role !== 'faculty'
  );

  return (
    <div className="page-content">
      <div className="container">

        {/* HERO PAGE HEADER */}
        <div className="animate-fadeInUp" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.25))', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)' }}>
              <Trophy size={26} />
            </div>
            <div>
              <h1 className="section-title" style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
                Competitive Leaderboard
              </h1>
              <p className="section-subtitle" style={{ margin: 0, marginTop: 2 }}>
                Track coding progress across competitive programming platforms.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="card" style={{ padding: 16, marginBottom: 24, textAlign: 'center', borderColor: '#DC2626', color: '#DC2626', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid-auto animate-fadeInUp delay-1" style={{ marginBottom: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>

          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Total Students</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginTop: 2, lineHeight: 1 }}>{summaryMetrics.totalStudents}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Verified Profiles</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981', marginTop: 2, lineHeight: 1 }}>{summaryMetrics.verifiedProfiles}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Problems Solved</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginTop: 2, lineHeight: 1 }}>{summaryMetrics.totalProblemsSolved}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(234, 179, 8, 0.12)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flame size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Top Competitive Score</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', marginTop: 2, lineHeight: 1 }}>
                {summaryMetrics.topScore > 0 ? `${summaryMetrics.topScore} pts` : '—'}
              </div>
            </div>
          </div>

        </div>

        {/* TOP PERFORMERS PODIUM SECTION */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} style={{ color: '#F59E0B' }} /> Top Performers Podium
          </h2>

          {top3.length === 0 ? (
            <div className="card" style={{ padding: '32px 24px', textAlign: 'center', background: 'var(--color-card)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Trophy size={24} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px 0' }}>
                No verified competitive scores yet
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
                Connect and verify a programming profile on Codeforces or LeetCode to claim your spot on the podium!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {top3.map((student, idx) => {
                const rankNum = idx + 1;
                const isGold = rankNum === 1;
                const isSilver = rankNum === 2;
                const isBronze = rankNum === 3;

                const borderColor = isGold ? '#F59E0B' : isSilver ? '#94A3B8' : '#D97706';
                const rankBadgeBg = isGold
                  ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
                  : isSilver
                  ? 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)'
                  : 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)';
                const rankTextColor = isGold ? '#B45309' : isSilver ? '#475569' : '#9A3412';

                const medalEmoji = isGold ? '🥇' : isSilver ? '🥈' : '🥉';
                const rankLabel = isGold ? '1st Place' : isSilver ? '2nd Place' : '3rd Place';

                return (
                  <div
                    key={student.userId}
                    className="card table-row-hover"
                    onClick={() => {
                      setModalSyncFeedback(null);
                      setSelectedStudent(student);
                    }}
                    style={{
                      padding: 20,
                      position: 'relative',
                      background: 'var(--color-card)',
                      border: `1px solid var(--color-border)`,
                      borderTop: `4px solid ${borderColor}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: rankBadgeBg, color: rankTextColor, display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${borderColor}40` }}>
                        <span>{medalEmoji}</span> {rankLabel}
                      </span>
                      <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700 }}>
                        #{rankNum}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      {student.avatarUrl ? (
                        <img src={student.avatarUrl} alt={student.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${borderColor}` }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))', border: `2px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'var(--color-text)' }}>
                          {student.name?.[0] || '?'}
                        </div>
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)' }}>
                          {student.name}
                        </h3>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {student.rollNo || 'No Roll'} • {student.class || ''} ({student.batch || ''})
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                      {platformsList.map(p => {
                        const bd = student.platformBreakdown?.[p.code];
                        const isConn = bd?.connected;
                        const isVer = bd?.ownershipVerified;

                        return (
                          <span
                            key={p.code}
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: isConn && isVer ? `${p.activeColor}15` : 'var(--bg-hover)',
                              color: isConn && isVer ? p.activeColor : isConn ? '#D97706' : 'var(--color-text-muted)',
                              border: `1px solid ${isConn && isVer ? `${p.activeColor}35` : 'var(--color-border)'}`,
                              opacity: isConn ? 1 : 0.45
                            }}
                            title={`${p.name}: ${isConn ? (isVer ? 'Verified' : 'Unverified') : 'Not Connected'}`}
                          >
                            {p.short}
                          </span>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Total Solved</div>
                        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2, color: 'var(--color-text)' }}>{student.totalProblems} problems</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Competitive Score</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-primary)', marginTop: 1 }}>{student.totalScore} pts</div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FULL RANKINGS TABLE */}
        <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} /> Full Department Rankings
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 3 }}>
                Server-calculated score breakdown: Easy (10p) + Medium (20p) + Hard (30p).
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>

              <div style={{ position: 'relative', width: 230 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search student or roll..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: 12.5, height: 38, borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <select className="form-select" value={batchFilter} onChange={e => setBatchFilter(e.target.value)} style={{ fontSize: 12.5, padding: '6px 12px', height: 38, borderRadius: 'var(--radius-md)' }}>
                <option value="all">All Batches</option>
                <option value="2021-2025">2021-2025</option>
                <option value="2022-2026">2022-2026</option>
                <option value="2023-2027">2023-2027</option>
                <option value="2024-2028">2024-2028</option>
              </select>

              <select className="form-select" value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ fontSize: 12.5, padding: '6px 12px', height: 38, borderRadius: 'var(--radius-md)' }}>
                <option value="all">All Classes</option>
                <option value="CSE-A">CSE-A</option>
                <option value="CSE-B">CSE-B</option>
                <option value="CSE-C">CSE-C</option>
              </select>

            </div>
          </div>

          {filteredLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-muted)' }}>
              No students match the selected filters or search query.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '10px 14px', width: 75, minWidth: 75 }}>Rank</th>
                    <th style={{ padding: '10px 12px' }}>Student</th>
                    <th style={{ padding: '10px 12px', width: 110 }}>Roll Number</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Platforms</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#10B981' }}>Easy (10p)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#F59E0B' }}>Medium (20p)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#EF4444' }}>Hard (30p)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Solved</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Competitive Score</th>
                    <th style={{ padding: '10px 8px', width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((item) => {
                    const isTop1 = item.rank === 1 && item.totalScore > 0;
                    const isTop2 = item.rank === 2 && item.totalScore > 0;
                    const isTop3 = item.rank === 3 && item.totalScore > 0;
                    const hasNoVerifiedPlatform = item.totalScore === 0;

                    return (
                      <tr
                        key={item.userId}
                        style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                        onClick={() => {
                          setModalSyncFeedback(null);
                          setSelectedStudent(item);
                        }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 800, width: 75, minWidth: 75, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
                          {isTop1 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 12, background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#B45309', fontSize: 11, fontWeight: 800, border: '1px solid #F59E0B40', whiteSpace: 'nowrap' }}>
                              🥇 #1
                            </span>
                          ) : isTop2 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 12, background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)', color: '#475569', fontSize: 11, fontWeight: 800, border: '1px solid #94A3B840', whiteSpace: 'nowrap' }}>
                              🥈 #2
                            </span>
                          ) : isTop3 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 12, background: 'linear-gradient(135deg, #FFEDD5, #FED7AA)', color: '#9A3412', fontSize: 11, fontWeight: 800, border: '1px solid #F9731640', whiteSpace: 'nowrap' }}>
                              🥉 #3
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 12, background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700 }}>
                              {item.totalScore > 0 ? `#${item.rank}` : '—'}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt={item.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.12))', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--color-text)', fontSize: 13 }}>
                                {item.name?.[0] || '?'}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{item.class || ''} {item.batch ? `(${item.batch})` : ''}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 12.5 }}>
                          {item.rollNo || '—'}
                        </td>

                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {platformsList.map(p => {
                              const bd = item.platformBreakdown?.[p.code];
                              const isConn = bd?.connected;
                              const isVer = bd?.ownershipVerified;

                              return (
                                <span
                                  key={p.code}
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: isConn && isVer ? `${p.activeColor}15` : 'var(--bg-hover)',
                                    color: isConn && isVer ? p.activeColor : isConn ? '#D97706' : 'var(--color-text-muted)',
                                    border: `1px solid ${isConn && isVer ? `${p.activeColor}35` : 'var(--color-border)'}`,
                                    opacity: isConn ? 1 : 0.4
                                  }}
                                  title={`${p.name}: ${isConn ? (isVer ? 'Verified' : 'Unverified (0 pts)') : 'Not Connected'}`}
                                >
                                  {p.short}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          {item.easySolved > 0 ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              <span style={{ fontWeight: 800, color: '#10B981', fontSize: 13 }}>{item.easySolved}</span>
                              <span style={{ fontSize: 9.5, color: '#10B981', fontWeight: 600 }}>{item.easyPoints} pts</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          {item.mediumSolved > 0 ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(245, 158, 11, 0.08)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                              <span style={{ fontWeight: 800, color: '#F59E0B', fontSize: 13 }}>{item.mediumSolved}</span>
                              <span style={{ fontSize: 9.5, color: '#F59E0B', fontWeight: 600 }}>{item.mediumPoints} pts</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          {item.hardSolved > 0 ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <span style={{ fontWeight: 800, color: '#EF4444', fontSize: 13 }}>{item.hardSolved}</span>
                              <span style={{ fontSize: 9.5, color: '#EF4444', fontWeight: 600 }}>{item.hardPoints} pts</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 800, color: 'var(--color-text)' }}>
                          {item.totalProblems || 0}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {hasNoVerifiedPlatform ? (
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontWeight: 600 }}>
                              Unconnected (0 pts)
                            </span>
                          ) : (
                            <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--color-primary)' }}>
                              {item.totalScore} pts
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--color-text-muted)', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* PLATFORM BREAKDOWN MODAL */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedStudent(null)}>
          <div className="modal card" style={{ maxWidth: 540, padding: 24 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedStudent.avatarUrl ? (
                  <img src={selectedStudent.avatarUrl} alt={selectedStudent.name} style={{ width: 44, height: 44, borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                    {selectedStudent.name?.[0] || '?'}
                  </div>
                )}
                <div>
                  <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                    {selectedStudent.name}
                  </h2>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Roll: {selectedStudent.rollNo || 'N/A'} • {selectedStudent.class || ''} ({selectedStudent.batch || ''})
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelectedStudent(null)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-hover)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Competitive Score</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)' }}>{selectedStudent.totalScore} points</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Solved</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedStudent.totalProblems} problems</div>
              </div>
            </div>

            {modalSyncFeedback && (
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: modalSyncFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : modalSyncFeedback.type === 'cooldown' || modalSyncFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                color: modalSyncFeedback.type === 'success' ? 'var(--color-green)' : modalSyncFeedback.type === 'cooldown' || modalSyncFeedback.type === 'error' ? '#EF4444' : '#3B82F6',
                border: `1px solid ${modalSyncFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : modalSyncFeedback.type === 'cooldown' || modalSyncFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
              }}>
                <RefreshCw size={14} className={modalSyncFeedback.type === 'loading' ? 'spin' : ''} />
                {modalSyncFeedback.message}
              </div>
            )}

            <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
              Platform Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Codeforces Breakdown */}
              {(() => {
                const cf = selectedStudent.platformBreakdown?.codeforces;
                const isConn = cf?.connected;

                return (
                  <div className="card" style={{ padding: 14, background: 'var(--color-bg)', borderLeft: '4px solid #3B82F6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: '#3B82F6' }}>Codeforces</span>
                        {isConn && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            @{cf.handle}
                            <a href={`https://codeforces.com/profile/${cf.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6' }}>
                              <ExternalLink size={12} />
                            </a>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isConn ? (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>Not Connected</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={12} /> Connected ({cf.totalScore} pts)
                          </span>
                        )}

                        {isOwnRowSelected && isConn && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleModalSync('codeforces')}
                            disabled={modalSyncingMap.codeforces}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px' }}
                          >
                            <RefreshCw size={12} className={modalSyncingMap.codeforces ? 'spin' : ''} />
                            {modalSyncingMap.codeforces ? 'Syncing...' : 'Sync'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isConn && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--color-green)', fontWeight: 700 }}>Easy (10p)</div>
                          <div>{cf.easySolved ?? '—'} ({cf.easyPoints} pts)</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: '#EAB308', fontWeight: 700 }}>Medium (20p)</div>
                          <div>{cf.mediumSolved ?? '—'} ({cf.mediumPoints} pts)</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: '#EF4444', fontWeight: 700 }}>Hard (30p)</div>
                          <div>{cf.hardSolved ?? '—'} ({cf.hardPoints} pts)</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* LeetCode Breakdown */}
              {(() => {
                const lc = selectedStudent.platformBreakdown?.leetcode;
                const isConn = lc?.connected;

                return (
                  <div className="card" style={{ padding: 14, background: 'var(--color-bg)', borderLeft: '4px solid #FFA116' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: '#FFA116' }}>LeetCode</span>
                        {isConn && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            @{lc.handle}
                            <a href={`https://leetcode.com/u/${lc.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA116' }}>
                              <ExternalLink size={12} />
                            </a>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isConn ? (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>Not Connected</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={12} /> Connected ({lc.totalScore} pts)
                          </span>
                        )}

                        {isOwnRowSelected && isConn && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleModalSync('leetcode')}
                            disabled={modalSyncingMap.leetcode}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px' }}
                          >
                            <RefreshCw size={12} className={modalSyncingMap.leetcode ? 'spin' : ''} />
                            {modalSyncingMap.leetcode ? 'Syncing...' : 'Sync'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isConn && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--color-green)', fontWeight: 700 }}>Easy (10p)</div>
                          <div>{lc.easySolved ?? '—'} ({lc.easyPoints} pts)</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: '#EAB308', fontWeight: 700 }}>Medium (20p)</div>
                          <div>{lc.mediumSolved ?? '—'} ({lc.mediumPoints} pts)</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: '#EF4444', fontWeight: 700 }}>Hard (30p)</div>
                          <div>{lc.hardSolved ?? '—'} ({lc.hardPoints} pts)</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* GeeksforGeeks Breakdown */}
              {(() => {
                const gfg = selectedStudent.platformBreakdown?.geeksforgeeks;
                const isConn = gfg?.connected;
                const m = gfg?.metrics || {};

                return (
                  <div className="card" style={{ padding: 14, background: 'var(--color-bg)', borderLeft: '4px solid #2F8D46' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: '#2F8D46' }}>GeeksforGeeks</span>
                        {isConn && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            @{gfg.handle}
                            <a href={`https://www.geeksforgeeks.org/user/${gfg.handle}/`} target="_blank" rel="noopener noreferrer" style={{ color: '#2F8D46' }}>
                              <ExternalLink size={12} />
                            </a>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isConn ? (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>Not Connected</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={12} /> Connected (0 pts contribution)
                          </span>
                        )}

                        {isOwnRowSelected && isConn && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleModalSync('geeksforgeeks')}
                            disabled={modalSyncingMap.geeksforgeeks}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px' }}
                          >
                            <RefreshCw size={12} className={modalSyncingMap.geeksforgeeks ? 'spin' : ''} />
                            {modalSyncingMap.geeksforgeeks ? 'Syncing...' : 'Sync'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isConn && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: '#2F8D46', fontWeight: 700 }}>Coding Score</div>
                          <div>{m.score ?? '—'}</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Total Solved</div>
                          <div>{m.totalSolved ?? '—'}</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Institute Rank</div>
                          <div>{m.instituteRank || '—'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* HackerRank Breakdown */}
              {(() => {
                const hr = selectedStudent.platformBreakdown?.hackerrank;
                const isConn = hr?.connected;
                const m = hr?.metrics || {};

                return (
                  <div className="card" style={{ padding: 14, background: 'var(--color-bg)', borderLeft: '4px solid #2EC866' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: '#2EC866' }}>HackerRank</span>
                        {isConn && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            @{hr.handle}
                            <a href={`https://www.hackerrank.com/profile/${hr.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2EC866' }}>
                              <ExternalLink size={12} />
                            </a>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isConn ? (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>Not Connected</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--color-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={12} /> Connected (0 pts contribution)
                          </span>
                        )}

                        {isOwnRowSelected && isConn && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleModalSync('hackerrank')}
                            disabled={modalSyncingMap.hackerrank}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px' }}
                          >
                            <RefreshCw size={12} className={modalSyncingMap.hackerrank ? 'spin' : ''} />
                            {modalSyncingMap.hackerrank ? 'Syncing...' : 'Sync'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isConn && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: '#2EC866', fontWeight: 700 }}>Level</div>
                          <div>{m.level ?? '—'}</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Badges</div>
                          <div>{m.badgesCount ?? (m.badges?.length || 0)}</div>
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Member Since</div>
                          <div>{m.createdYear || '—'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedStudent(null)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
