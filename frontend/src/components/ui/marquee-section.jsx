import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { Trophy, Code, Bell, Award, Sparkles, ExternalLink, Flame } from 'lucide-react';

export default function MarqueeSection() {
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [competitiveRows, setCompetitiveRows] = useState([]);
  const [newsRows, setNewsRows] = useState([]);

  useEffect(() => {
    // 1. Fetch canonical leaderboard highlights
    client.get('/leaderboard?limit=12')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setLeaderboardRows(data);
      })
      .catch(() => setLeaderboardRows([]));

    // 2. Fetch competitive platform highlights
    client.get('/platforms/leaderboard?limit=12')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.students || []);
        setCompetitiveRows(data);
      })
      .catch(() => setCompetitiveRows([]));

    // 3. Fetch latest admin news
    client.get('/announcements')
      .then(res => {
        if (res.data?.success) {
          setNewsRows(res.data.announcements || []);
        }
      })
      .catch(() => setNewsRows([]));
  }, []);

  const dup = (arr) => (arr.length > 0 ? [...arr, ...arr, ...arr] : []);

  const leadItems = dup(leaderboardRows);
  const compItems = dup(competitiveRows);
  const newsItems = dup(newsRows);

  return (
    <section className="lp-section lp-marquee-section" aria-label="Live From Inceptron Marquee Highlights">
      <style>{`
        .lp-marquee-container {
          padding: 60px 0;
          background: var(--bg-secondary);
          border-top: 2px solid var(--border);
          border-bottom: 2px solid var(--border);
          overflow: hidden;
        }
        .lp-marquee-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .lp-marquee-track-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow: hidden;
          position: relative;
        }
        .lp-marquee-track-wrapper::before,
        .lp-marquee-track-wrapper::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 80px;
          z-index: 10;
          pointer-events: none;
        }
        .lp-marquee-track-wrapper::before {
          left: 0;
          background: linear-gradient(to right, var(--bg-secondary), transparent);
        }
        .lp-marquee-track-wrapper::after {
          right: 0;
          background: linear-gradient(to left, var(--bg-secondary), transparent);
        }

        .lp-marquee-row {
          display: flex;
          overflow: hidden;
          user-select: none;
        }
        .lp-marquee-content {
          display: flex;
          gap: 16px;
          flex-shrink: 0;
          min-width: 100%;
          align-items: center;
        }

        .lp-marquee-left {
          animation: marqueeLeft 35s linear infinite;
        }
        .lp-marquee-right {
          animation: marqueeRight 38s linear infinite;
        }

        .lp-marquee-row:hover .lp-marquee-content,
        .lp-marquee-row:focus-within .lp-marquee-content {
          animation-play-state: paused;
        }

        @keyframes marqueeLeft {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-marquee-left, .lp-marquee-right {
            animation: none !important;
          }
          .lp-marquee-row {
            overflow-x: auto;
          }
        }

        .lp-marquee-card {
          flex-shrink: 0;
          width: 290px;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--color-text);
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
        }
        .lp-marquee-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-green);
          background: var(--bg-hover);
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.15);
        }
        .lp-marquee-card.important-card {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
        .lp-marquee-card.important-card:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: #dc2626;
        }

        .lp-mq-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: #fff;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }
        .lp-mq-icon-box {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(132, 204, 22, 0.12);
          color: var(--color-green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-mq-icon-box.red {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .lp-mq-info { flex: 1; min-width: 0; }
        .lp-mq-title { font-size: 13.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text); }
        .lp-mq-sub { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lp-mq-badge { font-size: 13px; font-weight: 800; color: var(--color-gold); font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }

        [data-theme="light"] .lp-marquee-card {
          background: #ffffff;
          border: 1px solid #d7e2d3;
          color: #111827;
        }
        [data-theme="light"] .lp-marquee-card:hover {
          background: #f0fdf4;
          border-color: #84cc16;
        }
        [data-theme="light"] .lp-marquee-card.important-card {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        [data-theme="light"] .lp-mq-title { color: #111827; }
        [data-theme="light"] .lp-mq-sub { color: #4b5563; }
      `}</style>

      <div className="lp-marquee-container">
        <div className="container">
          <div className="lp-marquee-header">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Flame size={26} className="text-gradient" /> Live From Inceptron
            </h2>
            <p className="section-subtitle" style={{ marginTop: 6 }}>
              Real-time achievements, competitive platform rankings, and live department updates
            </p>
          </div>
        </div>

        <div className="lp-marquee-track-wrapper">
          {/* Row 1: Achievement Leaderboard (Left → Right) */}
          <div className="lp-marquee-row">
            <div className="lp-marquee-content lp-marquee-left">
              {leadItems.map((item, i) => (
                <Link key={`lead-${i}`} to={`/profile/${item.id}`} className="lp-marquee-card">
                  <div className="lp-mq-avatar">{item.name?.[0] || 'S'}</div>
                  <div className="lp-mq-info">
                    <div className="lp-mq-title">#{item.rank || (i % 12) + 1} {item.name}</div>
                    <div className="lp-mq-sub">{item.class} · {item.achievement_count || 0} achv.</div>
                  </div>
                  <span className="lp-mq-badge">{item.score || 0} pts</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Row 2: Competitive Leaderboard (Right → Left) */}
          <div className="lp-marquee-row">
            <div className="lp-marquee-content lp-marquee-right">
              {compItems.map((item, i) => (
                <Link key={`comp-${i}`} to="/competitive-leaderboard" className="lp-marquee-card">
                  <div className="lp-mq-icon-box">
                    <Code size={18} />
                  </div>
                  <div className="lp-mq-info">
                    <div className="lp-mq-title">{item.name || item.student_name || 'Competitive Coder'}</div>
                    <div className="lp-mq-sub">{item.class || 'CSE'} · {item.total_solved || 0} Solved</div>
                  </div>
                  <span className="lp-mq-badge" style={{ color: 'var(--color-green)' }}>
                    {item.total_score || item.score || 0} pts
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Row 3: Admin News Announcements (Left → Right) */}
          <div className="lp-marquee-row">
            <div className="lp-marquee-content lp-marquee-left">
              {newsItems.map((item, i) => (
                <Link
                  key={`news-${i}`}
                  to="/news"
                  className={`lp-marquee-card ${item.is_important ? 'important-card' : ''}`}
                >
                  <div className={`lp-mq-icon-box ${item.is_important ? 'red' : ''}`}>
                    <Bell size={18} />
                  </div>
                  <div className="lp-mq-info">
                    <div className="lp-mq-title">{item.title}</div>
                    <div className="lp-mq-sub">{item.type || 'Announcement'} · {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Live'}</div>
                  </div>
                  {item.is_important && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IMPORTANT</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
