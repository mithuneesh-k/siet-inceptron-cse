import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SwitchMode from './ui/switch-mode';
import client from '../api/client';
import { Home, Zap, Trophy, GraduationCap, Users, User, Shield, CheckCircle, Code, Sun, Moon, Bell, AlertCircle, ChevronRight } from 'lucide-react';
import { subscribeAchievementEvents } from '../utils/achievementEvents';
import { AnnouncementImage } from '../utils/announcementHelpers';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // News Hover Popover State
  const [newsHoverOpen, setNewsHoverOpen] = useState(false);
  const [latestAnnouncements, setLatestAnnouncements] = useState([]);
  const newsHoverTimerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch latest announcements for News hover preview
    client.get('/announcements')
      .then(res => {
        if (res.data?.success) {
          setLatestAnnouncements((res.data.announcements || []).slice(0, 3));
        }
      })
      .catch(() => setLatestAnnouncements([]));
  }, [location.pathname]);

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

  const handleNewsMouseEnter = () => {
    if (newsHoverTimerRef.current) clearTimeout(newsHoverTimerRef.current);
    setNewsHoverOpen(true);
  };

  const handleNewsMouseLeave = () => {
    newsHoverTimerRef.current = setTimeout(() => {
      setNewsHoverOpen(false);
    }, 160);
  };

  const navLinks = [
    { to: '/', label: 'Home', shortLabel: 'Home', icon: <Home size={16} /> },
    { to: '/updates', label: 'Updates', shortLabel: 'Updates', icon: <Zap size={16} />, studentOnly: true },
    { to: '/news', label: 'News', shortLabel: 'News', icon: <Bell size={16} />, isNews: true },
    { to: '/leaderboard', label: 'Leaderboard', shortLabel: 'Leaderboard', icon: <Trophy size={16} /> },
    { to: '/competitive-leaderboard', label: 'Competitive Leaderboard', shortLabel: 'Competitive', icon: <Trophy size={16} /> },
    { to: '/platforms', label: 'Platforms', shortLabel: 'Platforms', icon: <Code size={16} /> },
    { to: '/students', label: 'Students', shortLabel: 'Students', icon: <GraduationCap size={16} /> },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-logo">
            <img src={theme === 'dark' ? '/dark.png?v=2' : '/inceptron-logo.png?v=2'} alt="Inceptron Logo" className="brand-logo-img" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="brand-text">
            <span className="brand-name">SIET <span className="brand-highlight">Inceptron</span></span>
            <span className="brand-dept">CSE Portal</span>
          </div>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(link => {
            // Hide student-only links from non-student accounts (Faculty / Admin)
            if (link.studentOnly && (user?.is_admin || (user?.role && user?.role !== 'student'))) return null;

            if (link.isNews) {
              return (
                <div
                  key={link.to}
                  className="nav-item-news-container"
                  onMouseEnter={handleNewsMouseEnter}
                  onMouseLeave={handleNewsMouseLeave}
                  style={{ position: 'relative' }}
                >
                  <Link
                    to={link.to}
                    className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
                    onClick={() => { setMenuOpen(false); setNewsHoverOpen(false); }}
                    onFocus={handleNewsMouseEnter}
                    onBlur={handleNewsMouseLeave}
                  >
                    <span className="nav-icon">{link.icon}</span>
                    <span className="nav-label-full">{link.label}</span>
                    <span className="nav-label-short">{link.shortLabel || link.label}</span>
                  </Link>

                  {/* News Desktop Hover Popover Panel */}
                  {newsHoverOpen && (
                    <div
                      className="news-hover-popover animate-fadeIn"
                      onMouseEnter={handleNewsMouseEnter}
                      onMouseLeave={handleNewsMouseLeave}
                    >
                      <div className="news-popover-header">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                          <Bell size={14} color="var(--color-green)" /> Latest Announcements
                        </span>
                      </div>

                      {latestAnnouncements.length === 0 ? (
                        <div className="news-popover-empty">
                          No active announcements right now.
                        </div>
                      ) : (
                        <div className="news-popover-list">
                          {latestAnnouncements.map(ann => (
                            <Link
                              key={ann.id}
                              to="/news"
                              className="news-popover-item"
                              onClick={() => setNewsHoverOpen(false)}
                            >
                              <div className="news-popover-thumb">
                                <AnnouncementImage
                                  announcement={ann}
                                  alt={ann.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <div className="news-popover-info">
                                <div className="news-popover-badges">
                                  <span className="news-badge">{ann.type || 'General'}</span>
                                  {ann.is_important && <span className="news-badge-important">IMPORTANT</span>}
                                </div>
                                <div className="news-popover-title">{ann.title}</div>
                                <div className="news-popover-date">
                                  {ann.created_at ? new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      <div className="news-popover-footer">
                        <Link
                          to="/news"
                          className="news-popover-all-btn"
                          onClick={() => setNewsHoverOpen(false)}
                        >
                          View All News <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) && link.to !== '/' ? 'active' : link.to === '/' && location.pathname === '/' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label-full">{link.label}</span>
                <span className="nav-label-short">{link.shortLabel || link.label}</span>
              </Link>
            );
          })}

          {user?.is_admin && (
            <>
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon"><Shield size={16} /></span>
                <span className="nav-label-full">Admin</span>
                <span className="nav-label-short">Admin</span>
              </Link>
              <Link to="/approvals" className={`nav-link ${isActive('/approvals') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon"><CheckCircle size={16} /></span>
                <span className="nav-label-full">Approvals</span>
                <span className="nav-label-short">Approvals</span>
                {pendingCount > 0 && <span className="nav-pending-badge">{pendingCount}</span>}
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions">
          <SwitchMode width={64} height={32} />
          {user && (
            <div className="user-menu">
              <Link to={`/profile/${user.id}`} className="user-chip">
                <div className="user-avatar-sm">{user.name?.[0] || '?'}</div>
                <span className="user-name">{user.name?.split(' ')[0] || 'User'}</span>
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
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
