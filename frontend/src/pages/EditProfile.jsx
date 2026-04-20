import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function EditProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [profileForm, setProfileForm] = useState({ 
    bio: '', 
    github: '', 
    linkedin: '',
    twitter: '',
    instagram: '',
    portfolio: '',
    phone: '',
    phone_public: false,
    dob_public: false
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!authUser) return;
    client.get(`/users/${authUser.id}`)
      .then(res => {
        setProfileForm({
          bio: res.data.bio || '',
          github: res.data.github || '',
          linkedin: res.data.linkedin || '',
          twitter: res.data.twitter || '',
          instagram: res.data.instagram || '',
          portfolio: res.data.portfolio || '',
          phone: res.data.phone || '',
          phone_public: res.data.phone_public || false,
          dob_public: res.data.dob_public || false
        });
      })
      .catch(err => {
        console.error(err);
        showToast('Failed to load profile details', 'error');
      })
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.put(`/users/${authUser.id}`, profileForm);
      showToast('Profile updated successfully!');
      refreshUser();
      setTimeout(() => navigate(`/profile/${authUser.id}`), 1000);
    } catch (err) {
      showToast('Failed to update profile', 'error');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return showToast('New passwords do not match', 'error');
    }
    try {
      await client.post(`/users/${authUser.id}/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showToast('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/profile/${authUser.id}`)}>← Back</button>
          <h1 className="section-title">Edit Profile</h1>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Public Details</h2>
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group">
              <label className="form-label">Bio (max 160 chars)</label>
              <textarea 
                className="form-input" 
                rows="3" 
                style={{ resize: 'vertical' }}
                placeholder="Tell others about yourself..."
                maxLength={160}
                value={profileForm.bio}
                onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input 
                  className="form-input" 
                  placeholder="https://linkedin.com/in/username"
                  value={profileForm.linkedin || ''}
                  onChange={e => setProfileForm(prev => ({ ...prev, linkedin: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub URL</label>
                <input 
                  className="form-input" 
                  placeholder="https://github.com/username"
                  value={profileForm.github || ''}
                  onChange={e => setProfileForm(prev => ({ ...prev, github: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Twitter/X URL</label>
                <input 
                  className="form-input" 
                  placeholder="https://twitter.com/username"
                  value={profileForm.twitter || ''}
                  onChange={e => setProfileForm(prev => ({ ...prev, twitter: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram URL</label>
                <input 
                  className="form-input" 
                  placeholder="https://instagram.com/username"
                  value={profileForm.instagram || ''}
                  onChange={e => setProfileForm(prev => ({ ...prev, instagram: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Portfolio URL</label>
              <input 
                className="form-input" 
                placeholder="https://yourportfolio.com"
                value={profileForm.portfolio || ''}
                onChange={e => setProfileForm(prev => ({ ...prev, portfolio: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone / WhatsApp</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  className="form-input" 
                  type="tel"
                  style={{ flex: 1 }}
                  placeholder="+91..."
                  value={profileForm.phone}
                  onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                />
                <label className="checkbox-group">
                  <input 
                    type="checkbox" 
                    className="checkbox-custom"
                    checked={profileForm.phone_public} 
                    onChange={e => setProfileForm(prev => ({ ...prev, phone_public: e.target.checked }))} 
                  />
                  <span>Public</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Privacy Settings</label>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label className="checkbox-group">
                  <input 
                    type="checkbox" 
                    className="checkbox-custom"
                    checked={profileForm.dob_public} 
                    onChange={e => setProfileForm(prev => ({ ...prev, dob_public: e.target.checked }))} 
                  />
                  <span>Show Birthday on Profile</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>Save Profile Changes</button>
          </form>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Change Password</h2>
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input 
                className="form-input" 
                type="password" 
                required
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                className="form-input" 
                type="password" 
                required
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                className="form-input" 
                type="password" 
                required
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>Update Password</button>
          </form>
        </div>

        {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      </div>
    </div>
  );
}
