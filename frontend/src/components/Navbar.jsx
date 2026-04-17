import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { gsap } from 'gsap';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navRef = useRef(null);
  const brandRef = useRef(null);
  const linksRef = useRef(null);
  const actionsRef = useRef(null);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  // ─── Bouncy Entrance Animation (matches landing page elastic physics) ───
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || location.pathname === '/') return; // Skip on landing page

    const brand = brandRef.current;
    const links = linksRef.current?.querySelectorAll('.nav-link');
    const actions = actionsRef.current;

    const ctx = gsap.context(() => {
      // Navbar slides down with elastic ease
      gsap.fromTo(nav,
        { y: -70, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: 'elastic.out(1, 0.55)', delay: 0.1 }
      );

      // Brand logo pops in
      if (brand) {
        gsap.fromTo(brand,
          { scale: 0, rotation: -15, opacity: 0 },
          { scale: 1, rotation: 0, opacity: 1, duration: 1.7, ease: 'elastic.out(1, 0.4)', delay: 0.2 }
        );
      }

      // Nav links stagger in from left
      if (links?.length) {
        gsap.fromTo(links,
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8, ease: 'elastic.out(1, 0.6)', stagger: 0.06, delay: 0.3 }
        );
      }

      // Actions slide in from right
      if (actions) {
        gsap.fromTo(actions,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.9, ease: 'elastic.out(1, 0.55)', delay: 0.4 }
        );
      }
    }, nav);

    return () => ctx.revert();
  }, [location.pathname]);

  // ─── Brand Wiggle on Hover (matches landing page logo wiggle intensity 4) ───
  useEffect(() => {
    const brand = brandRef.current;
    if (!brand) return;

    let wiggleTween;
    gsap.set(brand, { transformOrigin: 'center center' });

    const onEnter = () => {
      wiggleTween = gsap.to(brand, {
        rotation: 4, duration: 0.17, repeat: -1, yoyo: true, ease: 'steps(1)'
      });
    };

    const onLeave = () => {
      if (wiggleTween) { wiggleTween.kill(); }
      gsap.to(brand, { rotation: 0, duration: 0.3, ease: 'power2.out' });
    };

    brand.addEventListener('mouseenter', onEnter);
    brand.addEventListener('mouseleave', onLeave);

    return () => {
      brand.removeEventListener('mouseenter', onEnter);
      brand.removeEventListener('mouseleave', onLeave);
      if (wiggleTween) wiggleTween.kill();
    };
  }, []);

  // ─── Nav Link Elastic Hover (matches landing page card fan elastic) ───
  useEffect(() => {
    const links = linksRef.current?.querySelectorAll('.nav-link');
    if (!links?.length) return;

    const cleanups = [];
    links.forEach(link => {
      const onEnter = () => {
        gsap.to(link, { scale: 1.06, duration: 0.6, ease: 'elastic.out(1, 0.5)', overwrite: true });
      };
      const onLeave = () => {
        gsap.to(link, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)', overwrite: true });
      };
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        link.removeEventListener('mouseenter', onEnter);
        link.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanups.forEach(fn => fn());
  }, [user]);

  const navLinks = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/updates', label: 'Updates', icon: '⚡' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { to: '/students', label: 'Students', icon: '👨‍🎓' },
    { to: '/teams', label: 'Teams', icon: '👥' },
  ];

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" ref={brandRef}>
          <div className="brand-logo">
            <img src="/inceptron-logo.png" alt="Inceptron Logo" className="brand-logo-img" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="brand-text">
            <span className="brand-name">SIET</span>
            <span className="brand-dept">Inceptron</span>
          </div>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`} ref={linksRef}>
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
              <span className="nav-icon">🛡️</span> Admin
            </Link>
          )}
        </div>

        <div className="navbar-actions" ref={actionsRef}>
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            aria-label="Toggle theme"
            style={{
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text)',
              background: 'transparent',
              border: 'none',
              marginRight: '8px',
              transition: 'background 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>

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
