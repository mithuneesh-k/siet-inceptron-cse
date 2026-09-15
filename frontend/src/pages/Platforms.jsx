import { useState, useEffect } from 'react';
import client from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import { 
  Code, RefreshCw, Unlink, ShieldAlert, Award, 
  BarChart2, CheckCircle2, AlertTriangle, Lock, ExternalLink 
} from 'lucide-react';

export default function Platforms() {
  const [platforms, setPlatforms] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [configMessage, setConfigMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modals & Card states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectHandle, setConnectHandle] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncingCodeforces, setSyncingCodeforces] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState(null);

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
      setPlatforms(data.platforms || []);
    } catch (err) {
      console.error('Failed to fetch platforms state:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to load platforms data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformsState();
  }, []);

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!connectHandle.trim() || connecting) return;

    setConnecting(true);
    try {
      const res = await client.post('/api/platforms/connect', {
        platformCode: 'codeforces',
        handle: connectHandle.trim()
      });

      const resData = res.data || {};
      if (resData.connection) {
        setPlatforms(prev => prev.map(p => p.code === 'codeforces' ? {
          ...p,
          connectionStatus: resData.connection.status || 'connected',
          connection: resData.connection
        } : p));
        setShowConnectModal(false);
        setConnectHandle('');
        showToast(`Successfully connected Codeforces handle @${resData.connection.handle}! 🎉`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to connect Codeforces handle.';
      showToast(msg, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (syncingCodeforces) return;
    setSyncingCodeforces(true);

    try {
      const res = await client.post('/api/platforms/sync', { platformCode: 'codeforces' });
      const resData = res.data || {};

      if (resData.connection) {
        setPlatforms(prev => prev.map(p => p.code === 'codeforces' ? {
          ...p,
          connectionStatus: resData.connection.status || 'connected',
          connection: resData.connection
        } : p));

        if (resData.syncError) {
          showToast(resData.message || 'Last sync failed. Previous metrics preserved.', 'error');
        } else {
          showToast('Codeforces metrics synced successfully!');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to sync Codeforces data.';
      showToast(msg, 'error');
    } finally {
      setSyncingCodeforces(false);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (disconnecting) return;
    setDisconnecting(true);

    try {
      await client.delete('/api/platforms/codeforces');
      setPlatforms(prev => prev.map(p => p.code === 'codeforces' ? {
        ...p,
        connectionStatus: 'not_connected',
        connection: null
      } : p));
      setShowDisconnectModal(false);
      showToast('Codeforces handle disconnected.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to disconnect Codeforces.';
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

  const cfPlatform = platforms.find(p => p.code === 'codeforces') || {
    code: 'codeforces',
    name: 'Codeforces',
    status: 'active',
    connectionStatus: 'not_connected',
    connection: null
  };

  const otherPlatforms = [
    { code: 'leetcode', name: 'LeetCode', icon: '⚡', color: '#FFA116' },
    { code: 'geeksforgeeks', name: 'GeeksforGeeks', icon: '🌿', color: '#2F8D46' },
    { code: 'hackerrank', name: 'HackerRank', icon: '🏆', color: '#2EC866' }
  ];

  const cfConn = cfPlatform.connection;
  const cfStatus = cfPlatform.connectionStatus || (cfConn ? cfConn.status : 'not_connected');
  const isConnected = cfStatus === 'connected' || cfStatus === 'sync_error';
  const cfMetrics = cfConn?.metrics || {};

  return (
    <div className="page-content">
      <div className="container">
        
        {/* Header */}
        <div className="animate-fadeInUp" style={{ marginBottom: 28 }}>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Code size={28} className="text-gradient" />
            <span className="text-gradient">Platform Connections</span>
          </h1>
          <p className="section-subtitle">Connect your external competitive programming profiles to track progress across platforms</p>
        </div>

        {/* Missing Storage Warning (if migration not executed yet) */}
        {!configured && (
          <div className="alert alert-info animate-fadeIn" style={{ marginBottom: 24, background: 'rgba(234, 179, 8, 0.08)', borderColor: 'rgba(234, 179, 8, 0.25)', color: 'var(--color-text)' }}>
            <AlertTriangle size={20} style={{ color: '#EAB308', flexShrink: 0 }} />
            <div>
              <strong>Platform Storage Notice:</strong> {configMessage || 'Platform storage is not configured in database yet.'}
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>You can view platform integrations below. Connecting will be active once database storage migration is executed.</div>
            </div>
          </div>
        )}

        {/* Global Error Banner if API error */}
        {errorMsg && (
          <div className="card" style={{ padding: '20px', marginBottom: 24, textAlign: 'center', borderColor: '#DC2626' }}>
            <p style={{ color: '#DC2626', fontWeight: 600, margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        {/* Grid of Platforms */}
        <div className="grid-auto animate-fadeInUp delay-1">
          
          {/* 1. CODEFORCES CARD */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', borderTop: '4px solid #3B82F6' }}>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>
                  CF
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Codeforces
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Competitive Programming</div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {!isConnected ? (
                  <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: 11 }}>
                    NOT CONNECTED
                  </span>
                ) : cfStatus === 'sync_error' ? (
                  <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={12} /> SYNC ERROR
                  </span>
                ) : (
                  <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--color-green)', border: '1px solid rgba(34, 197, 94, 0.25)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> CONNECTED
                  </span>
                )}
              </div>
            </div>

            {/* Connected Content vs Unconnected State */}
            {isConnected ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                
                {/* Handle & Ownership Strip */}
                <div style={{ background: 'var(--bg-hover)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>@{cfConn.handle}</span>
                      <a href={`https://codeforces.com/profile/${cfConn.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', display: 'inline-flex' }}>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '3px 8px', borderRadius: 12, border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={12} style={{ color: '#EAB308' }} /> Ownership not verified
                    </div>
                  </div>

                  {cfStatus === 'sync_error' && (
                    <div style={{ fontSize: 11.5, color: '#D97706', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={13} /> Last sync failed. Previous metrics preserved.
                    </div>
                  )}
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20, flex: 1 }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Current Rating</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#3B82F6', marginTop: 2 }}>{cfMetrics.rating !== undefined && cfMetrics.rating !== null ? cfMetrics.rating : '—'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Max Rating</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{cfMetrics.maxRating !== undefined && cfMetrics.maxRating !== null ? cfMetrics.maxRating : '—'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Rank</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 4, textTransform: 'capitalize' }}>{cfMetrics.rank || '—'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Max Rank</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 4, textTransform: 'capitalize' }}>{cfMetrics.maxRank || '—'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Solved Problems</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-green)', marginTop: 2 }}>{cfMetrics.solvedProblems !== undefined && cfMetrics.solvedProblems !== null ? cfMetrics.solvedProblems : '—'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Contests</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{cfMetrics.contestCount !== undefined && cfMetrics.contestCount !== null ? cfMetrics.contestCount : '—'}</div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleSync} 
                    disabled={syncingCodeforces}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                  >
                    <RefreshCw size={14} className={syncingCodeforces ? 'spin' : ''} />
                    {syncingCodeforces ? 'Syncing...' : 'Sync'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setShowDisconnectModal(true)}
                    style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}
                  >
                    <Unlink size={14} /> Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                  Connect your Codeforces handle to fetch your competitive programming rating, max rank, and problem solving metrics.
                </p>
                <div>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setShowConnectModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Code size={16} /> Connect Codeforces
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. COMING SOON PLATFORMS (LeetCode, GFG, HackerRank) */}
          {otherPlatforms.map(p => (
            <div key={p.code} className="card" style={{ padding: '24px', opacity: 0.75, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${p.color}15`, display: 'flex', alignItems: 'center', justify: 'center', fontSize: 22 }}>
                      {p.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{p.name}</h3>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Platform Integration</div>
                    </div>
                  </div>
                  <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={12} /> COMING SOON
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  {p.name} integration is scheduled for upcoming phases. No metric tracking available yet.
                </p>
              </div>

              <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-border)', marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  Coming Soon
                </button>
              </div>
            </div>
          ))}

        </div>

      </div>

      {/* CONNECT CODEFORCES MODAL */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowConnectModal(false)}>
          <div className="modal card" style={{ maxWidth: 440, padding: 24 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code size={20} style={{ color: '#3B82F6' }} /> Connect Codeforces Account
              </h2>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowConnectModal(false)}>✕</button>
            </div>

            <form onSubmit={handleConnectSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Codeforces Handle *
                </label>
                <input 
                  className="form-input"
                  type="text"
                  placeholder="e.g. tourist or https://codeforces.com/profile/tourist"
                  value={connectHandle}
                  onChange={e => setConnectHandle(e.target.value)}
                  disabled={connecting}
                  autoFocus
                  required
                />
                <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 6, display: 'block' }}>
                  Enter your Codeforces username or profile URL. Handle will be validated with Codeforces API before connecting.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConnectModal(false)} disabled={connecting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={connecting || !connectHandle.trim()}>
                  {connecting ? 'Validating & Connecting...' : 'Connect Handle'}
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
          title="Disconnect Codeforces?"
          message="Disconnecting Codeforces will remove the profile connection from your platforms page. Your achievements, profile points, and team memberships will remain untouched."
          confirmText={disconnecting ? 'Disconnecting...' : 'Disconnect'}
          confirmVariant="danger"
          onConfirm={handleDisconnectConfirm}
          onCancel={() => setShowDisconnectModal(false)}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
