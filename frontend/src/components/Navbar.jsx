import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { Home, Zap, Trophy, GraduationCap, Users, Shield, CheckCircle, Code } from 'lucide-react';
import { subscribeAchievementEvents } from '../utils/achievementEvents';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const isAdmin = Boolean(user && (user.is_admin || user.role === 'admin' || user.role === 'faculty'));
    if (!isAdmin) {
      setPendingCount(0);
      return;
    }

    client.get('/achievements/pending/count')
      .then(res => setPendingCount(res.data?.count || 0))
      .catch(() => setPendingCount(0));

    const unsubscribe = subscribeAchievementEvents((detail) => {
      const { action, achievement, wasPending } = detail;
      if (action === 'created' && (achievement?.status === 'pending' || !achievement?.verified)) {
        setPendingCount(prev => prev + 1);
      } else if (action === 'approved' || action === 'rejected') {
        setPendingCount(prev => Math.max(0, prev - 1));
      } else if (action === 'deleted' && (wasPending || achievement?.status === 'pending' || achievement?.verified === false)) {
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home size={18} /> },
    { to: '/updates', label: 'Updates', icon: <Zap size={18} />, studentOnly: true },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
    { to: '/platforms', label: 'Platforms', icon: <Code size={18} /> },
    { to: '/students', label: 'Students', icon: <GraduationCap size={18} /> },
    { to: '/teams', label: 'Teams', icon: <Users size={18} /> },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-logo">
            <img src="/inceptron-logo.png" alt="Inceptron Logo" className="brand-logo-img" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="brand-text">
            <span className="brand-name">SIET Inceptron</span>
            <span className="brand-dept">CSE Department Portal</span>
          </div>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(link => {
            // Hide everything except Home if not logged in
            if (!user && link.to !== '/') return null;
            // Hide student-only links from non-student accounts (Faculty / Admin)
            if (link.studentOnly && (user?.is_admin || (user?.role && user?.role !== 'student'))) return null;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) && link.to !== '/' ? 'active' : link.to === '/' && location.pathname === '/' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="nav-icon">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}

          {user?.is_admin && (
            <>
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon"><Shield size={18} /></span> Admin
              </Link>
              <Link to="/approvals" className={`nav-link ${isActive('/approvals') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon"><CheckCircle size={18} /></span> Approvals
                {pendingCount > 0 && <span className="nav-pending-badge">{pendingCount}</span>}
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions">
          {user ? (
      <div className="user-menu">
        <Link to={`/profile/${user.id}`} className="user-chip">
          <div className="user-avatar-sm">{user.name?.[0] || '?'}</div>
          <span className="user-name">{user.name?.split(' ')[0] || 'User'}</span>
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
            </div>
          )}
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
}
