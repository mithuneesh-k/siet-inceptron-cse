import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import SwitchMode from '../components/ui/switch-mode';
import { 
  Trophy, Zap, Award, Sparkles, Newspaper, GraduationCap, 
  ExternalLink, Rocket, Users, BookOpen, Bell, Tag, ChevronRight, 
  Laptop, ArrowRight, ShieldCheck, Crown, Star, Flame, Calendar,
  Trash2, Plus
} from 'lucide-react';

export default function Showcase() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isFacultyOrAdmin = Boolean(user && (user.role === 'faculty' || user.role === 'admin' || user.is_admin));

  // Active Category Filter for Updates & News
  const [activeCategory, setActiveCategory] = useState('all');

  // Dynamic Data States
  const [stats, setStats] = useState({
    activeStudents: 120,
    projectsBuilt: 35,
    achievementsCount: 180,
    eventsCount: 25
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch Public Safe Showcase Data
  useEffect(() => {
    let isMounted = true;
    const fetchPublicShowcaseData = async () => {
      try {
        const [statsRes, topRes, newsRes, achRes] = await Promise.allSettled([
          fetch('/api/leaderboard/stats'),
          fetch('/api/leaderboard/top'),
          fetch('/api/announcements'),
          fetch('/api/achievements/public').then(r => r.ok ? r.json() : fetch('/api/achievements').then(r => r.json()))
        ]);

        if (isMounted) {
          if (statsRes.status === 'fulfilled' && statsRes.value?.ok) {
            const statsData = await statsRes.value.json();
            setStats(prev => ({
              ...prev,
              activeStudents: statsData.totalStudents || statsData.activeStudents || 120,
              achievementsCount: statsData.totalAchievements || statsData.verifiedAchievements || 180,
              projectsBuilt: statsData.totalProjects || 35
            }));
          }

          if (topRes.status === 'fulfilled' && topRes.value?.ok) {
            const topData = await topRes.value.json();
            if (Array.isArray(topData) && topData.length > 0) {
              // Ensure ONLY public-safe fields are exposed
              const safeTop = topData.slice(0, 5).map((student, idx) => ({
                id: student.user_id || `student-${idx}`,
                name: student.name || student.displayName || 'Anonymous Student',
                score: student.score || student.points || (2400 - idx * 200),
                rank: idx + 1,
                class: student.class || student.year || 'CSE',
                avatar_url: student.avatar_url || null
              }));
              setLeaderboard(safeTop);
            }
          }

          if (newsRes.status === 'fulfilled' && newsRes.value?.ok) {
            const newsData = await newsRes.value.json();
            if (newsData.announcements && newsData.announcements.length > 0) {
              setAnnouncements(newsData.announcements);
            }
          }

          if (achRes.status === 'fulfilled' && achRes.value) {
            const achData = achRes.value;
            const items = achData.achievements || achData.data || (Array.isArray(achData) ? achData : []);
            if (items.length > 0) {
              setAchievements(items);
            }
          }
        }
      } catch (err) {
        console.warn('Showcase public fetch notice:', err);
      } finally {
        if (isMounted) setDataLoading(false);
      }
    };

    fetchPublicShowcaseData();
    return () => { isMounted = false; };
  }, []);

  // Safe Fallback Leaderboard if database is loading or empty
  const fallbackLeaderboard = [
    { id: 'lb-1', name: 'Aravind Kumar', score: 2450, rank: 1, class: 'Final Year CSE', avatar_url: null },
    { id: 'lb-2', name: 'Kavya S', score: 2180, rank: 2, class: '3rd Year CSE', avatar_url: null },
    { id: 'lb-3', name: 'Mithun R', score: 2050, rank: 3, class: 'Final Year CSE', avatar_url: null },
    { id: 'lb-4', name: 'Priya Dharshini', score: 1920, rank: 4, class: '3rd Year CSE', avatar_url: null },
    { id: 'lb-5', name: 'Sanjay V', score: 1840, rank: 5, class: '2nd Year CSE', avatar_url: null }
  ];

  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : fallbackLeaderboard;
  const top3Podium = [
    displayLeaderboard[1] || fallbackLeaderboard[1], // Rank 2 (Silver - Left)
    displayLeaderboard[0] || fallbackLeaderboard[0], // Rank 1 (Gold - Center)
    displayLeaderboard[2] || fallbackLeaderboard[2]  // Rank 3 (Bronze - Right)
  ];
  const remainingTop = displayLeaderboard.slice(3, 5);

  // Fallback news items
  const fallbackNews = [
    {
      id: 'news-1',
      title: '36-Hour National Level Hackathon - INCEPTRON 2026',
      type: 'Hackathon',
      message: 'The Department of CSE is organizing a 36-Hour Hackathon featuring AI, Web3, and Cloud tracks with cash prizes worth ₹1,50,000.',
      created_at: '2026-10-01'
    },
    {
      id: 'news-2',
      title: 'SIET CSE Team Secures 1st Rank in Smart India Hackathon',
      type: 'Achievement',
      message: 'Hearty congratulations to team "Inceptron AI" for winning 1st position in the National Smart India Hackathon finals.',
      created_at: '2026-09-28'
    },
    {
      id: 'news-3',
      title: 'Guest Lecture on LLM Fine-Tuning & Generative AI Systems',
      type: 'Workshop',
      message: 'An interactive hands-on workshop by Senior AI Engineers from Industry conducted for 3rd and 4th year CSE students.',
      created_at: '2026-09-22'
    },
    {
      id: 'news-4',
      title: 'IEEE International Conference Research Publications',
      type: 'Research',
      message: 'Faculty and student teams successfully published 8 peer-reviewed research papers in IEEE Xplore covering Computer Vision and AI.',
      created_at: '2026-09-15'
    }
  ];

  // Featured Projects Showcase Data
  const featuredProjects = [
    {
      id: 'proj-1',
      title: 'ORBITOPS - Space Operations Manager',
      category: 'Distributed Systems',
      description: 'Real-time satellite orbit tracking, telemetry analysis, and mission control dashboard built for aerospace research.',
      tech: ['React', 'Node.js', 'PostgreSQL', 'Satellite.js'],
      badge: 'FEATURED'
    },
    {
      id: 'proj-2',
      title: 'INCEPTRON AI Diagnostics',
      category: 'Artificial Intelligence',
      description: 'Automated medical image diagnostics powered by deep learning models for rapid early-stage disease detection.',
      tech: ['Python', 'PyTorch', 'FastAPI', 'OpenCV'],
      badge: 'AWARD WINNER'
    },
    {
      id: 'proj-3',
      title: 'EDGE VISION - Real-Time Analytics',
      category: 'Computer Vision',
      description: 'Low-latency edge AI system for automated campus traffic monitoring and safety hazard detection.',
      tech: ['C++', 'TensorRT', 'OpenCV', 'MQTT'],
      badge: 'RESEARCH'
    },
    {
      id: 'proj-4',
      title: 'SIET CHAIN - Decentralized Credentials',
      category: 'Web3 & Blockchain',
      description: 'Tamper-proof blockchain credential verification system for instant academic certificate validation.',
      tech: ['Solidity', 'Ethereum', 'Ethers.js', 'React'],
      badge: 'INNOVATION'
    }
  ];

  // Active Leaderboard Tab State ('inceptron' | 'competitive')
  const [leaderboardTab, setLeaderboardTab] = useState('inceptron');

  // Competitive Leaderboard Data
  const competitiveLeaderboard = [
    { id: 'comp-1', name: 'Aravind Kumar', rank: 1, class: 'Final Year CSE', rating: '2140 LeetCode • Knight', solved: '1,450+ Solved', platform: 'LeetCode / Codeforces' },
    { id: 'comp-2', name: 'Mithun R', rank: 2, class: 'Final Year CSE', rating: '1980 Codeforces • Specialist', solved: '1,280+ Solved', platform: 'Codeforces / LeetCode' },
    { id: 'comp-3', name: 'Kavya S', rank: 3, class: '3rd Year CSE', rating: '4-Star CodeChef • Candidate Master', solved: '1,120+ Solved', platform: 'CodeChef / LeetCode' },
    { id: 'comp-4', name: 'Priya Dharshini', rank: 4, class: '3rd Year CSE', rating: '1850 LeetCode • Knight', solved: '980+ Solved', platform: 'LeetCode' },
    { id: 'comp-5', name: 'Sanjay V', rank: 5, class: '2nd Year CSE', rating: '1720 Codeforces', solved: '850+ Solved', platform: 'Codeforces' }
  ];

  // Faculty / Admin Delete Action for Showcase Posts
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this showcase post?')) return;
    try {
      await fetch(`/api/announcements/${postId}`, { method: 'DELETE' });
      setAnnouncements(prev => prev.filter(a => a.id !== postId));
    } catch (err) {
      console.warn('Failed to delete post:', err);
    }
  };

  const newsList = announcements.length > 0 ? announcements : fallbackNews;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="showcase-page">
      
      {/* ─── STICKY MINIMAL NAVBAR ─── */}
      <nav className="showcase-nav">
        <div className="showcase-nav-inner">
          <div className="showcase-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="showcase-brand-logo-wrap">
              <img
                src={theme === 'dark' ? '/dark.png?v=2' : '/inceptron-logo.png?v=2'}
                alt="SIET Inceptron Logo"
                className="showcase-brand-logo"
              />
            </div>
            <div className="showcase-brand-text">
              <span className="showcase-brand-title">SIET INCEPTRON</span>
              <span className="showcase-brand-subtitle">Department of Computer Science & Engineering</span>
            </div>
          </div>

          <div className="showcase-nav-links">
            <button type="button" onClick={() => scrollToSection('leaderboard')}>Leaderboard</button>
            <button type="button" onClick={() => scrollToSection('achievements')}>Achievements</button>
            <button type="button" onClick={() => scrollToSection('projects')}>Projects</button>
            <button type="button" onClick={() => scrollToSection('news')}>News & Events</button>
          </div>

          <div className="showcase-nav-right">
            <SwitchMode width={68} height={34} />
            <button
              type="button"
              className="showcase-portal-btn"
              onClick={() => navigate('/login')}
            >
              <span>Enter Portal</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION WITH BACKGROUND 3D CUBE VIDEO & CENTERED TEXT ─── */}
      <section className="showcase-hero">
        {/* Background 3D Rotating Cube Video Layer */}
        <div className="showcase-hero-video-bg-layer">
          <video
            key="dark-hero-video"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            className={`showcase-video-bg ${theme === 'dark' ? 'active' : ''}`}
          >
            <source src="/videos/dark.mp4" type="video/mp4" />
            <source src="/videos/darkmain.mp4" type="video/mp4" />
            <source src="/videos/DARK MAIN.mp4" type="video/mp4" />
          </video>
          <video
            key="light-hero-video"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            className={`showcase-video-bg ${theme === 'light' ? 'active' : ''}`}
          >
            <source src="/videos/light.mp4" type="video/mp4" />
            <source src="/videos/light (2).mp4" type="video/mp4" />
            <source src="/videos/lightmain.mp4" type="video/mp4" />
          </video>
          <div className="showcase-hero-overlay-gradient" />
        </div>

        <div className="showcase-hero-centered-content">
          <div className="showcase-hero-pill">
            <span className="hero-pill-dot" />
            <span>Sri Shakthi Institute of Engineering and Technology, Coimbatore</span>
          </div>

          <h1 className="showcase-hero-title">
            Built by Students. <br />
            <span className="hero-highlight-green">Driven by Curiosity.</span> <br />
            Defined by Achievement.
          </h1>

          <p className="showcase-hero-desc">
            Where ideas become working projects, skills turn into verified milestones, and CSE students continuously climb to the top.
          </p>

          <div className="showcase-hero-actions">
            <button
              type="button"
              className="showcase-primary-btn"
              onClick={() => scrollToSection('leaderboard')}
            >
              <span>Explore Inceptron</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── PLATFORM STATISTICS SECTION ─── */}
      <section className="showcase-stats-section">
        <div className="showcase-stats-container">
          <div className="showcase-stat-box">
            <div className="stat-icon-wrap stat-icon-green">
              <Users size={22} />
            </div>
            <div className="stat-value">{stats.activeStudents}+</div>
            <div className="stat-label">Active Students</div>
            <div className="stat-sub">Computer Science & Eng.</div>
          </div>

          <div className="showcase-stat-box">
            <div className="stat-icon-wrap stat-icon-cyan">
              <Laptop size={22} />
            </div>
            <div className="stat-value">{stats.projectsBuilt}+</div>
            <div className="stat-label">Projects Built</div>
            <div className="stat-sub">AI, Web3 & Cloud Systems</div>
          </div>

          <div className="showcase-stat-box">
            <div className="stat-icon-wrap stat-icon-amber">
              <Trophy size={22} />
            </div>
            <div className="stat-value">{stats.achievementsCount}+</div>
            <div className="stat-label">Verified Achievements</div>
            <div className="stat-sub">Hackathons, Competitions & Publications</div>
          </div>

          <div className="showcase-stat-box">
            <div className="stat-icon-wrap stat-icon-purple">
              <Zap size={22} />
            </div>
            <div className="stat-value">{stats.eventsCount}+</div>
            <div className="stat-label">Technical Events</div>
            <div className="stat-sub">Workshops & Hackathons</div>
          </div>
        </div>
      </section>

      {/* ─── STUDENT LEADERBOARD SECTION WITH COMPETITIVE TAB ─── */}
      <section id="leaderboard" className="showcase-section">
        <div className="showcase-section-header text-center">
          <div className="section-pill-tag">
            <Crown size={14} />
            <span>HALL OF FAME</span>
          </div>
          <h2 className="section-title">Students Making Their Mark</h2>
          <p className="section-subtitle">
            Recognizing consistency, project execution, and competitive technical growth.
          </p>

          {/* LEADERBOARD TOGGLE TABS (Inceptron Leaderboard vs Competitive Leaderboard) */}
          <div className="showcase-lb-tabs">
            <button
              type="button"
              className={`lb-tab-btn ${leaderboardTab === 'inceptron' ? 'active' : ''}`}
              onClick={() => setLeaderboardTab('inceptron')}
            >
              <Trophy size={16} />
              <span>Inceptron Leaderboard</span>
            </button>

            <button
              type="button"
              className={`lb-tab-btn ${leaderboardTab === 'competitive' ? 'active' : ''}`}
              onClick={() => setLeaderboardTab('competitive')}
            >
              <Zap size={16} />
              <span>Competitive Coding Leaderboard</span>
            </button>
          </div>
        </div>

        {/* INCEPTRON LEADERBOARD TAB VIEW */}
        {leaderboardTab === 'inceptron' && (
          <>
            {/* TOP 3 PODIUM */}
            <div className="podium-container">
              {top3Podium.map((student, idx) => {
                const isRank1 = student.rank === 1;
                const isRank2 = student.rank === 2;
                const isRank3 = student.rank === 3;

                return (
                  <div
                    key={student.id}
                    className={`podium-card ${isRank1 ? 'podium-rank-1' : isRank2 ? 'podium-rank-2' : 'podium-rank-3'}`}
                  >
                    <div className="podium-crown-badge">
                      {isRank1 && <span className="rank-emoji">🥇</span>}
                      {isRank2 && <span className="rank-emoji">🥈</span>}
                      {isRank3 && <span className="rank-emoji">🥉</span>}
                    </div>

                    <div className="podium-avatar">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt={student.name} />
                      ) : (
                        <span>{student.name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    <h3 className="podium-name">{student.name}</h3>
                    <span className="podium-class">{student.class}</span>

                    <div className="podium-score-pill">
                      <Flame size={15} className="score-flame-icon" />
                      <span>{student.score.toLocaleString()} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RANKS 4 & 5 PREVIEW CARDS */}
            {remainingTop.length > 0 && (
              <div className="leaderboard-preview-list">
                {remainingTop.map((student) => (
                  <div key={student.id} className="lb-preview-row">
                    <div className="lb-rank-num">0{student.rank}</div>
                    <div className="lb-user-info">
                      <span className="lb-user-name">{student.name}</span>
                      <span className="lb-user-class">{student.class}</span>
                    </div>
                    <div className="lb-user-score">
                      <span>{student.score.toLocaleString()} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* COMPETITIVE LEADERBOARD TAB VIEW */}
        {leaderboardTab === 'competitive' && (
          <div className="competitive-lb-container">
            <div className="leaderboard-preview-list">
              {competitiveLeaderboard.map((student) => (
                <div key={student.id} className="comp-lb-preview-row">
                  <div className="lb-rank-num">
                    {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `0${student.rank}`}
                  </div>
                  <div className="lb-user-info">
                    <span className="lb-user-name">{student.name}</span>
                    <span className="lb-user-class">{student.rating}</span>
                  </div>
                  <div className="comp-solved-pill">
                    <span>{student.solved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── ACHIEVEMENTS SHOWCASE (REQUIRED) ─── */}
      <section id="achievements" className="showcase-section alt-bg">
        <div className="showcase-section-header">
          <div className="section-pill-tag tag-amber">
            <Trophy size={14} />
            <span>ACHIEVEMENT WALL</span>
          </div>
          <h2 className="section-title">Celebrating Milestones Earned Beyond Classroom</h2>
          <p className="section-subtitle">
            From national hackathon championships to peer-reviewed IEEE publications.
          </p>
        </div>

        {/* FEATURED MAJOR ACHIEVEMENT CARD */}
        <div className="featured-achievement-card">
          <div className="featured-ach-badge">
            <Award size={16} />
            <span>FEATURED HIGHLIGHT</span>
          </div>
          <h3 className="featured-ach-title">Smart India Hackathon 2025 - Grand Champion Winner</h3>
          <p className="featured-ach-desc">
            Team Inceptron represented SIET CSE among 1,200+ engineering institutions nationwide, building an AI-powered diagnostic tool for automated medical scans.
          </p>
          <div className="featured-ach-meta">
            <span>🏆 National 1st Rank</span>
            <span>•</span>
            <span>₹1,50,000 Cash Prize</span>
            <span>•</span>
            <span>September 2025</span>
          </div>
        </div>

        {/* ACHIEVEMENTS GRID */}
        <div className="achievements-grid">
          <div className="ach-card">
            <div className="ach-card-header">
              <span className="ach-tag tag-green">Competitive Coding</span>
              <span className="ach-pts">+500 pts</span>
            </div>
            <h4 className="ach-title">50,000+ Algorithmic Problems Solved</h4>
            <p className="ach-desc">CSE Department coding club members crossed 50k solved challenges on LeetCode & CodeChef.</p>
            <span className="ach-author">CSE Coding Club</span>
          </div>

          <div className="ach-card">
            <div className="ach-card-header">
              <span className="ach-tag tag-cyan">Global Contest</span>
              <span className="ach-pts">+450 pts</span>
            </div>
            <h4 className="ach-title">TCS CodeVita Top 50 Regional Finalists</h4>
            <p className="ach-desc">12 final-year CSE students qualified in the top percentile of TCS CodeVita international coding contest.</p>
            <span className="ach-author">Batch of 2026</span>
          </div>

          <div className="ach-card">
            <div className="ach-card-header">
              <span className="ach-tag tag-purple">Research Publication</span>
              <span className="ach-pts">+380 pts</span>
            </div>
            <h4 className="ach-title">Best IEEE Research Paper Award</h4>
            <p className="ach-desc">Awarded Best Technical Paper in AI & Cybersecurity at the International Conference on Emerging Tech.</p>
            <span className="ach-author">Faculty & Student Research Team</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURED PROJECTS SECTION (REQUIRED) ─── */}
      <section id="projects" className="showcase-section">
        <div className="showcase-section-header">
          <div className="section-pill-tag tag-cyan">
            <Laptop size={14} />
            <span>BUILT AT INCEPTRON</span>
          </div>
          <h2 className="section-title">Ideas Transformed into Working Technology</h2>
          <p className="section-subtitle">
            Explore production-grade applications, AI systems, and software engineering projects created by students.
          </p>
        </div>

        <div className="projects-grid">
          {featuredProjects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-card-top">
                <span className="project-category">{project.category}</span>
                <span className="project-badge">{project.badge}</span>
              </div>
              <h3 className="project-title">{project.title}</h3>
              <p className="project-desc">{project.description}</p>
              
              <div className="project-tech-chips">
                {project.tech.map((t, idx) => (
                  <span key={idx} className="tech-chip">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── NEWS & EVENTS SECTION ─── */}
      <section id="news" className="showcase-section alt-bg">
        <div className="showcase-section-header" style={{ position: 'relative' }}>
          <div className="section-pill-tag">
            <Bell size={14} />
            <span>WHAT'S HAPPENING</span>
          </div>
          <h2 className="section-title">Latest Department News & Activities</h2>
          <p className="section-subtitle">
            Stay updated with hackathons, workshops, guest lectures, and department announcements.
          </p>

          {isFacultyOrAdmin && (
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="showcase-primary-btn"
                onClick={() => navigate('/admin?tab=notify')}
                style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={15} />
                <span>Post Department News & Showcase</span>
              </button>
            </div>
          )}
        </div>

        <div className="news-grid">
          {newsList.map((item) => (
            <div key={item.id} className="news-card" style={{ position: 'relative' }}>
              <div className="news-card-header">
                <span className="news-tag">{item.type || 'Update'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="news-date">{item.created_at?.split('T')[0] || 'Recent'}</span>
                  {isFacultyOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(item.id)}
                      title="Delete Showcase Post"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyCenter: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="news-title">{item.title}</h3>
              <p className="news-message">{item.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL PORTAL CTA ─── */}
      <section className="showcase-cta-section">
        <div className="showcase-cta-box">
          <h2 className="cta-heading">Ready to Enter INCEPTRON?</h2>
          <p className="cta-sub">
            Students, faculty and administrators can continue to the portal to access the complete platform.
          </p>
          <button
            type="button"
            className="cta-enter-portal-btn"
            onClick={() => navigate('/login')}
          >
            <span>Enter Student Portal</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="showcase-footer">
        <div className="showcase-footer-inner">
          <p>© {new Date().getFullYear()} Sri Shakthi Institute of Engineering and Technology (SIET). Department of Computer Science & Engineering.</p>
        </div>
      </footer>

      {/* ─── SHOWCASE COMPONENT STYLES ─── */}
      <style>{`
        :root, [data-theme="dark"] {
          --sc-bg: #05070b;
          --sc-card-bg: rgba(17, 24, 39, 0.75);
          --sc-card-alt: rgba(15, 23, 42, 0.85);
          --sc-border: rgba(255, 255, 255, 0.12);
          --sc-text-main: #ffffff;
          --sc-text-sub: #94a3b8;
        }

        [data-theme="light"] {
          --sc-bg: #f8fafc;
          --sc-card-bg: rgba(255, 255, 255, 0.9);
          --sc-card-alt: rgba(241, 245, 249, 0.85);
          --sc-border: rgba(0, 0, 0, 0.1);
          --sc-text-main: #0f172a;
          --sc-text-sub: #475569;
        }

        .showcase-page {
          min-height: 100vh;
          background: var(--sc-bg);
          color: var(--sc-text-main);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
        }

        /* STICKY NAVBAR */
        .showcase-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--sc-card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--sc-border);
          padding: 14px 28px;
        }

        .showcase-nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .showcase-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .showcase-brand-logo-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--sc-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .showcase-brand-logo {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .showcase-brand-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16.5px;
          font-weight: 900;
          letter-spacing: 0.04em;
        }

        .showcase-brand-subtitle {
          display: block;
          font-size: 11px;
          color: var(--sc-text-sub);
        }

        .showcase-nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        @media (max-width: 850px) {
          .showcase-nav-links { display: none; }
        }

        .showcase-nav-links button {
          background: none;
          border: none;
          color: var(--sc-text-sub);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
        }

        .showcase-nav-links button:hover {
          color: var(--sc-text-main);
        }

        .showcase-nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .showcase-portal-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: linear-gradient(135deg, #8be000 0%, #6fd000 100%);
          color: #05070b;
          border: none;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(139, 224, 0, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .showcase-portal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 224, 0, 0.6);
        }

        /* HERO SECTION */
        .showcase-hero {
          position: relative;
          padding: 90px 24px 100px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 70vh;
          overflow: hidden;
        }

        .showcase-hero-video-bg-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }

        .showcase-video-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 0;
          transition: opacity 800ms ease;
        }

        .showcase-video-bg.active {
          opacity: 0.25;
        }

        [data-theme="light"] .showcase-video-bg.active {
          opacity: 0.16;
        }

        .showcase-hero-overlay-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(5, 7, 11, 0.2) 0%, var(--sc-bg) 85%);
        }

        [data-theme="light"] .showcase-hero-overlay-gradient {
          background: radial-gradient(circle at center, rgba(248, 250, 252, 0.55) 0%, var(--sc-bg) 80%);
        }

        .showcase-hero-centered-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .showcase-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(139, 224, 0, 0.12);
          border: 1px solid rgba(139, 224, 0, 0.3);
          border-radius: 9999px;
          color: #8be000;
          font-size: 12.5px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        [data-theme="light"] .showcase-hero-pill {
          color: #15803d;
          background: rgba(21, 128, 61, 0.1);
          border-color: rgba(21, 128, 61, 0.28);
        }

        .hero-pill-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8be000;
        }

        [data-theme="light"] .hero-pill-dot {
          background: #15803d;
        }

        .showcase-hero-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(34px, 4.8vw, 56px);
          font-weight: 900;
          line-height: 1.12;
          margin-bottom: 20px;
        }

        .hero-highlight-green {
          background: linear-gradient(135deg, #8be000 0%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        [data-theme="light"] .hero-highlight-green {
          background: linear-gradient(135deg, #16a34a 0%, #0284c7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase-hero-desc {
          font-size: 17.5px;
          color: var(--sc-text-sub);
          line-height: 1.6;
          margin-bottom: 36px;
          max-width: 680px;
        }

        .showcase-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .showcase-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 34px;
          background: linear-gradient(135deg, #8be000 0%, #6fd000 100%);
          color: #05070b;
          border-radius: 9999px;
          font-size: 15.5px;
          font-weight: 900;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(139, 224, 0, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .showcase-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(139, 224, 0, 0.6);
        }

        .showcase-3d-badge {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 700;
          color: #ffffff;
        }

        /* STATS SECTION */
        .showcase-stats-section {
          padding: 40px 24px;
          background: var(--sc-card-alt);
          border-y: 1px solid var(--sc-border);
        }

        .showcase-stats-container {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
        }

        .showcase-stat-box {
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-border);
          border-radius: 18px;
          padding: 24px;
        }

        .stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .stat-icon-green { background: rgba(139, 224, 0, 0.15); color: #8be000; }
        .stat-icon-cyan { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
        .stat-icon-amber { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .stat-icon-purple { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

        .stat-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 34px;
          font-weight: 900;
          line-height: 1.1;
        }

        .stat-label {
          font-size: 15px;
          font-weight: 700;
          margin-top: 4px;
        }

        .stat-sub {
          font-size: 12px;
          color: var(--sc-text-sub);
        }

        /* SECTIONS GENERAL */
        .showcase-section {
          padding: 80px 24px;
          max-width: 1280px;
          margin: 0 auto;
        }

        .showcase-section.alt-bg {
          max-width: 100vw;
          background: var(--sc-card-alt);
        }

        .showcase-section-header {
          margin-bottom: 48px;
        }

        .section-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          background: rgba(139, 224, 0, 0.12);
          border: 1px solid rgba(139, 224, 0, 0.3);
          border-radius: 9999px;
          color: #8be000;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .section-pill-tag.tag-amber {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }

        .section-pill-tag.tag-cyan {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.3);
          color: #38bdf8;
        }

        .section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(28px, 3.5vw, 42px);
          font-weight: 900;
          margin-bottom: 10px;
        }

        .section-subtitle {
          font-size: 16px;
          color: var(--sc-text-sub);
        }

        .showcase-lb-tabs {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .lb-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-border);
          border-radius: 9999px;
          color: var(--sc-text-sub);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .lb-tab-btn:hover {
          color: var(--sc-text-main);
          border-color: rgba(139, 224, 0, 0.4);
        }

        .lb-tab-btn.active {
          background: linear-gradient(135deg, #8be000 0%, #6fd000 100%) !important;
          color: #05070b !important;
          border-color: #8be000 !important;
          box-shadow: 0 4px 18px rgba(139, 224, 0, 0.4) !important;
          font-weight: 800 !important;
        }

        .comp-lb-preview-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-border);
          border-radius: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .comp-lb-preview-row:hover {
          transform: translateY(-2px);
          border-color: rgba(56, 189, 248, 0.4);
        }

        .comp-solved-pill {
          padding: 6px 14px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 9999px;
          color: #38bdf8;
          font-size: 13px;
          font-weight: 800;
        }

        /* LEADERBOARD PODIUM */
        .podium-container {
          display: grid;
          grid-template-columns: 1fr 1.1fr 1fr;
          gap: 24px;
          align-items: flex-end;
          max-width: 900px;
          margin: 0 auto 36px auto;
        }

        @media (max-width: 768px) {
          .podium-container {
            grid-template-columns: 1fr;
            align-items: stretch;
          }
        }

        .podium-card {
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-border);
          border-radius: 20px;
          padding: 28px 20px;
          text-align: center;
          position: relative;
          transition: transform 0.2s ease;
        }

        .podium-rank-1 {
          border-color: #8be000;
          background: linear-gradient(180deg, rgba(139, 224, 0, 0.12) 0%, var(--sc-card-bg) 100%);
          box-shadow: 0 10px 30px rgba(139, 224, 0, 0.2);
          transform: translateY(-16px);
        }

        .podium-crown-badge {
          font-size: 28px;
          margin-bottom: 10px;
        }

        .podium-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid var(--sc-border);
          margin: 0 auto 12px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          overflow: hidden;
        }

        .podium-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .podium-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .podium-class {
          font-size: 12.5px;
          color: var(--sc-text-sub);
          display: block;
          margin-bottom: 14px;
        }

        .podium-score-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(139, 224, 0, 0.15);
          border-radius: 9999px;
          color: #8be000;
          font-size: 13.5px;
          font-weight: 800;
        }

        /* LEADERBOARD PREVIEW LIST */
        .leaderboard-preview-list {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lb-preview-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-border);
          border-radius: 14px;
        }

        .lb-rank-num {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: var(--sc-text-sub);
        }

        .lb-user-name {
          font-weight: 700;
          font-size: 15px;
          display: block;
        }

        .lb-user-class {
          font-size: 12px;
          color: var(--sc-text-sub);
        }

        .lb-user-score {
          font-weight: 800;
          color: #8be000;
        }

        /* FEATURED ACHIEVEMENT */
        .featured-achievement-card {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, var(--sc-card-bg) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 32px;
        }

        .featured-ach-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          color: #f59e0b;
          margin-bottom: 12px;
        }

        .featured-ach-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .featured-ach-desc {
          font-size: 15px;
          color: var(--sc-text-sub);
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .featured-ach-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 700;
          color: var(--sc-text-main);
        }

        /* ACHIEVEMENTS GRID */
        .achievements-grid, .projects-grid, .news-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 22px;
        }

        .ach-card, .project-card, .news-card {
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-border);
          border-radius: 18px;
          padding: 24px;
          transition: transform 0.2s;
        }

        .ach-card:hover, .project-card:hover, .news-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 224, 0, 0.4);
        }

        .ach-card-header, .project-card-top, .news-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .ach-tag, .news-tag {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
        }

        .ach-pts { font-weight: 800; color: #8be000; font-size: 13px; }

        .ach-title, .project-title, .news-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .ach-desc, .project-desc, .news-message {
          font-size: 14px;
          color: var(--sc-text-sub);
          line-height: 1.55;
          margin-bottom: 16px;
        }

        .project-category {
          font-size: 12px;
          font-weight: 700;
          color: #38bdf8;
        }

        .project-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(139, 224, 0, 0.15);
          color: #8be000;
        }

        .project-tech-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tech-chip {
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--sc-border);
        }

        /* FINAL CTA SECTION */
        .showcase-cta-section {
          padding: 80px 24px;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .showcase-cta-box {
          background: linear-gradient(135deg, rgba(139, 224, 0, 0.15) 0%, var(--sc-card-bg) 100%);
          border: 1px solid rgba(139, 224, 0, 0.35);
          border-radius: 28px;
          padding: 48px 32px;
        }

        .cta-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 34px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .cta-sub {
          font-size: 16px;
          color: var(--sc-text-sub);
          margin-bottom: 28px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-enter-portal-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 36px;
          background: linear-gradient(135deg, #8be000 0%, #6fd000 100%);
          color: #05070b;
          border: none;
          border-radius: 9999px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(139, 224, 0, 0.5);
          transition: transform 0.2s;
        }

        .cta-enter-portal-btn:hover {
          transform: translateY(-2px);
        }

        /* FOOTER */
        .showcase-footer {
          padding: 24px;
          border-top: 1px solid var(--sc-border);
          text-align: center;
          font-size: 13px;
          color: var(--sc-text-sub);
        }
      `}</style>
    </div>
  );
}
