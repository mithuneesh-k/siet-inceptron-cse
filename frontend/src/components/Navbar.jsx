import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SwitchMode from './ui/switch-mode';
import client from '../api/client';
import { Home, Zap, Trophy, GraduationCap, Users, User, Shield, CheckCircle, Code, Sun, Moon, Bell, AlertCircle, ChevronRight, Palette, Laptop, Check } from 'lucide-react';
import { subscribeAchievementEvents } from '../utils/achievementEvents';
import { AnnouncementImage } from '../utils/announcementHelpers';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colorTheme, setColorTheme, colorThemes } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Quick Palette Popover State
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef(null);

  // News Hover Popover State
  const [newsHoverOpen, setNewsHoverOpen] = useState(false);
  const [latestAnnouncements, setLatestAnnouncements] = useState([]);
  const newsHoverTimerRef = useRef(null);

  useEffect(() => {
    if (!paletteOpen) return;
    const handleOutside = (e) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target)) {
        setPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [paletteOpen]);

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
    const isFaculty = Boolean(user && user.role === 'faculty');
    if (!isFaculty) {
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
    { to: '/news', label: 'News', shortLabel: 'News', icon: <Bell size={16} />, isNews: true },
    { to: '/showcase', label: 'Showcase', shortLabel: 'Showcase', icon: <Laptop size={16} /> },
    { to: '/leaderboard', label: 'Leaderboard', shortLabel: 'Ranks', icon: <Trophy size={16} /> },
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

          {user && (user.is_admin || user.role === 'admin' || user.role === 'faculty') && (
            <>
              <Link to="/showcase/manage" className={`nav-link ${isActive('/showcase/manage') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon"><Laptop size={16} /></span>
                <span className="nav-label-full">Broadcast & CMS</span>
                <span className="nav-label-short">CMS</span>
              </Link>
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon"><Shield size={16} /></span>
                <span className="nav-label-full">{user.role === 'faculty' ? 'Management' : 'Admin'}</span>
                <span className="nav-label-short">{user.role === 'faculty' ? 'Manage' : 'Admin'}</span>
                {user.role === 'faculty' && pendingCount > 0 && <span className="nav-pending-badge">{pendingCount}</span>}
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions">
          <SwitchMode width={64} height={32} />
          <div ref={paletteRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm nav-theme-btn"
              onClick={() => setPaletteOpen(prev => !prev)}
              title="Change Color Theme"
              aria-label="Theme Settings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: 8,
                color: paletteOpen ? 'var(--nav-brand-highlight, #facc15)' : 'inherit'
              }}
            >
              <Palette size={18} />
            </button>

            {paletteOpen && (
              <div
                className="animate-fadeIn"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  background: 'var(--bg-card, #0f1a2b)',
                  border: '1.5px solid var(--border-strong, rgba(250, 204, 21, 0.35))',
                  borderRadius: 14,
                  padding: '10px',
                  boxShadow: '0 18px 45px rgba(0,0,0,0.6)',
                  zIndex: 10000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', padding: '2px 8px 4px' }}>
                  Accent Color Theme
                </div>
                {colorThemes.map(t => {
                  const isSelected = colorTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setColorTheme(t.id);
                        setPaletteOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: isSelected ? 'var(--accent-soft-2, rgba(16, 185, 129, 0.15))' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-primary, #10b981)' : '1px solid transparent',
                        color: 'var(--color-text)',
                        fontSize: 12.5,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.primaryColor || t.color, display: 'inline-block', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }} />
                        <span>{t.name}</span>
                      </div>
                      {isSelected && <Check size={14} color="var(--accent-primary, #10b981)" />}
                    </button>
                  );
                })}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <Link
                  to="/theme"
                  onClick={() => setPaletteOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent-text, #10b981)',
                    textDecoration: 'none',
                    padding: '6px 8px',
                    borderRadius: 6
                  }}
                >
                  More Appearance Settings →
                </Link>
              </div>
            )}
          </div>
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
