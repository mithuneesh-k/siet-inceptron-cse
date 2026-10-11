import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function MandatoryPasswordChangeModal() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If user doesn't have must_change_password flag, do not render
  if (!user || !user.must_change_password) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current temporary password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current temporary password.');
      return;
    }

    setLoading(true);
    try {
      // Try dedicated change-password endpoint, fallback to user endpoint
      try {
        await client.post('/auth/change-password', {
          currentPassword,
          newPassword,
          confirmPassword
        });
      } catch (authErr) {
        if (authErr.response?.status === 404 && user.id) {
          await client.post(`/users/${user.id}/change-password`, {
            currentPassword,
            newPassword
          });
        } else {
          throw authErr;
        }
      }

      setSuccess(true);
      // Update local storage and auth context state
      const updatedUser = { ...user, must_change_password: false };
      try {
        localStorage.setItem('SIET_user', JSON.stringify(updatedUser));
      } catch (storageErr) {
        console.error(storageErr);
      }

      setTimeout(() => {
        if (refreshUser) {
          refreshUser();
        }
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Password change failed:', err);
      setError(err.response?.data?.error || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 15, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="card animate-fadeInUp"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-card, #121c16)',
          border: '1px solid var(--accent, #10b981)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: '28px',
          color: 'var(--text, #e2e8f0)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 12px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent, #10b981)'
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>
            Action Required: Set New Password
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
            Welcome, <strong>{user.name || user.email}</strong>. For security reasons, you must change your initial temporary password before accessing the CSE Portal.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 14px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={18} /> Password updated successfully! Unlocking portal...
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Current Password (DOB / Temporary)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="input"
                style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              New Password (Min. 8 characters)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a strong new password"
                className="input"
                style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              disabled={loading || success}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              marginTop: '8px',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 600,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading || success}
          >
            {loading ? (
              'Saving New Password...'
            ) : success ? (
              <>
                <CheckCircle2 size={18} /> Password Updated
              </>
            ) : (
              <>
                <KeyRound size={18} /> Update Password & Continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
