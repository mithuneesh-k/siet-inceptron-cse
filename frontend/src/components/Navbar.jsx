import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Zap, Trophy, GraduationCap, Users, Shield } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home size={18} /> },
    { to: '/updates', label: 'Updates', icon: <Zap size={18} /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
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
            <span className="brand-name">SIET</span>
            <span className="brand-dept">Inceptron</span>
          </div>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(link => {
            // Hide everything except Home if not logged in
            if (!user && link.to !== '/') return null;
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
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
              <span className="nav-icon"><Shield size={18} /></span> Admin
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          {user ? (
            <div className="user-menu">
              <Link to={`/profile/${user.id}`} className="user-chip">
                <div className="user-avatar-sm">{user.name[0]}</div>
                <span className="user-name">{user.name.split(' ')[0]}</span>
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
