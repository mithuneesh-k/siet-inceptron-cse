import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { Trophy, Code, Bell, Flame } from 'lucide-react';

export default function MarqueeSection() {
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [competitiveRows, setCompetitiveRows] = useState([]);
  const [newsRows, setNewsRows] = useState([]);

  const row1GroupRef = useRef(null);
  const row2GroupRef = useRef(null);
  const row3GroupRef = useRef(null);

  const [durations, setDurations] = useState({ r1: 60, r2: 60, r3: 60 });

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

    // 2. Fetch competitive platform highlights (Top 10 canonical order)
    client.get('/platforms/leaderboard?batch=all&class=all')
      .then(res => {
        const data = Array.isArray(res.data?.leaderboard) ? res.data.leaderboard : [];
        const top10 = data.slice(0, 10).map((item, idx) => ({
          ...item,
          rank: item.rank || idx + 1
        }));
        setCompetitiveRows(top10);
      })
      .catch(() => setCompetitiveRows([]));

    // 3. Fetch latest admin announcements (Latest 8)
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
  const compItems = ensureClones(competitiveRows);
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
          width = (itemCount || 8) * 284;
        }
        // Duration = Distance / Speed
        return Math.max(24, Math.round(width / targetPxPerSec));
      };

      setDurations({
        r1: getDuration(row1GroupRef, 40, leadItems.length),
        r2: getDuration(row2GroupRef, 40, compItems.length),
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
  }, [leadItems.length, compItems.length, newsItems.length]);

  return (
    <section className="lp-section lp-marquee-section" aria-label="Live From Inceptron Ticker">
      <style>{`
        .lp-marquee-section {
          padding: 36px 0 44px !important;
          background: var(--bg-secondary);
          border-top: 2px solid var(--border);
          border-bottom: 2px solid var(--border);
          overflow: hidden;
        }
        .lp-marquee-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .lp-marquee-container-inner {
          display: flex;
          flex-direction: column;
          gap: 22px;
          position: relative;
        }

        /* Subtle left and right edge fade masks */
        .lp-marquee-track-container {
          position: relative;
          overflow: hidden;
          padding: 4px 0;
        }
        .lp-marquee-track-container::before,
        .lp-marquee-track-container::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 70px;
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
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-green);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          padding-left: 4px;
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

        /* Row 2: Competitive Leaderboard (RIGHT → LEFT: movement toward left) */
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
          gap: 14px;
          padding-right: 14px;
          flex-shrink: 0;
        }

        /* Compact Ticker Pill Item */
        .lp-ticker-pill {
          height: 68px;
          width: 270px;
          flex-shrink: 0;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--color-text);
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
        }
        .lp-ticker-pill:hover {
          transform: translateY(-2px);
          border-color: var(--color-green);
          background: var(--bg-hover);
          box-shadow: 0 6px 18px rgba(22, 101, 52, 0.12);
        }
        .lp-ticker-pill.important-pill {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
        .lp-ticker-pill.important-pill:hover {
          background: rgba(239, 68, 68, 0.14);
          border-color: #dc2626;
        }

        .lp-tk-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: #fff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .lp-tk-icon-box {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(132, 204, 22, 0.12);
          color: var(--color-green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-tk-icon-box.red {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .lp-tk-info { flex: 1; min-width: 0; }
        .lp-tk-title { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text); }
        .lp-tk-sub { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lp-tk-badge { font-size: 13px; font-weight: 800; color: var(--color-gold); font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }

        /* Light Mode Specific Overrides */
        [data-theme="light"] .lp-ticker-pill {
          background: #ffffff;
          border: 1px solid #d7e2d3;
          color: #111827;
        }
        [data-theme="light"] .lp-ticker-pill:hover {
          background: #f0fdf4;
          border-color: #84cc16;
        }
        [data-theme="light"] .lp-ticker-pill.important-pill {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        [data-theme="light"] .lp-tk-title { color: #111827; }
        [data-theme="light"] .lp-tk-sub { color: #4b5563; }
        [data-theme="light"] .lp-marquee-label { color: #166534; }
      `}</style>

      <div className="container">
        <div className="lp-marquee-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 24 }}>
            <Flame size={24} className="text-gradient" /> Live From Inceptron
          </h2>
          <p className="section-subtitle" style={{ marginTop: 4, fontSize: 13 }}>
            Real-time achievement leaderboards, competitive metrics, and department updates
          </p>
        </div>

        <div className="lp-marquee-container-inner">

          {/* ── ROW 1: ACHIEVEMENT LEADERBOARD (LEFT → RIGHT) ── */}
          <div className="lp-marquee-track-container">
            <div className="lp-marquee-label">
              <Trophy size={14} /> Achievement Leaderboard
            </div>
            {leadItems.length === 0 ? (
              <div className="lp-ticker-pill" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
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

          {/* ── ROW 2: COMPETITIVE LEADERBOARD (RIGHT → LEFT) ── */}
          <div className="lp-marquee-track-container">
            <div className="lp-marquee-label">
              <Code size={14} /> Competitive Leaderboard
            </div>
            {compItems.length === 0 ? (
              <div className="lp-ticker-pill" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                No competitive platform scores yet
              </div>
            ) : (
              <div
                className="lp-marquee-track lp-marquee-right-to-left"
                style={{ animationDuration: `${durations.r2}s` }}
              >
                <div className="lp-marquee-group" ref={row2GroupRef}>
                  {compItems.map((item, i) => {
                    const name = item.name || item.student_name || 'Student';
                    const cls = item.class || 'CSE';
                    const solved = item.total_solved || (item.leetcode_easy + item.leetcode_medium + item.leetcode_hard) || 0;
                    const score = item.total_score || item.score || 0;

                    return (
                      <Link key={`comp-a-${i}`} to="/competitive-leaderboard" className="lp-ticker-pill">
                        <div className="lp-tk-icon-box">
                          <Code size={18} />
                        </div>
                        <div className="lp-tk-info">
                          <div className="lp-tk-title">#{item.rank || (i % 10) + 1} {name}</div>
                          <div className="lp-tk-sub">{cls} · {solved} Solved</div>
                        </div>
                        <span className="lp-tk-badge" style={{ color: 'var(--color-green)' }}>
                          {score} pts
                        </span>
                      </Link>
                    );
                  })}
                </div>
                {/* Clone group for seamless loop */}
                <div className="lp-marquee-group" aria-hidden="true">
                  {compItems.map((item, i) => {
                    const name = item.name || item.student_name || 'Student';
                    const cls = item.class || 'CSE';
                    const solved = item.total_solved || (item.leetcode_easy + item.leetcode_medium + item.leetcode_hard) || 0;
                    const score = item.total_score || item.score || 0;

                    return (
                      <Link key={`comp-b-${i}`} to="/competitive-leaderboard" className="lp-ticker-pill" tabIndex={-1}>
                        <div className="lp-tk-icon-box">
                          <Code size={18} />
                        </div>
                        <div className="lp-tk-info">
                          <div className="lp-tk-title">#{item.rank || (i % 10) + 1} {name}</div>
                          <div className="lp-tk-sub">{cls} · {solved} Solved</div>
                        </div>
                        <span className="lp-tk-badge" style={{ color: 'var(--color-green)' }}>
                          {score} pts
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── ROW 3: LATEST NEWS (LEFT → RIGHT) ── */}
          <div className="lp-marquee-track-container">
            <div className="lp-marquee-label">
              <Bell size={14} /> Latest News
            </div>
            {newsItems.length === 0 ? (
              <div className="lp-ticker-pill" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
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
                      <div className={`lp-tk-icon-box ${item.is_important ? 'red' : ''}`}>
                        <Bell size={18} />
                      </div>
                      <div className="lp-tk-info">
                        <div className="lp-tk-title">{item.title}</div>
                        <div className="lp-tk-sub">
                          {item.type || 'General'} · {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Live'}
                        </div>
                      </div>
                      {item.is_important && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                      <div className={`lp-tk-icon-box ${item.is_important ? 'red' : ''}`}>
                        <Bell size={18} />
                      </div>
                      <div className="lp-tk-info">
                        <div className="lp-tk-title">{item.title}</div>
                        <div className="lp-tk-sub">
                          {item.type || 'General'} · {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Live'}
                        </div>
                      </div>
                      {item.is_important && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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

