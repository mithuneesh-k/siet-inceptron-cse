import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { Lock, KeyRound, ShieldCheck, CheckCircle2, Eye, EyeOff, ArrowRight, LoaderCircle } from 'lucide-react';
import './MandatoryPasswordChangeModal.css';

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

  const meetsLength = newPassword.length >= 8;
  const isDifferent = Boolean(newPassword) && newPassword !== currentPassword;
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;

  return (
    <div className="password-change-overlay">
      <section
        className="password-change-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-change-title"
        aria-describedby="password-change-description"
      >
        <header className="password-change-header">
          <div className="password-change-badge"><ShieldCheck size={24} strokeWidth={1.8} /></div>
          <span className="password-change-eyebrow">SECURE YOUR ACCOUNT</span>
          <h2 id="password-change-title">A fresh password.<br />A safer start.</h2>
          <p id="password-change-description">
            Hi, <strong>{user.name || user.email}</strong>. Choose a personal password to continue to Inceptron.
          </p>
        </header>

        {error && <div className="password-change-notice is-error" role="alert">{error}</div>}
        {success && (
          <div className="password-change-notice is-success" role="status">
            <CheckCircle2 size={18} /> Password saved. Opening your portal…
          </div>
        )}

        <form className="password-change-form" onSubmit={handleSubmit} aria-busy={loading}>
          <div className="password-change-field">
            <label htmlFor="password-current">Current password</label>
            <div className="password-change-input-wrap">
              <Lock size={17} className="password-change-input-icon" aria-hidden="true" />
              <input
                id="password-current"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your temporary password"
                disabled={loading || success}
              />
              <button className="password-change-reveal" type="button"
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                aria-pressed={showCurrent}
                disabled={loading || success}
                onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="password-change-hint">For imported accounts, use your registration number.</p>
          </div>

          <div className="password-change-field">
            <label htmlFor="password-new">New password</label>
            <div className="password-change-input-wrap">
              <KeyRound size={17} className="password-change-input-icon" aria-hidden="true" />
              <input
                id="password-new"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                required minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a personal password"
                aria-describedby="password-requirements"
                disabled={loading || success}
              />
              <button className="password-change-reveal" type="button"
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                aria-pressed={showNew}
                disabled={loading || success}
                onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="password-change-requirements" id="password-requirements">
              <span className={meetsLength ? 'is-met' : ''}><CheckCircle2 size={13} /> At least 8 characters</span>
              <span className={isDifferent ? 'is-met' : ''}><CheckCircle2 size={13} /> Different from current</span>
            </div>
          </div>

          <div className="password-change-field">
            <label htmlFor="password-confirm">Confirm new password</label>
            <div className={`password-change-input-wrap ${passwordsMatch ? 'is-matched' : ''}`}>
              <Lock size={17} className="password-change-input-icon" aria-hidden="true" />
              <input
                id="password-confirm" type="password"
                autoComplete="new-password"
                required minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter it once more"
                disabled={loading || success}
              />
              {passwordsMatch && <CheckCircle2 size={18} className="password-change-match-icon" aria-label="Passwords match" />}
            </div>
          </div>

          <button type="submit" className="password-change-submit" disabled={loading || success}>
            {loading ? <><LoaderCircle size={18} className="password-change-spinner" /> Saving password…</>
              : success ? <><CheckCircle2 size={18} /> Password saved</>
                : <>Save & continue <ArrowRight size={18} /></>}
          </button>
        </form>

        <footer className="password-change-footer">
          <ShieldCheck size={14} /> Your account, your password. Keep it private.
        </footer>
      </section>
    </div>
  );
}
