import { Link } from 'react-router-dom';

export default function FloatingNav() {
  return (
    <nav style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'flex-end',
      paddingTop: '32px',
      paddingRight: '40px',
      background: 'transparent',
      backdropFilter: 'none',
      border: 'none',
      boxShadow: 'none',
    }}>
      <div style={{ display: 'flex', gap: '40px' }}>
        {[
          { label: 'Home', to: '/' },
          { label: 'Dashboard', to: '/leaderboard' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            style={{
              fontFamily: "'Space Grotesk', monospace",
              color: '#fff',
              fontSize: '14px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              cursor: 'pointer',
              letterSpacing: '0.2em',
              opacity: 0.7,
              fontWeight: 400,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
