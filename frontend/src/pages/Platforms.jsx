import { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  Code, RefreshCw, Unlink, CheckCircle2, AlertTriangle,
  ExternalLink, Eye, BarChart2
} from 'lucide-react';

// ─── 1. SCORE CONTRIBUTION HORIZONTAL VISUALIZATION COMPONENT ──────────────────
function ScoreContributionChart({ platforms }) {
  const platformConfigs = [
    { code: 'codeforces', name: 'Codeforces', color: '#3B82F6', iconSymbol: 'CF' },
    { code: 'leetcode', name: 'LeetCode', color: '#FFA116', iconSymbol: '⚡' },
    { code: 'geeksforgeeks', name: 'GeeksforGeeks', color: '#2F8D46', iconSymbol: '🌿' },
    { code: 'hackerrank', name: 'HackerRank', color: '#2EC866', iconSymbol: '🏆' }
  ];

  const connectedList = platformConfigs.map(cfg => {
    const p = platforms.find(item => item.code === cfg.code);
    const conn = p?.connection;
    const isConnected = Boolean(conn);
    const isVerified = Boolean(conn?.ownershipVerified ?? conn?.ownership_verified);

    let score = 0;
    if (isConnected && isVerified && conn?.metrics) {
      const easy = typeof conn.metrics.easySolved === 'number' && conn.metrics.easySolved >= 0 ? conn.metrics.easySolved : 0;
      const med = typeof conn.metrics.mediumSolved === 'number' && conn.metrics.mediumSolved >= 0 ? conn.metrics.mediumSolved : 0;
      const hard = typeof conn.metrics.hardSolved === 'number' && conn.metrics.hardSolved >= 0 ? conn.metrics.hardSolved : 0;
      score = easy * 10 + med * 20 + hard * 30;
    }

    return {
      ...cfg,
      isConnected,
      isVerified,
      handle: conn?.handle || null,
      score
    };
  }).filter(p => p.isConnected);

  if (connectedList.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={16} style={{ color: '#3B82F6' }} /> SCORE CONTRIBUTION
        </h3>
        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
          No platform accounts connected yet.
        </div>
      </div>
    );
  }

  const totalScore = connectedList.reduce((sum, p) => sum + p.score, 0);

  return (
    <div className="card" style={{ padding: '20px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
      {/* Header: Section Heading (Left) + Total Score (Right) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart2 size={16} style={{ color: '#3B82F6' }} /> SCORE CONTRIBUTION
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            TOTAL SCORE
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', fontFamily: 'Space Grotesk, sans-serif' }}>
            {totalScore} <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>PTS</span>
          </div>
        </div>
      </div>

      {/* Platform Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {connectedList.map((p) => {
          const percentage = totalScore > 0 ? Math.round((p.score / totalScore) * 100) : 0;

          return (
            <div key={p.code} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Row Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: `${p.color}1E`,
                    border: `1px solid ${p.color}40`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: p.color
                  }}>
                    {p.iconSymbol}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: p.isVerified ? '#10B981' : '#D97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {p.isVerified ? (
                        <>
                          <CheckCircle2 size={11} /> Verified
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={11} /> Pending verification
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--color-text)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {p.score} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>pts</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.color }}>
                    {percentage}%
                  </div>
                </div>
              </div>

              {/* Horizontal Progress Bar */}
              <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-hover)', overflow: 'hidden', width: '100%' }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: p.color,
                  borderRadius: 4,
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanatory Note Footer */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>💡</span> Only verified platform accounts contribute to your competitive score.
      </div>
    </div>
  );
}

// ─── 2. BAR CHART COMPONENT ───────────────────────────────────────────────────
function DifficultyBarChart({ platforms }) {
  const cf = platforms.find(p => p.code === 'codeforces');
  const lc = platforms.find(p => p.code === 'leetcode');

  const cfConn = Boolean(cf?.connection);
  const lcConn = Boolean(lc?.connection);

  const cfMetrics = cf?.connection?.metrics || {};
  const lcMetrics = lc?.connection?.metrics || {};

  const easySolved = (cfConn ? (cfMetrics.easySolved || 0) : 0) + (lcConn ? (lcMetrics.easySolved || 0) : 0);
  const mediumSolved = (cfConn ? (cfMetrics.mediumSolved || 0) : 0) + (lcConn ? (lcMetrics.mediumSolved || 0) : 0);
  const hardSolved = (cfConn ? (cfMetrics.hardSolved || 0) : 0) + (lcConn ? (lcMetrics.hardSolved || 0) : 0);

  const totalProblems = easySolved + mediumSolved + hardSolved;
  const maxVal = Math.max(easySolved, mediumSolved, hardSolved, 1);

  const bars = [
    { label: 'Easy', count: easySolved, points: easySolved * 10, color: '#10B981' },
    { label: 'Medium', count: mediumSolved, points: mediumSolved * 20, color: '#F59E0B' },
    { label: 'Hard', count: hardSolved, points: hardSolved * 30, color: '#EF4444' }
  ];

  return (
    <div className="card" style={{ padding: '20px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={16} style={{ color: '#10B981' }} /> Problem Solving Breakdown
        </h3>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
          {totalProblems} solved
        </span>
      </div>

      {totalProblems === 0 ? (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12.5, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
          No difficulty metrics available yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bars.map((bar, i) => {
            const pct = Math.round((bar.count / maxVal) * 100);
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: bar.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {bar.label} <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>({bar.points} pts)</span>
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                    {bar.count} <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>solved</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-hover)', overflow: 'hidden', display: 'flex' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: bar.color,
                      borderRadius: 4,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic', textAlign: 'center' }}>
            Aggregated Easy (10p) + Medium (20p) + Hard (30p)
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PLATFORMS PAGE COMPONENT ───────────────────────────────────────────
export default function Platforms() {
  const { user } = useAuth();
  const isNonStudent = Boolean(user && (user.is_admin || user.role === 'admin' || user.role === 'faculty'));

  const [platforms, setPlatforms] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [configMessage, setConfigMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Connect modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectPlatformCode, setConnectPlatformCode] = useState('codeforces');
  const [connectHandle, setConnectHandle] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  // Disconnect modal state
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectPlatformCode, setDisconnectPlatformCode] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Per-platform sync states & feedback
  const [syncingMap, setSyncingMap] = useState({});
  const [syncFeedbackMap, setSyncFeedbackMap] = useState({});
  const [toast, setToast] = useState(null);
  const autoSyncRan = useState(() => ({ current: false }))[0];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPlatformsState = async () => {
    try {
      setErrorMsg(null);
      const res = await client.get('/platforms');
      const data = res.data || {};
      setConfigured(data.configured !== false);
      setConfigMessage(data.message || '');
      const fetchedPlatforms = data.platforms || [];
      setPlatforms(fetchedPlatforms);

      // Auto-sync stale platforms for authenticated student only
      if (!isNonStudent && !autoSyncRan.current) {
        autoSyncRan.current = true;

        const staleCodes = fetchedPlatforms.filter(p => {
          if (!p.connection) return false;
          const lastSynced = p.connection.lastSyncedAt || p.connection.last_synced_at;
          if (!lastSynced) return true;
          return (Date.now() - new Date(lastSynced).getTime()) >= 30 * 60 * 1000;
        }).map(p => p.code);

        if (staleCodes.length > 0) {
          staleCodes.forEach(code => {
            setSyncFeedbackMap(prev => ({
              ...prev,
              [code]: { type: 'loading', message: 'Updating latest stats...' }
            }));
          });

          try {
            const syncRes = await client.post('/platforms/sync-stale');
            const syncData = syncRes.data || {};
            if (syncData.state?.platforms) {
              setPlatforms(syncData.state.platforms);
            }
            if (syncData.syncedPlatforms && syncData.syncedPlatforms.length > 0) {
              syncData.syncedPlatforms.forEach(code => {
                const updatedPlatform = syncData.state?.platforms?.find(p => p.code === code);
                const isError = updatedPlatform?.connectionStatus === 'sync_error';
                if (isError) {
                  setSyncFeedbackMap(prev => ({
                    ...prev,
                    [code]: { type: 'error', message: 'Could not refresh latest stats. Showing last synced data.' }
                  }));
                } else {
                  setSyncFeedbackMap(prev => ({
                    ...prev,
                    [code]: { type: 'success', message: 'Updated latest stats' }
                  }));
                  setTimeout(() => {
                    setSyncFeedbackMap(prev => ({ ...prev, [code]: null }));
                  }, 5000);
                }
              });
            } else {
              staleCodes.forEach(code => {
                setSyncFeedbackMap(prev => ({ ...prev, [code]: null }));
              });
            }
          } catch (syncErr) {
            console.error('Auto-sync stale failed:', syncErr);
            staleCodes.forEach(code => {
              setSyncFeedbackMap(prev => ({
                ...prev,
                [code]: { type: 'error', message: 'Could not refresh latest stats. Showing last synced data.' }
              }));
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch platforms state:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to load platforms data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformsState();
  }, [isNonStudent]);

  const openConnectModal = (pCode) => {
    setConnectPlatformCode(pCode);
    setConnectHandle('');
    setConnectError(null);
    setShowConnectModal(true);
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!connectHandle.trim() || connecting) return;

    setConnecting(true);
    setConnectError(null);

    try {
      const res = await client.post('/platforms/connect', {
        platformCode: connectPlatformCode,
        handle: connectHandle.trim()
      });

      const resData = res.data || {};
      if (resData.connection) {
        setPlatforms(prev => prev.map(p => p.code === connectPlatformCode ? {
          ...p,
          connectionStatus: resData.connection.status || 'connected',
          connection: resData.connection
        } : p));

        setShowConnectModal(false);
        setConnectHandle('');

        const platformNames = {
          codeforces: 'Codeforces',
          leetcode: 'LeetCode',
          geeksforgeeks: 'GeeksforGeeks',
          hackerrank: 'HackerRank'
        };
        showToast(`Successfully connected ${platformNames[connectPlatformCode] || connectPlatformCode} handle @${resData.connection.handle}! 🎉`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to connect ${connectPlatformCode} handle.`;
      setConnectError(msg);
      showToast(msg, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (pCode) => {
    if (syncingMap[pCode]) return;
    const platformNames = {
      codeforces: 'Codeforces',
      leetcode: 'LeetCode',
      geeksforgeeks: 'GeeksforGeeks',
      hackerrank: 'HackerRank'
    };
    const pName = platformNames[pCode] || pCode;

    setSyncingMap(prev => ({ ...prev, [pCode]: true }));
    setSyncFeedbackMap(prev => ({ ...prev, [pCode]: { type: 'loading', message: `Syncing ${pName} metrics...` } }));

    try {
      const res = await client.post('/platforms/sync', { platformCode: pCode });
      const resData = res.data || {};

      if (resData.connection) {
        setPlatforms(prev => prev.map(p => p.code === pCode ? {
          ...p,
          connectionStatus: resData.connection.status || 'connected',
          connection: resData.connection
        } : p));
      }

      if (resData.syncError) {
        const errMsg = resData.message || `${pName} is temporarily unavailable. Try again later.`;
        setSyncFeedbackMap(prev => ({
          ...prev,
          [pCode]: {
            type: 'error',
            message: errMsg
          }
        }));
        showToast(errMsg, 'error');
      } else {
        setSyncFeedbackMap(prev => ({
          ...prev,
          [pCode]: {
            type: 'success',
            message: 'Synced successfully — Leaderboard updated!'
          }
        }));
        showToast(`${pName} synced successfully.`);
        setTimeout(() => {
          setSyncFeedbackMap(prev => ({ ...prev, [pCode]: null }));
        }, 5000);
      }
    } catch (err) {
      const isCooldown = err.response?.status === 429 || err.response?.data?.cooldown;
      const msg = err.response?.data?.error || `Failed to sync ${pName} data.`;
      setSyncFeedbackMap(prev => ({
        ...prev,
        [pCode]: {
          type: isCooldown ? 'cooldown' : 'error',
          message: msg
        }
      }));
      showToast(msg, 'error');
    } finally {
      setSyncingMap(prev => ({ ...prev, [pCode]: false }));
    }
  };

  const openDisconnectModal = (pCode) => {
    setDisconnectPlatformCode(pCode);
    setShowDisconnectModal(true);
  };

  const handleDisconnectConfirm = async () => {
    if (disconnecting || !disconnectPlatformCode) return;
    setDisconnecting(true);

    try {
      await client.delete(`/platforms/${disconnectPlatformCode}`);
      setPlatforms(prev => prev.map(p => p.code === disconnectPlatformCode ? {
        ...p,
        connectionStatus: 'not_connected',
        connection: null
      } : p));
      setShowDisconnectModal(false);
      showToast(`${disconnectPlatformCode} handle disconnected.`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to disconnect platform.';
      showToast(msg, 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content container">
        <div style={{ marginBottom: 24 }}>
          <div className="skeleton skeleton-text" style={{ width: 220, height: 32 }} />
          <div className="skeleton skeleton-text" style={{ width: 340, height: 16, marginTop: 8 }} />
        </div>
        <div className="grid-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 220 }} />
          ))}
        </div>
      </div>
    );
  }

  const cfPlatform = platforms.find(p => p.code === 'codeforces') || { code: 'codeforces', name: 'Codeforces', connection: null };
  const lcPlatform = platforms.find(p => p.code === 'leetcode') || { code: 'leetcode', name: 'LeetCode', connection: null };
  const gfgPlatform = platforms.find(p => p.code === 'geeksforgeeks') || { code: 'geeksforgeeks', name: 'GeeksforGeeks', connection: null };
  const hrPlatform = platforms.find(p => p.code === 'hackerrank') || { code: 'hackerrank', name: 'HackerRank', connection: null };

  const cfConn = cfPlatform.connection;
  const cfStatus = cfPlatform.connectionStatus || (cfConn ? cfConn.status : 'not_connected');
  const isCfConnected = Boolean(cfConn);
  const cfMetrics = cfConn?.metrics || {};

  const lcConn = lcPlatform.connection;
  const lcStatus = lcPlatform.connectionStatus || (lcConn ? lcConn.status : 'not_connected');
  const isLcConnected = Boolean(lcConn);
  const lcMetrics = lcConn?.metrics || {};

  const gfgConn = gfgPlatform.connection;
  const gfgStatus = gfgPlatform.connectionStatus || (gfgConn ? gfgConn.status : 'not_connected');
  const isGfgConnected = Boolean(gfgConn);
  const gfgMetrics = gfgConn?.metrics || {};

  const hrConn = hrPlatform.connection;
  const hrStatus = hrPlatform.connectionStatus || (hrConn ? hrConn.status : 'not_connected');
  const isHrConnected = Boolean(hrConn);
  const hrMetrics = hrConn?.metrics || {};

  return (
    <div className="page-content">
      <div className="container">

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            fontSize: 13.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="animate-fadeInUp" style={{ marginBottom: 24 }}>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Code size={28} className="text-gradient" />
            <span className="text-gradient">Platform Connections</span>
          </h1>
          <p className="section-subtitle">Connect your external competitive programming profiles to track progress across platforms</p>
        </div>

        {/* Non-Student Observer Notice Banner */}
        {isNonStudent && (
          <div className="alert alert-info animate-fadeIn" style={{ marginBottom: 20, background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)', color: 'var(--color-text)' }}>
            <Eye size={20} style={{ color: '#3B82F6', flexShrink: 0 }} />
            <div>
              <strong>Observer Mode:</strong> Platform connections are managed directly by students from their respective accounts. Faculty and Admin users have read-only visibility.
            </div>
          </div>
        )}

        {/* Missing Storage Warning */}
        {!configured && (
          <div className="alert alert-info animate-fadeIn" style={{ marginBottom: 20, background: 'rgba(234, 179, 8, 0.08)', borderColor: 'rgba(234, 179, 8, 0.25)', color: 'var(--color-text)' }}>
            <AlertTriangle size={20} style={{ color: '#EAB308', flexShrink: 0 }} />
            <div>
              <strong>Platform Storage Notice:</strong> {configMessage || 'Platform storage is not configured in database yet.'}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="card" style={{ padding: '20px', marginBottom: 20, textAlign: 'center', borderColor: '#DC2626' }}>
            <p style={{ color: '#DC2626', fontWeight: 600, margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        {/* MAIN LAYOUT CONTAINER: Left Platform Cards Grid + Right Charts Sidebar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

          {/* LEFT SECTION: 4 PLATFORM CARDS GRID */}
          <div style={{ flex: '1 1 580px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }} className="animate-fadeInUp delay-1">

            {/* 1. CODEFORCES CARD */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', position: 'relative', borderTop: '4px solid #3B82F6', borderRadius: 'var(--radius-lg)', background: 'var(--color-card)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    CF
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                      Codeforces
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>Competitive Programming</div>
                  </div>
                </div>

                <div>
                  {!isCfConnected ? (
                    <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: 10.5, fontWeight: 700 }}>
                      NOT CONNECTED
                    </span>
                  ) : (!cfConn?.ownershipVerified && !cfConn?.ownership_verified) ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> PENDING VERIFICATION
                    </span>
                  ) : cfStatus === 'sync_error' ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> SYNC ERROR
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#10B981', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> CONNECTED
                    </span>
                  )}
                </div>
              </div>

              {isCfConnected ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>@{cfConn.handle}</span>
                        <a href={`https://codeforces.com/profile/${cfConn.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', display: 'inline-flex' }}>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      {(!cfConn?.ownershipVerified && !cfConn?.ownership_verified) ? (
                        <div style={{ fontSize: 10.5, color: '#D97706', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(234, 179, 8, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          Pending verification
                        </div>
                      ) : (
                        <div style={{ fontSize: 10.5, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          <CheckCircle2 size={11} /> Verified
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div>
                        Last successful sync: {cfConn.last_synced_at || cfConn.lastSyncedAt ? new Date(cfConn.last_synced_at || cfConn.lastSyncedAt).toLocaleString() : 'Never'}
                      </div>
                      {(cfConn.last_attempted_at || cfConn.lastAttemptedAt) && (
                        (!cfConn.last_synced_at && !cfConn.lastSyncedAt) ||
                        (cfConn.last_error_code || cfConn.lastErrorCode) ||
                        (new Date(cfConn.last_attempted_at || cfConn.lastAttemptedAt).getTime() !== new Date(cfConn.last_synced_at || cfConn.lastSyncedAt || 0).getTime())
                      ) && (
                        <div style={{ color: (cfConn.last_error_code || cfConn.lastErrorCode) ? '#D97706' : 'var(--color-text-muted)' }}>
                          Last attempted: {new Date(cfConn.last_attempted_at || cfConn.lastAttemptedAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {syncFeedbackMap.codeforces && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: syncFeedbackMap.codeforces.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : syncFeedbackMap.codeforces.type === 'cooldown' || syncFeedbackMap.codeforces.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: syncFeedbackMap.codeforces.type === 'success' ? '#10B981' : syncFeedbackMap.codeforces.type === 'cooldown' || syncFeedbackMap.codeforces.type === 'error' ? '#EF4444' : '#3B82F6',
                        border: `1px solid ${syncFeedbackMap.codeforces.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : syncFeedbackMap.codeforces.type === 'cooldown' || syncFeedbackMap.codeforces.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
                      }}>
                        <RefreshCw size={12} className={syncFeedbackMap.codeforces.type === 'loading' ? 'spin' : ''} />
                        {syncFeedbackMap.codeforces.message}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16, flex: 1 }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rating</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#3B82F6', marginTop: 2 }}>{cfMetrics.rating ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Max Rating</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{cfMetrics.maxRating ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rank</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', marginTop: 3, textTransform: 'capitalize' }}>{cfMetrics.rank || '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#10B981', textTransform: 'uppercase', fontWeight: 700 }}>Easy</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981', marginTop: 2 }}>{cfMetrics.easySolved ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#F59E0B', textTransform: 'uppercase', fontWeight: 700 }}>Med</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B', marginTop: 2 }}>{cfMetrics.mediumSolved ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#EF4444', textTransform: 'uppercase', fontWeight: 700 }}>Hard</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{cfMetrics.hardSolved ?? '—'}</div>
                    </div>
                  </div>

                  {!isNonStudent && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleSync('codeforces')}
                        disabled={syncingMap.codeforces}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <RefreshCw size={13} className={syncingMap.codeforces ? 'spin' : ''} />
                        {syncingMap.codeforces ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => openDisconnectModal('codeforces')}
                        style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}
                      >
                        <Unlink size={13} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                    Connect your Codeforces handle to fetch your competitive rating, max rank, and problem metrics.
                  </p>
                  <div>
                    {!isNonStudent ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openConnectModal('codeforces')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Code size={15} /> Connect Codeforces
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Not connected by student yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. LEETCODE CARD */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', position: 'relative', borderTop: '4px solid #FFA116', borderRadius: 'var(--radius-lg)', background: 'var(--color-card)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(255, 161, 22, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(255, 161, 22, 0.25)' }}>
                    ⚡
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                      LeetCode
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>DSA & Problem Solving</div>
                  </div>
                </div>

                <div>
                  {!isLcConnected ? (
                    <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: 10.5, fontWeight: 700 }}>
                      NOT CONNECTED
                    </span>
                  ) : (!lcConn?.ownershipVerified && !lcConn?.ownership_verified) ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> PENDING VERIFICATION
                    </span>
                  ) : lcStatus === 'sync_error' ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> SYNC ERROR
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#10B981', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> CONNECTED
                    </span>
                  )}
                </div>
              </div>

              {isLcConnected ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>@{lcConn.handle}</span>
                        <a href={`https://leetcode.com/u/${lcConn.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA116', display: 'inline-flex' }}>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      {(!lcConn?.ownershipVerified && !lcConn?.ownership_verified) ? (
                        <div style={{ fontSize: 10.5, color: '#D97706', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(234, 179, 8, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          Pending verification
                        </div>
                      ) : (
                        <div style={{ fontSize: 10.5, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          <CheckCircle2 size={11} /> Verified
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div>
                        Last successful sync: {lcConn.last_synced_at || lcConn.lastSyncedAt ? new Date(lcConn.last_synced_at || lcConn.lastSyncedAt).toLocaleString() : 'Never'}
                      </div>
                      {(lcConn.last_attempted_at || lcConn.lastAttemptedAt) && (
                        (!lcConn.last_synced_at && !lcConn.lastSyncedAt) ||
                        (lcConn.last_error_code || lcConn.lastErrorCode) ||
                        (new Date(lcConn.last_attempted_at || lcConn.lastAttemptedAt).getTime() !== new Date(lcConn.last_synced_at || lcConn.lastSyncedAt || 0).getTime())
                      ) && (
                        <div style={{ color: (lcConn.last_error_code || lcConn.lastErrorCode) ? '#D97706' : 'var(--color-text-muted)' }}>
                          Last attempted: {new Date(lcConn.last_attempted_at || lcConn.lastAttemptedAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {syncFeedbackMap.leetcode && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: syncFeedbackMap.leetcode.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : syncFeedbackMap.leetcode.type === 'cooldown' || syncFeedbackMap.leetcode.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: syncFeedbackMap.leetcode.type === 'success' ? '#10B981' : syncFeedbackMap.leetcode.type === 'cooldown' || syncFeedbackMap.leetcode.type === 'error' ? '#EF4444' : '#3B82F6',
                        border: `1px solid ${syncFeedbackMap.leetcode.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : syncFeedbackMap.leetcode.type === 'cooldown' || syncFeedbackMap.leetcode.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
                      }}>
                        <RefreshCw size={12} className={syncFeedbackMap.leetcode.type === 'loading' ? 'spin' : ''} />
                        {syncFeedbackMap.leetcode.message}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16, flex: 1 }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#10B981', textTransform: 'uppercase', fontWeight: 700 }}>Easy</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981', marginTop: 2 }}>{lcMetrics.easySolved ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#F59E0B', textTransform: 'uppercase', fontWeight: 700 }}>Medium</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B', marginTop: 2 }}>{lcMetrics.mediumSolved ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#EF4444', textTransform: 'uppercase', fontWeight: 700 }}>Hard</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{lcMetrics.hardSolved ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 4px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{lcMetrics.totalSolved ?? '—'}</div>
                    </div>
                  </div>

                  {!isNonStudent && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleSync('leetcode')}
                        disabled={syncingMap.leetcode}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <RefreshCw size={13} className={syncingMap.leetcode ? 'spin' : ''} />
                        {syncingMap.leetcode ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => openDisconnectModal('leetcode')}
                        style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}
                      >
                        <Unlink size={13} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                    Connect your LeetCode profile to track solved problem difficulties (Easy, Medium, Hard).
                  </p>
                  <div>
                    {!isNonStudent ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openConnectModal('leetcode')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFA116', borderColor: '#FFA116' }}
                      >
                        <Code size={15} /> Connect LeetCode
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Not connected by student yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. GEEKSFORGEEKS CARD */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', position: 'relative', borderTop: '4px solid #2F8D46', borderRadius: 'var(--radius-lg)', background: 'var(--color-card)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(47, 141, 70, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(47, 141, 70, 0.25)' }}>
                    🌿
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                      GeeksforGeeks
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>DSA & Articles</div>
                  </div>
                </div>

                <div>
                  {!isGfgConnected ? (
                    <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: 10.5, fontWeight: 700 }}>
                      NOT CONNECTED
                    </span>
                  ) : (!gfgConn?.ownershipVerified && !gfgConn?.ownership_verified) ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> PENDING VERIFICATION
                    </span>
                  ) : gfgStatus === 'sync_error' ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> SYNC ERROR
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#10B981', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> CONNECTED
                    </span>
                  )}
                </div>
              </div>

              {isGfgConnected ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>@{gfgConn.handle}</span>
                        <a href={`https://www.geeksforgeeks.org/user/${gfgConn.handle}/`} target="_blank" rel="noopener noreferrer" style={{ color: '#2F8D46', display: 'inline-flex' }}>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      {(!gfgConn?.ownershipVerified && !gfgConn?.ownership_verified) ? (
                        <div style={{ fontSize: 10.5, color: '#D97706', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(234, 179, 8, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          Pending verification
                        </div>
                      ) : (
                        <div style={{ fontSize: 10.5, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          <CheckCircle2 size={11} /> Verified
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div>
                        Last successful sync: {gfgConn.last_synced_at || gfgConn.lastSyncedAt ? new Date(gfgConn.last_synced_at || gfgConn.lastSyncedAt).toLocaleString() : 'Never'}
                      </div>
                      {(gfgConn.last_attempted_at || gfgConn.lastAttemptedAt) && (
                        (!gfgConn.last_synced_at && !gfgConn.lastSyncedAt) ||
                        (gfgConn.last_error_code || gfgConn.lastErrorCode) ||
                        (new Date(gfgConn.last_attempted_at || gfgConn.lastAttemptedAt).getTime() !== new Date(gfgConn.last_synced_at || gfgConn.lastSyncedAt || 0).getTime())
                      ) && (
                        <div style={{ color: (gfgConn.last_error_code || gfgConn.lastErrorCode) ? '#D97706' : 'var(--color-text-muted)' }}>
                          Last attempted: {new Date(gfgConn.last_attempted_at || gfgConn.lastAttemptedAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {syncFeedbackMap.geeksforgeeks && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: syncFeedbackMap.geeksforgeeks.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : syncFeedbackMap.geeksforgeeks.type === 'cooldown' || syncFeedbackMap.geeksforgeeks.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: syncFeedbackMap.geeksforgeeks.type === 'success' ? '#10B981' : syncFeedbackMap.geeksforgeeks.type === 'cooldown' || syncFeedbackMap.geeksforgeeks.type === 'error' ? '#EF4444' : '#3B82F6',
                        border: `1px solid ${syncFeedbackMap.geeksforgeeks.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : syncFeedbackMap.geeksforgeeks.type === 'cooldown' || syncFeedbackMap.geeksforgeeks.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
                      }}>
                        <RefreshCw size={12} className={syncFeedbackMap.geeksforgeeks.type === 'loading' ? 'spin' : ''} />
                        {syncFeedbackMap.geeksforgeeks.message}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 16, flex: 1 }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#2F8D46', textTransform: 'uppercase', fontWeight: 700 }}>Coding Score</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2F8D46', marginTop: 2 }}>{gfgMetrics.score ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Solved</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{gfgMetrics.totalSolved ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Institute Rank</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{gfgMetrics.instituteRank || '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Longest Streak</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{gfgMetrics.streak ? `${gfgMetrics.streak} days` : '—'}</div>
                    </div>
                  </div>

                  {!isNonStudent && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleSync('geeksforgeeks')}
                        disabled={syncingMap.geeksforgeeks}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <RefreshCw size={13} className={syncingMap.geeksforgeeks ? 'spin' : ''} />
                        {syncingMap.geeksforgeeks ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => openDisconnectModal('geeksforgeeks')}
                        style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}
                      >
                        <Unlink size={13} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                    Connect your GeeksforGeeks handle to track coding score, total solved problems, and institute rank.
                  </p>
                  <div>
                    {!isNonStudent ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openConnectModal('geeksforgeeks')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2F8D46', borderColor: '#2F8D46' }}
                      >
                        <Code size={15} /> Connect GeeksforGeeks
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Not connected by student yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. HACKERRANK CARD */}
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', position: 'relative', borderTop: '4px solid #2EC866', borderRadius: 'var(--radius-lg)', background: 'var(--color-card)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(46, 200, 102, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(46, 200, 102, 0.25)' }}>
                    🏆
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                      HackerRank
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>Badges & Domain Scores</div>
                  </div>
                </div>

                <div>
                  {!isHrConnected ? (
                    <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: 10.5, fontWeight: 700 }}>
                      NOT CONNECTED
                    </span>
                  ) : (!hrConn?.ownershipVerified && !hrConn?.ownership_verified) ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> PENDING VERIFICATION
                    </span>
                  ) : hrStatus === 'sync_error' ? (
                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> SYNC ERROR
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#10B981', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> CONNECTED
                    </span>
                  )}
                </div>
              </div>

              {isHrConnected ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>@{hrConn.handle}</span>
                        <a href={`https://www.hackerrank.com/profile/${hrConn.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2EC866', display: 'inline-flex' }}>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      {(!hrConn?.ownershipVerified && !hrConn?.ownership_verified) ? (
                        <div style={{ fontSize: 10.5, color: '#D97706', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(234, 179, 8, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          Pending verification
                        </div>
                      ) : (
                        <div style={{ fontSize: 10.5, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                          <CheckCircle2 size={11} /> Verified
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div>
                        Last successful sync: {hrConn.last_synced_at || hrConn.lastSyncedAt ? new Date(hrConn.last_synced_at || hrConn.lastSyncedAt).toLocaleString() : 'Never'}
                      </div>
                      {(hrConn.last_attempted_at || hrConn.lastAttemptedAt) && (
                        (!hrConn.last_synced_at && !hrConn.lastSyncedAt) ||
                        (hrConn.last_error_code || hrConn.lastErrorCode) ||
                        (new Date(hrConn.last_attempted_at || hrConn.lastAttemptedAt).getTime() !== new Date(hrConn.last_synced_at || hrConn.lastSyncedAt || 0).getTime())
                      ) && (
                        <div style={{ color: (hrConn.last_error_code || hrConn.lastErrorCode) ? '#D97706' : 'var(--color-text-muted)' }}>
                          Last attempted: {new Date(hrConn.last_attempted_at || hrConn.lastAttemptedAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {syncFeedbackMap.hackerrank && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: syncFeedbackMap.hackerrank.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : syncFeedbackMap.hackerrank.type === 'cooldown' || syncFeedbackMap.hackerrank.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: syncFeedbackMap.hackerrank.type === 'success' ? '#10B981' : syncFeedbackMap.hackerrank.type === 'cooldown' || syncFeedbackMap.hackerrank.type === 'error' ? '#EF4444' : '#3B82F6',
                        border: `1px solid ${syncFeedbackMap.hackerrank.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : syncFeedbackMap.hackerrank.type === 'cooldown' || syncFeedbackMap.hackerrank.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
                      }}>
                        <RefreshCw size={12} className={syncFeedbackMap.hackerrank.type === 'loading' ? 'spin' : ''} />
                        {syncFeedbackMap.hackerrank.message}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16, flex: 1 }}>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: '#2EC866', textTransform: 'uppercase', fontWeight: 700 }}>Level</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2EC866', marginTop: 2 }}>{hrMetrics.level ?? '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Badges</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{hrMetrics.badgesCount ?? (hrMetrics.badges?.length || 0)}</div>
                    </div>
                    <div style={{ background: 'var(--bg-hover)', padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Member Since</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{hrMetrics.createdYear || '—'}</div>
                    </div>
                  </div>

                  {!isNonStudent && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleSync('hackerrank')}
                        disabled={syncingMap.hackerrank}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                      >
                        <RefreshCw size={13} className={syncingMap.hackerrank ? 'spin' : ''} />
                        {syncingMap.hackerrank ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => openDisconnectModal('hackerrank')}
                        style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}
                      >
                        <Unlink size={13} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                    Connect your HackerRank profile to track badges, domain scores, and skill certifications.
                  </p>
                  <div>
                    {!isNonStudent ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openConnectModal('hackerrank')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2EC866', borderColor: '#2EC866' }}
                      >
                        <Code size={15} /> Connect HackerRank
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Not connected by student yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SECTION: 2 VISUAL CHARTS (SCORE CONTRIBUTION + BAR CHART SIDEBAR) */}
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 300 }} className="animate-fadeInUp delay-2">
            <ScoreContributionChart platforms={platforms} />
            <DifficultyBarChart platforms={platforms} />
          </div>

        </div>

      </div>

      {/* CONNECT ACCOUNT MODAL */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowConnectModal(false)}>
          <div className="modal card" style={{ maxWidth: 460, padding: 24 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code size={20} style={{
                  color: connectPlatformCode === 'codeforces' ? '#3B82F6' : connectPlatformCode === 'leetcode' ? '#FFA116' : connectPlatformCode === 'geeksforgeeks' ? '#2F8D46' : '#2EC866'
                }} />
                Connect {
                  connectPlatformCode === 'codeforces' ? 'Codeforces' :
                  connectPlatformCode === 'leetcode' ? 'LeetCode' :
                  connectPlatformCode === 'geeksforgeeks' ? 'GeeksforGeeks' : 'HackerRank'
                } Account
              </h2>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowConnectModal(false)}>✕</button>
            </div>

            {connectError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                {connectError}
              </div>
            )}

            <form onSubmit={handleConnectSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  {
                    connectPlatformCode === 'codeforces' ? 'Codeforces Handle *' :
                    connectPlatformCode === 'leetcode' ? 'LeetCode Username / URL *' :
                    connectPlatformCode === 'geeksforgeeks' ? 'GeeksforGeeks Handle / Profile URL *' :
                    'HackerRank Username / Profile URL *'
                  }
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={
                    connectPlatformCode === 'codeforces' ? 'e.g. tourist or https://codeforces.com/profile/tourist' :
                    connectPlatformCode === 'leetcode' ? 'e.g. username or https://leetcode.com/u/username/' :
                    connectPlatformCode === 'geeksforgeeks' ? 'e.g. username or https://www.geeksforgeeks.org/user/username/' :
                    'e.g. username or https://www.hackerrank.com/profile/username'
                  }
                  value={connectHandle}
                  onChange={e => setConnectHandle(e.target.value)}
                  disabled={connecting}
                  autoFocus
                  required
                />
                <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 6, display: 'block' }}>
                  {
                    connectPlatformCode === 'codeforces' ? 'Enter your Codeforces username or profile URL.' :
                    connectPlatformCode === 'leetcode' ? 'Enter your LeetCode username or profile URL.' :
                    connectPlatformCode === 'geeksforgeeks' ? 'Enter your GeeksforGeeks handle or profile URL.' :
                    'Enter your HackerRank username or profile URL.'
                  }
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConnectModal(false)} disabled={connecting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={connecting || !connectHandle.trim()}
                  style={{
                    background: connectPlatformCode === 'leetcode' ? '#FFA116' : connectPlatformCode === 'geeksforgeeks' ? '#2F8D46' : connectPlatformCode === 'hackerrank' ? '#2EC866' : undefined,
                    borderColor: connectPlatformCode === 'leetcode' ? '#FFA116' : connectPlatformCode === 'geeksforgeeks' ? '#2F8D46' : connectPlatformCode === 'hackerrank' ? '#2EC866' : undefined
                  }}
                >
                  {connecting ? 'Validating & Connecting...' : 'Connect Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && (
        <ConfirmModal
          isOpen={showDisconnectModal}
          title={`Disconnect ${
            disconnectPlatformCode === 'codeforces' ? 'Codeforces' :
            disconnectPlatformCode === 'leetcode' ? 'LeetCode' :
            disconnectPlatformCode === 'geeksforgeeks' ? 'GeeksforGeeks' : 'HackerRank'
          }`}
          message={`Are you sure you want to disconnect your ${disconnectPlatformCode} account? Your metrics will no longer be stored.`}
          confirmText={disconnecting ? 'Disconnecting...' : 'Disconnect'}
          cancelText="Cancel"
          onConfirm={handleDisconnectConfirm}
          onCancel={() => setShowDisconnectModal(false)}
          isDanger
        />
      )}

    </div>
  );
}
