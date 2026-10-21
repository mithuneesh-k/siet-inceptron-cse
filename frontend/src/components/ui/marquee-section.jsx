import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { Trophy, Code, Bell, Flame } from 'lucide-react';

function NewsCardThumbnail({ item }) {
  const imageUrl = (item?.image_url || item?.image || '').trim();
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div
        className="lp-tk-thumb-box"
        style={{
          width: 72,
          height: 72,
          borderRadius: 14,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          border: '1.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}
      >
        <img
          src={imageUrl}
          alt={item?.title || 'News image'}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`lp-tk-icon-box ${item?.is_important ? 'red' : ''}`}>
      <Bell size={26} />
    </div>
  );
}

export default function MarqueeSection() {
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [newsRows, setNewsRows] = useState([]);

  const row1GroupRef = useRef(null);
  const row3GroupRef = useRef(null);

  const [durations, setDurations] = useState({ r1: 60, r3: 60 });

  useEffect(() => {
    // 1. Fetch canonical achievement leaderboard highlights (Top 10)
    client.get('/leaderboard?limit=10')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        const top10 = data.slice(0, 10).map((item, idx) => ({
          ...item,
          rank: item.rank || idx + 1
        }));
        setLeaderboardRows(top10);
      })
      .catch(() => setLeaderboardRows([]));

    // 2. Fetch latest admin announcements (Latest 8)
    client.get('/announcements')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.announcements)) {
          setNewsRows(res.data.announcements.slice(0, 8));
        }
      })
      .catch(() => setNewsRows([]));
  }, []);

  // Duplicate items for DOM marquee group rendering (filling continuous visual width)
  const ensureClones = (arr, minCount = 8) => {
    if (!arr || arr.length === 0) return [];
    let list = [...arr];
    while (list.length < minCount) {
      list = [...list, ...arr];
    }
    return list;
  };

  const leadItems = ensureClones(leaderboardRows);
  const newsItems = ensureClones(newsRows);

  // Measure group DOM width and set dynamic animation duration for uniform visual speed (~38-40 px/sec)
  useEffect(() => {
    const updateDurations = () => {
      const getDuration = (ref, targetPxPerSec, itemCount) => {
        let width = 0;
        if (ref.current) {
          width = ref.current.getBoundingClientRect().width;
        }
        if (width <= 0) {
          width = (itemCount || 8) * 440;
        }
        // Duration = Distance / Speed
        return Math.max(26, Math.round(width / targetPxPerSec));
      };

      setDurations({
        r1: getDuration(row1GroupRef, 40, leadItems.length),
        r3: getDuration(row3GroupRef, 36, newsItems.length)
      });
    };

    updateDurations();
    const timer = setTimeout(updateDurations, 150);
    window.addEventListener('resize', updateDurations);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDurations);
    };
  }, [leadItems.length, newsItems.length]);

  return (
    <section className="lp-section lp-marquee-section" aria-label="Live From Inceptron Ticker">
      <style>{`
        .lp-marquee-section {
          padding: 56px 0 68px !important;
          background: var(--bg-secondary);
          border-top: 2px solid var(--border);
          border-bottom: 2px solid var(--border);
          overflow: hidden;
        }
        .lp-marquee-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .lp-marquee-header h2 {
          font-size: clamp(26px, 3.2vw, 36px) !important;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .lp-marquee-header p {
          font-size: 15px !important;
          margin-top: 6px;
          color: var(--color-text-muted);
        }
        .lp-marquee-container-inner {
          display: flex;
          flex-direction: column;
          gap: 28px;
          position: relative;
        }

        /* Subtle left and right edge fade masks */
        .lp-marquee-track-container {
          position: relative;
          overflow: hidden;
          padding: 6px 0;
        }
        .lp-marquee-track-container::before,
        .lp-marquee-track-container::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 90px;
          z-index: 10;
          pointer-events: none;
        }
        .lp-marquee-track-container::before {
          left: 0;
          background: linear-gradient(to right, var(--bg-secondary), transparent);
        }
        .lp-marquee-track-container::after {
          right: 0;
          background: linear-gradient(to left, var(--bg-secondary), transparent);
        }

        .lp-marquee-label {
          font-size: 12.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent-text, var(--color-green));
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding: 4px 14px;
          background: var(--accent-soft, rgba(16, 185, 129, 0.08));
          border: 1px solid var(--accent-border, rgba(16, 185, 129, 0.2));
          border-radius: 999px;
        }

        /* Marquee Ticker Track */
        .lp-marquee-track {
          display: flex;
          width: max-content;
          user-select: none;
        }

        /* Row 1: Achievement Leaderboard (LEFT → RIGHT: movement toward right) */
        .lp-marquee-left-to-right {
          animation: marqueeScrollRight linear infinite;
        }

        /* Row 2: Achievement Ticker (RIGHT → LEFT: movement toward left) */
        .lp-marquee-right-to-left {
          animation: marqueeScrollLeft linear infinite;
        }

        /* Pause ONLY the row currently hovered or focused */
        .lp-marquee-track-container:hover .lp-marquee-track,
        .lp-marquee-track-container:focus-within .lp-marquee-track {
          animation-play-state: paused;
        }

        @keyframes marqueeScrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes marqueeScrollRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-marquee-left-to-right, .lp-marquee-right-to-left {
            animation: none !important;
          }
          .lp-marquee-track-container {
            overflow-x: auto;
          }
        }

        .lp-marquee-group {
          display: flex;
          gap: 18px;
          padding-right: 18px;
          flex-shrink: 0;
        }

        /* Expanded, Prominent Ticker Pill Item */
        .lp-ticker-pill {
          height: 98px;
          width: 420px;
          flex-shrink: 0;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          color: var(--color-text);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        .lp-ticker-pill:hover {
          transform: translateY(-3px) scale(1.01);
          border-color: var(--accent-primary, var(--color-green));
          background: var(--bg-hover);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.25);
        }
        .lp-ticker-pill.important-pill {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.08);
        }
        .lp-ticker-pill.important-pill:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          box-shadow: 0 10px 26px rgba(239, 68, 68, 0.2);
        }

        .lp-tk-avatar {
          width: 68px; height: 68px;
          border-radius: 16px;
          background: var(--gradient-primary);
          color: #fff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }
        .lp-tk-icon-box {
          width: 68px; height: 68px;
          border-radius: 14px;
          background: var(--accent-soft, rgba(16, 185, 129, 0.12));
          color: var(--accent-text, var(--color-green));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-tk-icon-box.red {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .lp-tk-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }
        .lp-tk-title {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.35;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lp-tk-sub {
          font-size: 13px;
          color: var(--color-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .lp-tk-badge {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-gold);
          font-family: 'Space Grotesk', sans-serif;
          flex-shrink: 0;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.25);
          padding: 6px 12px;
          border-radius: 10px;
        }

        .lp-tk-important-chip {
          font-size: 10.5px;
          font-weight: 800;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        /* Light Mode Specific Overrides */
        [data-theme="light"] .lp-ticker-pill {
          background: #ffffff;
          border: 1.5px solid #d7e2d3;
          color: #111827;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .lp-ticker-pill:hover {
          background: var(--theme-soft, #f8fafc);
          border-color: var(--accent-primary, var(--theme-primary));
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.1);
        }
        [data-theme="light"] .lp-ticker-pill.important-pill {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        [data-theme="light"] .lp-tk-title { color: #111827; }
        [data-theme="light"] .lp-tk-sub { color: #4b5563; }
        [data-theme="light"] .lp-marquee-label { color: var(--accent-text, var(--theme-primary)); }

        @media (max-width: 640px) {
          .lp-ticker-pill {
            width: 320px;
            height: 86px;
            padding: 10px 14px;
            gap: 12px;
          }
          .lp-tk-thumb-box, .lp-tk-icon-box, .lp-tk-avatar {
            width: 56px !important;
            height: 56px !important;
          }
          .lp-tk-title {
            font-size: 13.5px;
          }
          .lp-tk-sub {
            font-size: 11.5px;
          }
        }
      `}</style>

      <div className="container">
        <div className="lp-marquee-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Flame size={28} className="text-gradient" /> Live From Inceptron
          </h2>
          <p className="section-subtitle">
            Real-time achievement leaderboards and department announcements
          </p>
        </div>

        <div className="lp-marquee-container-inner">

          {/* ── ROW 1: ACHIEVEMENT LEADERBOARD (LEFT → RIGHT) ── */}
          <div className="lp-marquee-track-container">
            <div className="lp-marquee-label">
              <Trophy size={16} /> Achievement Leaderboard
            </div>
            {leadItems.length === 0 ? (
              <div className="lp-ticker-pill" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No verified achievements yet
              </div>
            ) : (
              <div
                className="lp-marquee-track lp-marquee-left-to-right"
                style={{ animationDuration: `${durations.r1}s` }}
              >
                <div className="lp-marquee-group" ref={row1GroupRef}>
                  {leadItems.map((item, i) => (
                    <Link key={`lead-a-${i}`} to={`/profile/${item.id}`} className="lp-ticker-pill">
                      <div className="lp-tk-avatar">{item.name?.[0] || 'S'}</div>
                      <div className="lp-tk-info">
                        <div className="lp-tk-title">#{item.rank || (i % 10) + 1} {item.name}</div>
                        <div className="lp-tk-sub">{item.class} · {item.achievement_count || 0} achv.</div>
                      </div>
                      <span className="lp-tk-badge">{item.score || 0} pts</span>
                    </Link>
                  ))}
                </div>
                {/* Clone group for seamless loop */}
                <div className="lp-marquee-group" aria-hidden="true">
                  {leadItems.map((item, i) => (
                    <Link key={`lead-b-${i}`} to={`/profile/${item.id}`} className="lp-ticker-pill" tabIndex={-1}>
                      <div className="lp-tk-avatar">{item.name?.[0] || 'S'}</div>
                      <div className="lp-tk-info">
                        <div className="lp-tk-title">#{item.rank || (i % 10) + 1} {item.name}</div>
                        <div className="lp-tk-sub">{item.class} · {item.achievement_count || 0} achv.</div>
                      </div>
                      <span className="lp-tk-badge">{item.score || 0} pts</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── ROW 2: LATEST NEWS (LEFT → RIGHT) ── */}
          <div className="lp-marquee-track-container">
            <div className="lp-marquee-label">
              <Bell size={16} /> Latest News
            </div>
            {newsItems.length === 0 ? (
              <div className="lp-ticker-pill" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No active announcements
              </div>
            ) : (
              <div
                className="lp-marquee-track lp-marquee-left-to-right"
                style={{ animationDuration: `${durations.r3}s` }}
              >
                <div className="lp-marquee-group" ref={row3GroupRef}>
                  {newsItems.map((item, i) => (
                    <Link
                      key={`news-a-${i}`}
                      to="/news"
                      className={`lp-ticker-pill ${item.is_important ? 'important-pill' : ''}`}
                    >
                      <NewsCardThumbnail item={item} />
                      <div className="lp-tk-info">
                        <div className="lp-tk-title">{item.title}</div>
                        <div className="lp-tk-sub">
                          <span>{item.type || 'General'}</span>
                          <span>·</span>
                          <span>{item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Live'}</span>
                        </div>
                      </div>
                      {item.is_important && (
                        <span className="lp-tk-important-chip">
                          IMPORTANT
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                {/* Clone group for seamless loop */}
                <div className="lp-marquee-group" aria-hidden="true">
                  {newsItems.map((item, i) => (
                    <Link
                      key={`news-b-${i}`}
                      to="/news"
                      className={`lp-ticker-pill ${item.is_important ? 'important-pill' : ''}`}
                      tabIndex={-1}
                    >
                      <NewsCardThumbnail item={item} />
                      <div className="lp-tk-info">
                        <div className="lp-tk-title">{item.title}</div>
                        <div className="lp-tk-sub">
                          <span>{item.type || 'General'}</span>
                          <span>·</span>
                          <span>{item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Live'}</span>
                        </div>
                      </div>
                      {item.is_important && (
                        <span className="lp-tk-important-chip">
                          IMPORTANT
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

