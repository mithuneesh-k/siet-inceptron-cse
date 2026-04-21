import React from 'react';
import { Link } from 'react-router-dom';

/**
 * FloatingNav — fully transparent navbar with only two bare text links.
 * Zero background, zero blur, zero border. Only the text is visible.
 * Font: Cindie Mono (loaded via CDN in globals.css).
 */
export function FloatingNav() {
  return (
    <nav
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        paddingTop: '2rem',
        paddingRight: '2.5rem',
        background: 'transparent',
        backdropFilter: 'none',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '2.5rem' }}>
        {[
          { label: 'Home', to: '/' },
          { label: 'Dashboard', to: '/dashboard' }
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="font-cindie"
            style={{
              color: 'white',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              textDecoration: 'none',
              cursor: 'pointer',
              letterSpacing: '0.2em',
              opacity: 0.7,
              fontWeight: 400,
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
