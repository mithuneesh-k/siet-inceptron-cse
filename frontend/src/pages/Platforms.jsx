import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Link as LinkIcon, Trash2, ExternalLink } from 'lucide-react';

export default function Platforms() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [configMessage, setConfigMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null); // { type: 'connect'|'verify', platform: obj }
  const [usernameInput, setUsernameInput] = useState('');
  const [verificationData, setVerificationData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const res = await client.get('/platforms');
      setConfigured(res.data.configured !== false);
      setConfigMessage(res.data.message || '');
      setPlatforms(res.data.platforms || []);
    } catch (err) {
      console.error('Failed to fetch platforms:', err);
      setMessage({ text: err.response?.data?.error || 'Failed to load platforms', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !activeModal?.platform) return;
    try {
      setActionLoading(true);
      const res = await client.post('/platforms/connect', {
        platformCode: activeModal.platform.platform_code,
        username: usernameInput.trim()
      });
      setMessage({ text: res.data.message, type: 'success' });
      setActiveModal(null);
      setUsernameInput('');
      fetchPlatforms();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to connect handle', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateVerification = async (p) => {
    try {
      setActionLoading(true);
      const res = await client.post('/platforms/verify/initiate', { platformCode: p.platform_code });
      setVerificationData(res.data.verification);
      setActiveModal({ type: 'verify', platform: p });
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to initiate verification', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!activeModal?.platform) return;
    try {
      setActionLoading(true);
      const res = await client.post('/platforms/verify/confirm', { platformCode: activeModal.platform.platform_code });
      setMessage({ text: res.data.message, type: 'success' });
      setActiveModal(null);
      setVerificationData(null);
      fetchPlatforms();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Verification token check failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSync = async (p) => {
    try {
      setActionLoading(true);
      const res = await client.post('/platforms/sync', { platformCode: p.platform_code });
      setMessage({ text: res.data.message, type: 'success' });
      fetchPlatforms();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Sync failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (p) => {
    if (!window.confirm(`Are you sure you want to disconnect ${p.platform_name}?`)) return;
    try {
      setActionLoading(true);
      await client.delete(`/platforms/${p.platform_code}`);
      setMessage({ text: `Disconnected ${p.platform_name}`, type: 'success' });
      fetchPlatforms();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Disconnect failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="platforms-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={28} /> Competitive Profile Platforms
        </h1>
        <p style={{ color: '#9CA3AF', margin: '4px 0 0' }}>
          Connect and verify your external competitive coding and open-source handles to build your official SSIET Competitive Index.
        </p>
      </div>

      {!configured && (
        <div style={{
          backgroundColor: '#374151', color: '#FBBF24', padding: '16px',
          borderRadius: '8px', marginBottom: '24px', border: '1px solid #F59E0B'
        }}>
          ⚠️ <strong>Storage Status</strong>: {configMessage || 'Competitive platform database tables are not configured yet on Supabase.'}
        </div>
      )}

      {message.text && (
        <div style={{
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          color: message.type === 'error' ? '#F87171' : '#34D399',
          padding: '12px 16px', borderRadius: '6px', marginBottom: '20px',
          border: `1px solid ${message.type === 'error' ? '#EF4444' : '#10B981'}`
        }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading platform integrations...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {platforms.map(p => {
            const isVerified = p.ownership_status === 'VERIFIED';
            const isLinked = p.connected;
            const isPending = p.live_support === false;

            return (
              <div key={p.platform_code} style={{
                backgroundColor: '#1F2937', borderRadius: '10px', padding: '20px',
                border: isVerified ? '1px solid #059669' : '1px solid #374151',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#F9FAFB', textTransform: 'capitalize' }}>{p.platform_name}</h3>
                    <span style={{
                      fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                      backgroundColor: isVerified ? '#065F46' : isLinked ? '#92400E' : '#374151',
                      color: isVerified ? '#34D399' : isLinked ? '#FBBF24' : '#9CA3AF'
                    }}>
                      {isVerified ? 'VERIFIED' : isLinked ? 'UNVERIFIED' : isPending ? 'PENDING' : 'UNLINKED'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: '0 0 12px' }}>
                    Category: <strong style={{ color: '#E5E7EB', textTransform: 'capitalize' }}>{p.category.replace('_', ' ')}</strong>
                  </p>

                  {/* Status Helper Text */}
                  <div style={{ fontSize: '0.8rem', padding: '8px', borderRadius: '6px', backgroundColor: '#111827', marginBottom: '16px' }}>
                    {isVerified ? (
                      <span style={{ color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Eligible for leaderboard scoring ({p.platform_score} pts)
                      </span>
                    ) : isLinked ? (
                      <span style={{ color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={14} /> Handle linked: @{p.username}. Does not contribute to leaderboard until ownership is verified.
                      </span>
                    ) : isPending ? (
                      <span style={{ color: '#9CA3AF' }}>Integration pending. No competitive points awarded.</span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>Not connected. Connect handle to start.</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!isLinked && !isPending && (
                    <button onClick={() => { setActiveModal({ type: 'connect', platform: p }); setUsernameInput(''); }} style={{
                      flex: 1, backgroundColor: '#059669', color: '#FFF', border: 'none',
                      padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                      <LinkIcon size={14} /> Connect
                    </button>
                  )}

                  {isLinked && !isVerified && (
                    <button onClick={() => handleInitiateVerification(p)} disabled={actionLoading} style={{
                      flex: 1, backgroundColor: '#D97706', color: '#FFF', border: 'none',
                      padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                      <Shield size={14} /> Verify Ownership
                    </button>
                  )}

                  {isLinked && (
                    <>
                      <button onClick={() => handleSync(p)} disabled={actionLoading} title="Sync metrics" style={{
                        backgroundColor: '#374151', color: '#E5E7EB', border: 'none',
                        padding: '8px', borderRadius: '6px', cursor: 'pointer'
                      }}>
                        <RefreshCw size={14} />
                      </button>
                      <button onClick={() => handleDisconnect(p)} disabled={actionLoading} title="Disconnect platform" style={{
                        backgroundColor: '#7F1D1D', color: '#FCA5A5', border: 'none',
                        padding: '8px', borderRadius: '6px', cursor: 'pointer'
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      {activeModal?.type === 'connect' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ backgroundColor: '#111827', color: '#FFF', padding: '24px', borderRadius: '10px', maxWidth: '400px', width: '100%', border: '1px solid #374151' }}>
            <h3 style={{ margin: '0 0 12px', color: '#10B981' }}>Connect {activeModal.platform.platform_name} Handle</h3>
            <form onSubmit={handleConnect}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '6px' }}>
                  {activeModal.platform.platform_name} Username / Handle:
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. octocat"
                  required
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1F2937', color: '#FFF', border: '1px solid #4B5563', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '8px 16px', backgroundColor: '#374151', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  {actionLoading ? 'Connecting...' : 'Connect Handle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Challenge Modal */}
      {activeModal?.type === 'verify' && verificationData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ backgroundColor: '#111827', color: '#FFF', padding: '24px', borderRadius: '10px', maxWidth: '480px', width: '100%', border: '1px solid #D97706' }}>
            <h3 style={{ margin: '0 0 12px', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={20} /> Verify {activeModal.platform.platform_name} Ownership
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#D1D5DB' }}>
              {verificationData.instruction}
            </p>

            <div style={{ backgroundColor: '#1F2937', padding: '12px', borderRadius: '6px', margin: '16px 0', border: '1px border #4B5563', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', display: 'block' }}>Challenge Token (Expires in 30m):</span>
              <code style={{ fontSize: '1.2rem', color: '#34D399', fontWeight: 'bold', letterSpacing: '1px' }}>
                {verificationData.verificationToken}
              </code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '8px 16px', backgroundColor: '#374151', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleConfirmVerification} disabled={actionLoading} style={{ padding: '8px 16px', backgroundColor: '#D97706', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                {actionLoading ? 'Checking Profile...' : 'I Have Updated Profile, Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
