import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScoreBadge from '../components/ScoreBadge';
import { useAuth } from '../contexts/AuthContext';
import { Users, Award, Trophy, Briefcase, UsersRound, Star, Zap, BookOpen, Rocket, Medal, Target } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

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
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!topStudents.length) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % topStudents.length), 4000);
    return () => clearInterval(id);
  }, [topStudents.length]);

  if (!topStudents.length) return null;
  const student = topStudents[current];

  return (
    <div className="lp-carousel">
      <div className="lp-carousel-card animate-fadeIn" key={current}>
        <div className="lp-carousel-rank">#{current + 1}</div>
        <div className="lp-carousel-avatar">{student.name[0]}</div>
        <div className="lp-carousel-name">{student.name}</div>
        <div className="lp-carousel-meta">{student.class} · Year {student.year}</div>
        {student.top_achievement && (
          <div className="lp-carousel-ach">{student.top_achievement}</div>
        )}
        <ScoreBadge score={student.score} size="md" />
        <Link to={`/profile/${student.id}`} className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
          View Profile →
        </Link>
      </div>
      <div className="lp-dots">
        {topStudents.map((_, i) => (
          <button key={i} className={`lp-dot ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)} />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, totalAchievements: 0, totalHackathonWins: 0, totalInternships: 0, activeTeams: 0 });
  const [topStudents, setTopStudents] = useState([]);
  const [updates, setUpdates] = useState({ hackathons: [], jobs: [] });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      client.get('/leaderboard/stats'),
      client.get('/leaderboard/top'),
      client.get('/updates'),
    ]).then(([s, t, u]) => {
      setStats(s.data);
      setTopStudents(t.data);
      setUpdates(u.data);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="lp">
        <section className="lp-hero" style={{ padding: '40px 0', minHeight: 'calc(100vh - 84px)', display: 'flex', alignItems: 'center' }}>
          <div className="container" style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <img src="/inceptron-logo.png" alt="Inceptron Logo" style={{ height: '120px', objectFit: 'contain', background: '#fff', borderRadius: '12px', padding: '8px' }} />
            </div>
            <div className="lp-pill" style={{ margin: '0 auto 24px' }}>
              <span className="lp-pill-dot" />
              Sri Shakthi Institute of Engineering and Technology, Coimbatore
            </div>
            <h1 className="lp-h1" style={{ marginBottom: '16px', fontSize: 'clamp(36px, 5vw, 56px)' }}>
              Welcome to <br/><span className="lp-h1-accent">Inceptron Hub</span>
            </h1>
            <p className="lp-sub" style={{ margin: '0 auto 40px', fontSize: '18px' }}>
              The exclusive achievement hub for SIET CSE Department. Track your progress, discover opportunities, and climb the leaderboard.
            </p>
            <a href="http://110.172.151.102/" className="btn btn-primary btn-lg" style={{ padding: '16px 32px', fontSize: '16px' }}>Sign In to Portal →</a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="lp">

      {/* ── Hero ─────────────────────────────── */}
      <section className="lp-hero">
        <div className="container lp-hero-inner">
          <div className="lp-hero-text animate-fadeInUp">
            <div className="lp-pill">
              <span className="lp-pill-dot" />
              Sri Shakthi Institute of Engineering and Technology, Coimbatore
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '18px' }}>
              <img src="/inceptron-logo.png" alt="Inceptron Logo" style={{ height: '90px', objectFit: 'contain', background: '#fff', borderRadius: '12px', padding: '8px' }} />
              <h1 className="lp-h1" style={{ marginBottom: 0 }}>
                Inceptron<br />
                <span className="lp-h1-accent">Achievement Hub</span>
              </h1>
            </div>
            <p className="lp-sub">
              Track hackathons, internships, projects and courses. Climb the leaderboard.
              Form your team. Build your career at <strong>SIET</strong>.
            </p>
            <div className="lp-ctas">
              <a href="http://110.172.151.102/" className="btn btn-primary btn-lg"><Rocket size={18} /> Sign In to Portal</a>
              <Link to="/leaderboard" className="btn btn-secondary btn-lg"><Trophy size={18} /> Leaderboard</Link>
            </div>
          </div>

          <div className="lp-hero-card animate-fadeInUp delay-2">
            <div className="lp-hero-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={14} /> Top 5 Achievers</div>
            {topStudents.map((s, i) => (
              <Link to={`/profile/${s.id}`} key={s.id} className="lp-rank-row">
                <span className="lp-rank-num" style={{ display: 'flex', justifyContent: 'center' }}>{RANK_ICONS[i]}</span>
                <div className="lp-rank-ava">{s.name[0]}</div>
                <div className="lp-rank-info">
                  <div className="lp-rank-name">{s.name}</div>
                  <div className="lp-rank-meta">{s.class}</div>
                </div>
                <div className="lp-rank-score">{s.score} <span>pts</span></div>
              </Link>
            ))}
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
            { v: stats.activeTeams,        l: 'Active Teams',   i: <UsersRound size={28} /> },
          ].map((s, i) => (
            <div key={i} className="stat-card card animate-fadeInUp" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="stat-icon">{s.i}</div>
              <div className="stat-number"><AnimatedNumber target={s.v} /></div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

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

      {/* ── Live Opportunities ────────────────── */}
      <section className="lp-section lp-section-alt">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={24} className="text-gradient" /> Live Opportunities</h2>
              <p className="section-subtitle">Latest hackathons and jobs — updated regularly</p>
            </div>
            <Link to="/updates" className="btn btn-primary btn-sm">See All →</Link>
          </div>
          <div className="lp-opp-grid">
            <div>
              <div className="lp-opp-cat" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={16} /> Hackathons</div>
              {updates.hackathons?.slice(0, 3).map(h => (
                <div key={h.id} className="lp-opp-row card">
                  <span className="lp-opp-icon"><CompanyLogo logo={h.logo} size={22} /></span>
                  <div className="lp-opp-info">
                    <div className="lp-opp-title">{h.title}</div>
                    <div className="lp-opp-meta">{h.organizer} · {h.prize}</div>
                  </div>
                  <a href={h.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>Apply →</a>
                </div>
              ))}
            </div>
            <div>
              <div className="lp-opp-cat" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={16} /> Jobs</div>
              {updates.jobs?.slice(0, 3).map(j => (
                <div key={j.id} className="lp-opp-row card">
                  <span className="lp-opp-icon"><CompanyLogo logo={j.logo} size={22} /></span>
                  <div className="lp-opp-info">
                    <div className="lp-opp-title">{j.title}</div>
                    <div className="lp-opp-meta">{j.company} · {j.package}</div>
                  </div>
                  <a href={j.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>View →</a>
                </div>
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

      {/* ── CTA ───────────────────────────────── */}
      <section className="lp-cta">
        <div className="container lp-cta-inner">
          <div>
            <h2 className="lp-cta-title">Ready to make your mark?</h2>
            <p className="lp-cta-sub">Join the SIET Inceptron Achievement Portal and start building your profile today.</p>
          </div>
          <div className="lp-cta-btns">
            <a href="http://110.172.151.102/" className="btn btn-primary btn-lg">Sign Into Your Profile →</a>
            <Link to="/updates" className="btn btn-secondary btn-lg">Browse Opportunities</Link>
          </div>
        </div>
      </section>

      <style>{`
        .lp { overflow-x: hidden; }

        /* ── Hero ── */
        .lp-hero {
          background: #FFFFFF;
          border-bottom: 2px solid var(--border);
          padding: calc(var(--navbar-height) + 48px) 0 56px;
        }
        .lp-hero-inner {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 900px) { .lp-hero-inner { grid-template-columns: 1fr; } }

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
        .lp-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
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

        /* ── Opportunities ── */
        .lp-opp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        @media (max-width: 768px) { .lp-opp-grid { grid-template-columns: 1fr; } }
        .lp-opp-cat { font-size: 14px; font-weight: 700; color: var(--color-text); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
        .lp-opp-row { padding: 13px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 8px; transition: border-color var(--transition); }
        .lp-opp-row:hover { border-color: var(--color-green); }
        .lp-opp-icon { font-size: 22px; flex-shrink: 0; }
        .lp-opp-info { flex: 1; min-width: 0; }
        .lp-opp-title { font-size: 13px; font-weight: 600; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lp-opp-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

        /* ── Scoring ── */
        .lp-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 28px; }
        @media (max-width: 768px) { .lp-score-grid { grid-template-columns: 1fr 1fr; } }
        .lp-score-card { padding: 20px 16px; text-align: center; border-left: 4px solid var(--border); }
        .lp-score-icon { font-size: 28px; display: block; margin-bottom: 8px; }
        .lp-score-title { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; font-weight: 500; }
        .lp-score-pts { font-size: 24px; font-weight: 900; font-family: 'Space Grotesk', sans-serif; }

        /* ── CTA ── */
        .lp-cta {
          background: var(--color-green);
          padding: 60px 0;
        }
        .lp-cta-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 32px; flex-wrap: wrap;
        }
        .lp-cta-title {
          font-size: clamp(22px, 3.5vw, 36px); font-weight: 900;
          font-family: 'Space Grotesk', sans-serif;
          color: #fff; margin-bottom: 8px;
        }
        .lp-cta-sub {
          font-size: 16px; color: rgba(255,255,255,0.7); max-width: 480px;
        }
        .lp-cta-btns { display: flex; gap: 12px; flex-wrap: wrap; }
        .lp-cta .btn-primary {
          background: var(--color-gold);
          border-color: var(--gold-600);
          color: var(--green-900);
        }
        .lp-cta .btn-primary:hover { background: var(--gold-600); color: #fff; }
        .lp-cta .btn-secondary {
          background: transparent;
          color: #fff;
          border-color: rgba(255,255,255,0.5);
        }
        .lp-cta .btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: #fff;
        }
      `}</style>
    </div>
  );
}
