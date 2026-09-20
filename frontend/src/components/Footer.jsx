import { useState, useEffect } from "react";
import { MapPin, Mail, Globe, Phone } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const Footer = () => {
  const { theme } = useTheme();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const quickLinks = [
    { label: "Live Feed", href: "/feed" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Teams", href: "/teams" },
    { label: "My Profile", href: "/profile" },
    { label: "Submit Achievement", href: "/submit" },
    { label: "About Inceptron", href: "/about" },
  ];

  const socialLinks = [
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/school/sri-shakthi-institute-of-engineering-&-technology/posts/?feedView=all",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/cse_inceptron/",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <style>{`
        .siet-footer {
          background: var(--footer-bg);
          color: var(--footer-text-muted, var(--color-text-muted));
          font-family: 'Inter', system-ui, sans-serif;
          border-top: 1px solid var(--footer-border);
        }
        .footer-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 52px 32px 40px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 48px;
        }
        @media (max-width: 768px) {
          .footer-main {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 36px 20px 28px;
          }
        }
        .footer-brand-logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--footer-text, var(--color-text));
          letter-spacing: -0.3px;
        }
        .brand-sub {
          font-size: 11px;
          color: var(--color-green);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: block;
        }
        .footer-desc {
          font-size: 13.5px;
          line-height: 1.75;
          color: var(--footer-text-muted, var(--color-text-muted));
          margin: 0 0 20px;
          max-width: 320px;
        }
        .social-row {
          display: flex;
          gap: 10px;
        }
        .social-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--footer-card-bg, var(--bg-card));
          border: 1px solid var(--border-strong);
          color: var(--color-green);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .social-btn:hover {
          background: var(--btn-primary-bg);
          color: var(--btn-primary-color);
          border-color: var(--color-green);
          box-shadow: 0 0 16px rgba(132, 204, 22, 0.4);
        }
        .footer-col-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--footer-text, var(--color-text));
          margin: 0 0 18px;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .footer-links a {
          font-size: 13.5px;
          color: var(--footer-text-muted, var(--color-text-muted));
          text-decoration: none;
          transition: all 0.18s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-links a:hover { color: var(--color-green); }
        .footer-links a::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--color-green);
          flex-shrink: 0;
          box-shadow: 0 0 6px var(--color-green);
        }
        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 13px;
          font-size: 13.5px;
          color: var(--footer-text-muted, var(--color-text-muted));
          line-height: 1.5;
        }
        .contact-icon {
          width: 28px;
          height: 28px;
          background: var(--footer-card-bg, var(--bg-card));
          border: 1px solid var(--border-strong);
          color: var(--color-green);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 13px;
        }
        .footer-divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 0;
        }
        .footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        @media (max-width: 600px) {
          .footer-bottom { flex-direction: column; text-align: center; padding: 16px 20px; }
        }
        .footer-copy {
          font-size: 12.5px;
          color: var(--footer-text-faint, var(--color-text-faint));
        }
        .footer-made {
          font-size: 12px;
          color: var(--footer-text-faint, var(--color-text-faint));
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .heart {
          color: #ef4444;
          font-size: 13px;
        }
        .back-to-top {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 42px;
          height: 42px;
          background: var(--btn-primary-bg);
          border: none;
          border-radius: 10px;
          color: var(--btn-primary-color);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(116, 214, 0, 0.4);
          transition: all 0.2s ease;
          z-index: 999;
        }
        .back-to-top:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(116, 214, 0, 0.6); }
        .back-to-top.hidden { opacity: 0; pointer-events: none; transform: translateY(8px); }
        .dept-badge {
          display: inline-block;
          margin-top: 10px;
          font-size: 11px;
          color: var(--color-green);
          background: var(--footer-card-bg, var(--bg-card));
          border: 1px solid var(--border-strong);
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.04em;
        }

        /* ─── Premium Light Mode Scoped Footer Overrides ─── */
        [data-theme="light"] .siet-footer {
          background: radial-gradient(circle at 15% 20%, rgba(132, 204, 22, 0.10), transparent 35%),
                      linear-gradient(135deg, #0f4f2b 0%, #14532d 45%, #166534 100%) !important;
          border-top: 2px solid #84cc16 !important;
          box-shadow: 0 -10px 30px rgba(132, 204, 22, 0.06);
          color: #e5f3e8 !important;
        }
        [data-theme="light"] .siet-footer .footer-brand-logo {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 8px 14px;
        }
        [data-theme="light"] .siet-footer .footer-logo-img {
          background: rgba(255, 255, 255, 0.95);
          padding: 4px 8px;
          border-radius: 8px;
        }
        [data-theme="light"] .siet-footer .brand-name {
          color: #ffffff !important;
        }
        [data-theme="light"] .siet-footer .brand-sub {
          color: #bef264 !important;
        }
        [data-theme="light"] .siet-footer .footer-desc {
          color: #e5f3e8 !important;
        }
        [data-theme="light"] .siet-footer .footer-col-title {
          color: #ffffff !important;
          font-weight: 700 !important;
          letter-spacing: 0.06em !important;
        }
        [data-theme="light"] .siet-footer .footer-links a {
          color: #d9f99d !important;
          transition: all 180ms ease !important;
        }
        [data-theme="light"] .siet-footer .footer-links a:hover {
          color: #ffffff !important;
          transform: translateX(3px) !important;
        }
        [data-theme="light"] .siet-footer .footer-links a::before {
          background: #bef264 !important;
          box-shadow: 0 0 6px #bef264 !important;
        }
        [data-theme="light"] .siet-footer .contact-item {
          color: #e5f3e8 !important;
        }
        [data-theme="light"] .siet-footer .contact-item a {
          color: #d9f99d !important;
        }
        [data-theme="light"] .siet-footer .contact-item a:hover {
          color: #ffffff !important;
        }
        [data-theme="light"] .siet-footer .contact-icon {
          background: rgba(255, 255, 255, 0.10) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #bef264 !important;
          border-radius: 6px !important;
        }
        [data-theme="light"] .siet-footer .contact-icon:hover {
          background: rgba(255, 255, 255, 0.16) !important;
        }
        [data-theme="light"] .siet-footer .social-btn {
          background: rgba(255, 255, 255, 0.10) !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          color: #ffffff !important;
          border-radius: 8px !important;
          transition: all 180ms ease !important;
        }
        [data-theme="light"] .siet-footer .social-btn:hover {
          background: #84cc16 !important;
          color: #12301b !important;
          border-color: #84cc16 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 14px rgba(132, 204, 22, 0.3) !important;
        }
        [data-theme="light"] .siet-footer .dept-badge {
          background: rgba(255, 255, 255, 0.92) !important;
          color: #14532d !important;
          border: 1px solid rgba(255, 255, 255, 0.45) !important;
          border-radius: 999px !important;
          font-weight: 600 !important;
        }
        [data-theme="light"] .siet-footer .footer-divider {
          border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
        }
        [data-theme="light"] .siet-footer .footer-copy,
        [data-theme="light"] .siet-footer .footer-made {
          color: #b7d8bd !important;
        }

      `}</style>

      <footer className="siet-footer">
        <div className="footer-main">

          {/* Brand column */}
          <div>
            <div className="footer-brand-logo">
              <img src={theme === 'dark' ? '/dark.png?v=2' : '/inceptron-logo.png?v=2'} alt="Inceptron Logo" className="footer-logo-img logo-blend" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <span className="brand-name">SIET Inceptron</span>
                <span className="brand-sub">CSE Department Portal</span>
              </div>
            </div>
            <p className="footer-desc">
              The official achievement tracking and leaderboard platform for the
              Computer Science &amp; Engineering department at Sri Shakthi
              Institute of Engineering and Technology, Coimbatore.
            </p>
            <div className="social-row">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  title={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <div style={{display:"flex", gap:"8px", flexWrap:"wrap", marginTop:"10px"}}>
              <span className="dept-badge">Est. 2006</span>
              <span className="dept-badge">NAAC 'A' Grade</span>
              <span className="dept-badge">NBA Accredited</span>
              <span className="dept-badge">Anna University Affiliated</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className="footer-col-title">Quick Links</p>
            <ul className="footer-links">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="footer-col-title">Contact &amp; Info</p>

            <div className="contact-item">
              <div className="contact-icon"><MapPin size={16} /></div>
              <span>
                Sri Shakthi Nagar, L&amp;T By-Pass,
                Chinniyampalayam Post,
                Coimbatore – 641 062, Tamil Nadu, India
              </span>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Mail size={16} /></div>
              <span>cse@siet.ac.in</span>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Globe size={16} /></div>
              <a href="https://www.siet.ac.in" target="_blank" rel="noopener noreferrer" style={{color:"var(--color-green)", textDecoration:"none"}}>www.siet.ac.in</a>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Phone size={16} /></div>
              <span>+91 75041 69999 / 94446 20505</span>
            </div>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <span className="footer-copy">
            © 2026 SIET CSE Department. All rights reserved.
          </span>
          <span className="footer-made">
            Made with <span className="heart">♥</span> by SIET CSE Students
          </span>
        </div>
      </footer>

      {/* Back to top */}
      <button
        className={`back-to-top${showTop ? "" : " hidden"}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </>
  );
};

export default Footer;
