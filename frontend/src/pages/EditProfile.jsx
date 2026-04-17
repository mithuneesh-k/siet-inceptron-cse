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
    phone: ''
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
          phone: res.data.phone || ''
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
              <label className="form-label">Bio</label>
              <textarea 
                className="form-input" 
                rows="3" 
                style={{ resize: 'vertical' }}
                placeholder="Tell others about yourself..."
                value={profileForm.bio}
                onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">LinkedIn Slug</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>linkedin.com/in/</span>
                <input 
                  className="form-input" 
                  placeholder="john-doe-123"
                  value={profileForm.linkedin}
                  onChange={e => setProfileForm(prev => ({ ...prev, linkedin: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">GitHub Username</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>github.com/</span>
                <input 
                  className="form-input" 
                  placeholder="johndoe"
                  value={profileForm.github}
                  onChange={e => setProfileForm(prev => ({ ...prev, github: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone / WhatsApp</label>
              <input 
                className="form-input" 
                type="tel"
                placeholder="+91..."
                value={profileForm.phone}
                onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save Profile</button>
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
