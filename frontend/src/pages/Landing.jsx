import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScoreBadge from '../components/ScoreBadge';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AnnouncementsFeed from '../components/AnnouncementsFeed';
import AchieversCarousel from '../components/ui/achievers-carousel';
import { Users, Award, Trophy, Briefcase, Star, Zap, BookOpen, Rocket, Medal, Target } from 'lucide-react';

const RANK_ICONS = [
  <Medal size={18} color="#B45309" strokeWidth={2.5} style={{ display: 'inline' }} />,
  <Medal size={18} color="#4B5563" strokeWidth={2.5} style={{ display: 'inline' }} />,
  <Medal size={18} color="#92400E" strokeWidth={2.5} style={{ display: 'inline' }} />,
  '4', '5'
];

function AnimatedNumber({ target, duration = 1400 }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  const observed = useRef(false);

  useEffect(() => {
    observed.current = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !observed.current) {
        observed.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCurrent(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{current.toLocaleString()}</span>;
}

function AchievementCarousel({ topStudents }) {
  return (
    <div className="lp-carousel" style={{ position: 'sticky', top: 76 }}>
      <AchieversCarousel achievers={topStudents} />
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState({ totalStudents: 0, totalAchievements: 0, totalHackathonWins: 0, totalInternships: 0 });
  const [topStudents, setTopStudents] = useState([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      client.get('/leaderboard/stats'),
      client.get('/leaderboard/top'),
    ]).then(([s, t]) => {
      setStats(s.data);
      setTopStudents(t.data);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="lp">
        <section className="lp-hero" style={{ padding: '40px 0', minHeight: 'calc(100vh - 84px)', display: 'flex', alignItems: 'center' }}>
          <div className="container">
            <div className="lp-hero-inner animate-fadeInUp">
              <div className="lp-hero-logo-col">
                <img src={theme === 'dark' ? '/dark.png?v=2' : '/inceptron-logo.png?v=2'} alt="Inceptron Logo" className="lp-hero-logo-img" />
              </div>
              <div className="lp-hero-text">
                <div className="lp-pill">
                  <span className="lp-pill-dot" />
                  Sri Shakthi Institute of Engineering and Technology, Coimbatore
                </div>
                <h1 className="lp-h1">
                  Inceptron<br />
                  <span className="lp-h1-accent">Achievement Hub</span>
                </h1>
                <p className="lp-sub">
                  The exclusive achievement hub for SIET CSE Department. Track your progress, discover opportunities, and climb the leaderboard.
                </p>
                <div className="lp-ctas">
                  <Link to="/login" className="btn btn-primary btn-lg" style={{ padding: '14px 28px' }}>
                    <Rocket size={18} /> Sign In to Portal →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="lp">

      {/* ── Hero ─────────────────────────────── */}
      <section className="lp-hero">
        <div className="container">
          <div className="lp-hero-inner animate-fadeInUp">
            <div className="lp-hero-logo-col">
              <img src={theme === 'dark' ? '/dark.png?v=2' : '/inceptron-logo.png?v=2'} alt="Inceptron Logo" className="lp-hero-logo-img" />
            </div>
            <div className="lp-hero-text">
              <div className="lp-pill">
                <span className="lp-pill-dot" />
                Sri Shakthi Institute of Engineering and Technology, Coimbatore
              </div>
              <h1 className="lp-h1">
                Inceptron<br />
                <span className="lp-h1-accent">Achievement Hub</span>
              </h1>
              <p className="lp-sub">
                Track hackathons, internships, projects and courses. Climb the leaderboard.
                Form your team. Build your career at <strong>SIET</strong>.
              </p>
              <div className="lp-ctas">
                <a href="http://110.172.151.102/" className="btn btn-primary btn-lg"><Rocket size={18} /> Sign In to Portal</a>
                <Link to="/leaderboard" className="btn btn-secondary btn-lg"><Trophy size={18} /> Leaderboard</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────── */}
      <section className="lp-stats">
        <div className="container lp-stats-grid">
          {[
            { v: stats.totalStudents,      l: 'Students',       i: <Users size={28} /> },
            { v: stats.totalAchievements,  l: 'Achievements',   i: <Award size={28} /> },
            { v: stats.totalHackathonWins, l: 'Hackathon Wins', i: <Trophy size={28} /> },
            { v: stats.totalInternships,   l: 'Internships',    i: <Briefcase size={28} /> },
          ].map((s, i) => (
            <div key={i} className="stat-card card animate-fadeInUp" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="stat-icon">{s.i}</div>
              <div className="stat-number"><AnimatedNumber target={s.v} /></div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Department Announcements & Notifications ── */}
      <AnnouncementsFeed />

      {/* ── Top Achievers ─────────────────────── */}
      <section className="lp-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Star size={24} className="text-gradient" /> Top Achievers</h2>
              <p className="section-subtitle">Ranked by total achievement score</p>
            </div>
            <Link to="/leaderboard" className="btn btn-secondary btn-sm">View All →</Link>
          </div>
          <div className="lp-achievers-layout">
            <AchievementCarousel topStudents={topStudents} />
            <div className="lp-podium-list">
              {topStudents.map((s, i) => (
                <Link key={s.id} to={`/profile/${s.id}`} className="lp-podium-row card card-hover animate-fadeInUp" style={{ animationDelay: `${i * 0.06}s` }}>
                  <span className="lp-pm-rank">{RANK_ICONS[i]}</span>
                  <div className="lp-pm-ava">{s.name[0]}</div>
                  <div className="lp-pm-info">
                    <div className="lp-pm-name">{s.name}</div>
                    <div className="lp-pm-meta">{s.class} · {s.achievement_count} achievements</div>
                  </div>
                  <div className="lp-pm-score">{s.score}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Scoring ───────────────────────────── */}
      <section className="lp-section">
        <div className="container">
          <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: 0 }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Award size={24} className="text-gradient" /> How Scoring Works</h2>
            <p className="section-subtitle" style={{ marginTop: 6 }}>Every achievement contributes to your department rank</p>
          </div>
          <div className="lp-score-grid">
            {[
              { icon: <Zap size={28} />, title: 'Hackathon 1st Place',   pts: '+100', color: 'var(--gold-600)' },
              { icon: <Medal size={28} />, title: 'Hackathon 2nd Place',   pts: '+60',  color: '#6B7280' },
              { icon: <Medal size={28} />, title: 'Hackathon 3rd Place',   pts: '+40',  color: '#92400E' },
              { icon: <Award size={28} />, title: 'Participation',         pts: '+10',  color: 'var(--color-green)' },
              { icon: <Briefcase size={28} />, title: 'Internship 3+ months',  pts: '+70',  color: 'var(--color-green)' },
              { icon: <Briefcase size={28} />, title: 'Internship 1–3 months', pts: '+40',  color: 'var(--color-green)' },
              { icon: <BookOpen size={28} />, title: 'Online Course',         pts: '+15',  color: '#1D4ED8' },
              { icon: <Rocket size={28} />, title: 'Project',               pts: '+25',  color: '#C2410C' },
              { icon: <Award size={28} />, title: 'Certification',         pts: '+10',  color: 'var(--gold-600)' },
            ].map((item, i) => (
              <div key={i} className="lp-score-card card animate-fadeInUp" style={{ animationDelay: `${i * 0.04}s` }}>
                <span className="lp-score-icon">{item.icon}</span>
                <div className="lp-score-title">{item.title}</div>
                <div className="lp-score-pts" style={{ color: item.color }}>{item.pts}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .lp { overflow-x: hidden; }

        /* ── Hero ── */
        .lp-hero {
          background: var(--hero-bg);
          border-bottom: 2px solid var(--border);
          padding: calc(var(--navbar-height) + 56px) 0 64px;
        }
        .lp-hero-inner {
          display: flex;
          align-items: center;
          gap: 52px;
          max-width: 1040px;
          margin: 0 auto;
        }
        .lp-hero-logo-col {
          flex: 0 0 440px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lp-hero-logo-img {
          width: 100%;
          max-width: 440px;
          height: auto;
          display: block;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.25));
          transition: transform 0.3s ease;
        }
        .lp-hero-logo-img:hover {
          transform: scale(1.04);
        }
        .lp-hero-text {
          flex: 1;
        }
        @media (max-width: 768px) {
          .lp-hero-inner { flex-direction: column; text-align: center; gap: 32px; }
          .lp-hero-logo-col { flex: 0 0 180px; }
          .lp-ctas { justify-content: center; }
        }


        .lp-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          background: var(--green-50);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-full);
          font-size: 13px; font-weight: 600;
          color: var(--color-green);
          margin-bottom: 22px;
        }
        .lp-pill-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-green);
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }
        .lp-h1 {
          font-size: clamp(32px, 5.5vw, 62px);
          font-weight: 900;
          font-family: 'Space Grotesk', sans-serif;
          line-height: 1.1;
          margin-bottom: 18px;
          color: var(--color-text);
        }
        .lp-h1-accent { color: var(--color-green); display: block; }
        .lp-sub {
          font-size: 17px; color: var(--color-text-muted);
          max-width: 520px; line-height: 1.7; margin-bottom: 36px;
        }
        .lp-sub strong { color: var(--color-text); }
        .lp-ctas { display: flex; gap: 12px; flex-wrap: wrap; }

        /* Hero ranking card */
        .lp-hero-card {
          background: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          border-top: 4px solid var(--color-green);
        }
        .lp-hero-card-label {
          font-size: 13px; font-weight: 700;
          color: var(--color-green);
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 14px;
        }
        .lp-rank-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: var(--radius-sm);
          transition: background var(--transition);
          text-decoration: none; color: inherit;
          margin-bottom: 4px;
        }
        .lp-rank-row:hover { background: var(--bg-secondary); }
        .lp-rank-num { font-size: 16px; min-width: 26px; text-align: center; }
        .lp-rank-ava {
          width: 34px; height: 34px; background: var(--color-green);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: #fff; font-size: 14px; flex-shrink: 0;
        }
        .lp-rank-info { flex: 1; min-width: 0; }
        .lp-rank-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lp-rank-meta { font-size: 11px; color: var(--color-text-muted); }
        .lp-rank-score { font-size: 14px; font-weight: 800; color: var(--color-green); font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }
        .lp-rank-score span { font-size: 10px; font-weight: 500; color: var(--color-text-faint); }

        /* ── Stats ── */
        .lp-stats { padding: 40px 0; background: var(--bg-primary); border-bottom: 2px solid var(--border); }
        .lp-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 768px) { .lp-stats-grid { grid-template-columns: repeat(2, 1fr); } }

        /* ── Sections ── */
        .lp-section { padding: 72px 0; }
        .lp-section-alt { background: var(--bg-secondary); border-top: 2px solid var(--border); border-bottom: 2px solid var(--border); }

        /* ── Top Achievers ── */
        .lp-achievers-layout { display: grid; grid-template-columns: 280px 1fr; gap: 28px; align-items: start; }
        @media (max-width: 900px) { .lp-achievers-layout { grid-template-columns: 1fr; } }

        /* Carousel */
        .lp-carousel { position: sticky; top: 76px; }
        .lp-carousel-card {
          background: var(--bg-secondary);
          border: 2px solid var(--border);
          border-top: 4px solid var(--color-green);
          border-radius: var(--radius-lg);
          padding: 28px 20px;
          text-align: center;
        }
        .lp-carousel-rank { font-size: 42px; font-weight: 900; font-family: 'Space Grotesk', sans-serif; color: var(--color-green); line-height: 1; margin-bottom: 14px; }
        .lp-carousel-avatar {
          width: 72px; height: 72px; background: var(--color-green);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 30px; font-weight: 800; color: #fff; margin: 0 auto 12px;
        }
        .lp-carousel-name { font-size: 17px; font-weight: 700; margin-bottom: 3px; }
        .lp-carousel-meta { font-size: 13px; color: var(--color-text-muted); margin-bottom: 10px; }
        .lp-carousel-ach {
          font-size: 12px; color: var(--color-green); margin-bottom: 14px;
          padding: 7px 10px; background: var(--green-50);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
        }
        .lp-dots { display: flex; justify-content: center; gap: 6px; margin-top: 14px; }
        .lp-dot { width: 8px; height: 8px; background: var(--border); border-radius: 50%; border: none; cursor: pointer; transition: all var(--transition); }
        .lp-dot.active { background: var(--color-green); width: 20px; border-radius: 4px; }

        /* Podium list */
        .lp-podium-list { display: flex; flex-direction: column; gap: 8px; }
        .lp-podium-row { padding: 14px 18px; display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; }
        .lp-pm-rank { font-size: 20px; flex-shrink: 0; width: 30px; text-align: center; }
        .lp-pm-ava { width: 40px; height: 40px; background: var(--color-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 16px; flex-shrink: 0; }
        .lp-pm-info { flex: 1; min-width: 0; }
        .lp-pm-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lp-pm-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 1px; }
        .lp-pm-score { font-size: 18px; font-weight: 900; color: var(--color-green); font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }

        [data-theme="light"] .lp-carousel-card { background: #ffffff; border: 2px solid #d7e2d3; border-top: 4px solid #84cc16; }
        [data-theme="light"] .lp-carousel-name { color: #111827; }
        [data-theme="light"] .lp-carousel-meta { color: #4b5563; }
        [data-theme="light"] .lp-carousel-rank { color: #166534; }
        [data-theme="light"] .lp-podium-row { background: #ffffff; border: 1px solid #d7e2d3; color: #111827; }
        [data-theme="light"] .lp-podium-row:hover { background: #f0fdf4 !important; border-color: #84cc16; box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08); }
        [data-theme="light"] .lp-podium-row.active, [data-theme="light"] .lp-podium-row.selected { background: #ecfdf5 !important; border-color: #84cc16; }
        [data-theme="light"] .lp-pm-name { color: #111827 !important; }
        [data-theme="light"] .lp-pm-meta { color: #4b5563 !important; }
        [data-theme="light"] .lp-pm-score { color: #166534 !important; }

        /* ── Scoring ── */
        .lp-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 28px; }
        @media (max-width: 768px) { .lp-score-grid { grid-template-columns: 1fr 1fr; } }
        .lp-score-card { padding: 20px 16px; text-align: center; border-left: 4px solid var(--border); }
        .lp-score-icon { font-size: 28px; display: block; margin-bottom: 8px; }
        .lp-score-title { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; font-weight: 500; }
        .lp-score-pts { font-size: 24px; font-weight: 900; font-family: 'Space Grotesk', sans-serif; }

      `}</style>
    </div>
  );
}
