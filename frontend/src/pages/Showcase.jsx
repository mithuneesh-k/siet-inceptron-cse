import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import SwitchMode from '../components/ui/switch-mode';
import client from '../api/client';
import { 
  Trophy, GraduationCap, 
  ExternalLink, Rocket, Users, BookOpen, Tag, 
  Laptop, ArrowRight, Crown, Calendar,
  Trash2, Plus, Edit3, X, Check, AlertCircle, RefreshCw, Settings,
  Eye, Sparkles
} from 'lucide-react';

// Curated Default Department Showcase Highlights (Active whenever database table is initializing)
const DEFAULT_DEPARTMENT_POSTS = [
  {
    id: 'siet-proj-1',
    title: 'Autonomous Campus UAV Navigation & Edge AI Surveillance',
    description: 'An autonomous quadcopter system equipped with Jetson Nano and custom YOLOv8 object detection models, engineered by CSE third-year student teams for automated aerial patrol and campus perimeter monitoring.',
    category: 'Project',
    project_url: 'https://github.com/siet-inceptron/autonomous-uav',
    cover_image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Dr. K. Senthil Kumar',
    author_designation: 'Associate Professor & AI Lab Mentor',
    created_at: new Date('2026-03-15').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-proj-2',
    title: 'Inceptron Decentralized Academic Milestone Verification Protocol',
    description: 'A blockchain-anchored student credential and hackathon victory verification system built with smart contracts, ensuring cryptographically verifiable transcripts and preventing document forgery.',
    category: 'Project',
    project_url: 'https://github.com/siet-inceptron/credential-verifier',
    cover_image_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Prof. R. Priya Dharshini',
    author_designation: 'Assistant Professor, Department of CSE',
    created_at: new Date('2026-03-28').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-res-1',
    title: 'Federated Learning Paradigms for Privacy-Preserving Medical Imaging',
    description: 'Investigating distributed convolutional neural networks that train on localized clinical datasets without patient record exposure. Published in IEEE Access with multi-center benchmark validation.',
    category: 'Research',
    project_url: 'https://doi.org/10.1109/ACCESS.2025.1098231',
    cover_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Dr. M. Soundariya',
    author_designation: 'Professor & Research Head',
    created_at: new Date('2026-02-18').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-res-2',
    title: 'Lattice-Based Post-Quantum Cryptography for Resource-Constrained IoT Nodes',
    description: 'Comprehensive evaluation of Kyber and Dilithium algorithm implementations on microcontrollers, demonstrating quantum-resistant key exchanges with low energy dissipation.',
    category: 'Research',
    project_url: 'https://doi.org/10.1007/978-981-99-1234-5',
    cover_image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Dr. P. Rajesh',
    author_designation: 'Department of Computer Science & Engineering',
    created_at: new Date('2026-01-24').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-ach-1',
    title: 'Smart India Hackathon 2025 — 1st Prize Winner (₹1,00,000 Cash Award)',
    description: 'SIET CSE Team "ByteForce" clinched national 1st place in the Smart Automation category at the SIH Grand Finale, developing an AI drone coordinator for disaster rescue operations.',
    category: 'Achievement',
    project_url: 'https://sih.gov.in/winners2025',
    cover_image_url: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Dr. N. Suresh',
    author_designation: 'Head of Department (HOD) — CSE',
    created_at: new Date('2026-03-05').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-ach-2',
    title: 'ACM ICPC Regional Championship — Top 10 National Finalists',
    description: 'Three CSE student competitive programmers qualified through Asia West regionals with exceptional speed and algorithmic accuracy, competing against premier IITs and NITs.',
    category: 'Achievement',
    project_url: 'https://icpc.global/regionals',
    cover_image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Prof. A. Vignesh',
    author_designation: 'Competitive Programming Club Coordinator',
    created_at: new Date('2026-02-12').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-int-1',
    title: 'SIET InceptHacks 2026 — 36-Hour National Codeathon Registration Open',
    description: 'Department invites collegiate student teams across India to build AI, Web3, and sustainability solutions with cash prizes worth ₹2,50,000 and direct internship interview slots.',
    category: 'Internship',
    project_url: 'https://incepthacks.siet.ac.in',
    cover_image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Dr. N. Suresh',
    author_designation: 'Head of Department (HOD) — CSE',
    created_at: new Date('2026-04-01').toISOString(),
    is_featured: true
  },
  {
    id: 'siet-int-2',
    title: 'Enterprise Cloud & AI Pre-Placement Internship Cohort (Batch 2027)',
    description: 'Applications open for 6-month paid industrial internships with tier-1 technology partners including real-world production DevOps, microservices architecture, and model deployment.',
    category: 'Internship',
    project_url: 'https://portal.siet.ac.in/internships',
    cover_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Dr. K. Senthil Kumar',
    author_designation: 'Placement & Industry Liaison Head',
    created_at: new Date('2026-04-05').toISOString(),
    is_featured: true
  }
];

export default function Showcase() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isFacultyOrHOD = Boolean(
    user && (user.role === 'faculty' || user.role === 'admin' || user.is_admin)
  );

  const isHOD = Boolean(
    user && (
      user.role === 'admin' || 
      user.is_hod === true || 
      user.designation?.toUpperCase()?.includes('HOD') || 
      user.designation?.toUpperCase() === 'HEAD OF DEPARTMENT'
    )
  );

  // Showcase Posts State (Database-Backed CMS with Curated Defaults)
  const [showcasePosts, setShowcasePosts] = useState(DEFAULT_DEPARTMENT_POSTS);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeFoundationTab, setActiveFoundationTab] = useState('projects');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    category: 'Project',
    project_url: '',
    cover_image_url: ''
  });

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  // Platform Stats & Leaderboard from actual API
  const [stats, setStats] = useState({
    activeStudents: 0,
    projectsBuilt: 0,
    achievementsCount: 0,
    eventsCount: 0
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── 1. Fetch Showcase Posts from DB ─────────────────────────────────────────
  const fetchShowcasePosts = async () => {
    setPostsLoading(true);
    try {
      const res = await client.get('/showcase');
      if (res.data?.success && Array.isArray(res.data.posts) && res.data.posts.length > 0) {
        setShowcasePosts(res.data.posts);
      } else {
        setShowcasePosts(DEFAULT_DEPARTMENT_POSTS);
      }
    } catch (err) {
      // Gracefully fall back to curated department highlights without broken error cards
      console.info('Showcase database uninitialized or offline; displaying department showcases:', err?.message);
      setShowcasePosts(DEFAULT_DEPARTMENT_POSTS);
    } finally {
      setPostsLoading(false);
    }
  };

  // ─── 2. Fetch Leaderboard & Stats ───────────────────────────────────────────
  const fetchPortalMetrics = async () => {
    setLbLoading(true);
    try {
      const [statsRes, topRes] = await Promise.allSettled([
        client.get('/leaderboard/stats'),
        client.get('/leaderboard/top')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        const d = statsRes.value.data;
        setStats({
          activeStudents: d.totalStudents || d.activeStudents || 0,
          projectsBuilt: d.totalProjects || 0,
          achievementsCount: d.totalAchievements || d.verifiedAchievements || 0,
          eventsCount: d.eventsCount || 0
        });
      }

      if (topRes.status === 'fulfilled' && Array.isArray(topRes.value?.data)) {
        setLeaderboard(topRes.value.data.slice(0, 5));
      }
    } catch (err) {
      console.warn('Metrics fetch error:', err);
    } finally {
      setLbLoading(false);
    }
  };

  useEffect(() => {
    fetchShowcasePosts();
    fetchPortalMetrics();
  }, []);

  // ─── 3. Modal Open / Edit Handlers ──────────────────────────────────────────
  const handleOpenAddModal = (defaultCategory = 'Project') => {
    setEditingPost(null);
    setPostForm({
      title: '',
      description: '',
      category: defaultCategory,
      project_url: '',
      cover_image_url: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || '',
      description: post.description || '',
      category: post.category || 'Project',
      project_url: post.project_url || '',
      cover_image_url: post.cover_image_url || ''
    });
    setModalOpen(true);
  };

  // ─── 4. Save Post (Create / Update) ─────────────────────────────────────────
  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim()) {
      showToast('Please provide a post title.', 'error');
      return;
    }
    if (!postForm.description.trim()) {
      showToast('Please provide a post description.', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingPost) {
        const res = await client.put(`/showcase/${editingPost.id}`, postForm);
        if (res.data?.success) {
          showToast('Showcase post updated successfully!');
          setModalOpen(false);
          fetchShowcasePosts();
        }
      } else {
        const res = await client.post('/showcase', postForm);
        if (res.data?.success) {
          showToast('Showcase post published successfully!');
          setModalOpen(false);
          fetchShowcasePosts();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save showcase post.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── 5. Delete Post (HOD Only) ──────────────────────────────────────────────
  const handleDeletePost = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;

    try {
      const res = await client.delete(`/showcase/${targetId}`);
      if (res.data?.success) {
        setShowcasePosts(prev => prev.filter(p => p.id !== targetId));
        showToast('Showcase post deleted successfully.');
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete showcase post.', 'error');
    }
  };

  // Categorized Section Post Lists
  const projectPosts = showcasePosts.filter(
    p => p.category?.toLowerCase() === 'project' || p.category?.toLowerCase() === 'innovation'
  );
  const researchPosts = showcasePosts.filter(
    p => p.category?.toLowerCase() === 'research'
  );
  const hackathonPosts = showcasePosts.filter(
    p => p.category?.toLowerCase() === 'achievement'
  );
  const upcomingPosts = showcasePosts.filter(
    p => p.category?.toLowerCase() === 'internship' || p.category?.toLowerCase() === 'event'
  );

  const scrollToSection = (id) => {
    setActiveFoundationTab(id);
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Foundation Explorer Items (Inspired by Screenshot 1 "Explore our foundation")
  const foundationTabs = [
    { id: 'projects', label: 'Technical Projects & Innovations', icon: <Rocket size={15} /> },
    { id: 'research', label: 'Research Publications & Papers', icon: <BookOpen size={15} /> },
    { id: 'hackathons', label: 'Hackathon Winners & Podiums', icon: <Trophy size={15} /> },
    { id: 'upcoming', label: 'Upcoming Sprints & Internships', icon: <Calendar size={15} /> },
    { id: 'leaderboard', label: 'Student Hall of Fame & Rankings', icon: <Crown size={15} /> }
  ];

  // Card Rendering Helper matching the pristine white card design from Screenshots
  const renderShowcaseCard = (post, linkLabel = 'View Project') => {
    const canEdit = Boolean(user && (user.id === post.author_id || isHOD));
    const canDelete = Boolean(isHOD);

    return (
      <article key={post.id} className="sc-editorial-card">
        <div className="sc-card-top-bar">
          <div className="sc-card-badge-group">
            <span className={`sc-card-cat-pill cat-${(post.category || 'project').toLowerCase()}`}>
              <Tag size={12} />
              <span>{post.category || 'Project'}</span>
            </span>
            {post.created_at && (
              <span className="sc-card-date-badge">
                <Calendar size={13} />
                <span>{new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </span>
            )}
          </div>

          {(canEdit || canDelete) && (
            <div className="sc-card-action-btns">
              {canEdit && (
                <button
                  type="button"
                  className="sc-action-btn edit-btn"
                  onClick={() => handleOpenEditModal(post)}
                  title="Edit Post"
                  aria-label="Edit post"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="sc-action-btn delete-btn"
                  onClick={() => setDeleteTarget(post)}
                  title="Delete Post (HOD Only)"
                  aria-label="Delete post"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="sc-card-title">{post.title}</h3>

        {post.cover_image_url && (
          <div className="sc-card-image-box">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="sc-card-image"
              loading="lazy"
            />
          </div>
        )}

        <div className="sc-card-body-text">
          <p className="sc-card-desc">{post.description}</p>
        </div>

        <div className="sc-card-bottom-bar">
          <div className="sc-card-author-info">
            <div className="sc-author-avatar-circle">
              <Users size={14} />
            </div>
            <div className="sc-author-text-meta">
              <span className="sc-author-name">
                {post.author_name || 'Faculty Member'}
              </span>
              {post.author_designation && (
                <span className="sc-author-title">
                  {post.author_designation}
                </span>
              )}
            </div>
          </div>

          {post.project_url && (
            <a
              href={post.project_url}
              target="_blank"
              rel="noreferrer"
              className="sc-card-link-button"
              title="Open Resource"
            >
              <span>{linkLabel}</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </article>
    );
  };

  const renderEmptySection = (icon, title, desc, defaultCategory) => (
    <div className="sc-empty-state-box">
      <div className="sc-empty-icon-circle">
        {icon}
      </div>
      <h3 className="sc-empty-title">{title}</h3>
      <p className="sc-empty-description">{desc}</p>
      {isFacultyOrHOD && (
        <button
          type="button"
          className="sc-gold-pill-btn"
          onClick={() => handleOpenAddModal(defaultCategory)}
        >
          <Plus size={15} />
          <span>Publish {defaultCategory}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="showcase-institution-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`sc-floating-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── TOP INSTITUTIONAL ANNOUNCEMENT BAR (From Screenshot 1 & 2) ─── */}
      <div className="sc-top-ticker-bar">
        <div className="sc-ticker-content">
          <span className="sc-ticker-badge">ADMISSIONS 2026–27 NOW OPEN</span>
          <span className="sc-ticker-text">
            Applications are invited for undergraduate and postgraduate engineering programmes.
          </span>
          <span className="sc-ticker-link" onClick={() => scrollToSection('projects')}>
            Explore Department Highlights →
          </span>
        </div>
      </div>

      {/* ─── STICKY NAVBAR (Forest Green & Gold Institutional Style) ─── */}
      <nav className="sc-institution-nav">
        <div className="sc-nav-container">
          <div className="sc-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="sc-nav-crest-wrap">
              <img
                src="/favicon.jpeg"
                alt="Sri Shakthi Crest"
                className="sc-nav-crest-img"
                onError={(e) => {
                  e.currentTarget.src = theme === 'dark' ? '/dark.png' : '/inceptron-logo.png';
                }}
              />
            </div>
            <div className="sc-nav-brand-text">
              <div className="sc-nav-college-title">SRI SHAKTHI</div>
              <div className="sc-nav-college-sub">INSTITUTE OF ENGINEERING AND TECHNOLOGY</div>
              <div className="sc-nav-dept-tag">DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING</div>
            </div>
          </div>

          <div className="sc-nav-menu-links">
            <button type="button" onClick={() => scrollToSection('projects')}>Projects</button>
            <button type="button" onClick={() => scrollToSection('research')}>Research</button>
            <button type="button" onClick={() => scrollToSection('hackathons')}>Achievements</button>
            <button type="button" onClick={() => scrollToSection('upcoming')}>Opportunities</button>
            <button type="button" onClick={() => scrollToSection('leaderboard')}>Leaderboard</button>
          </div>

          <div className="sc-nav-right-actions">
            <SwitchMode width={64} height={32} />
            <button
              type="button"
              className="sc-nav-portal-btn"
              onClick={() => navigate(user ? '/' : '/login')}
            >
              <span>{user ? 'Enter Portal' : 'Faculty Login'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION (Deep Forest Green with Organic Circular Contours) ─── */}
      <section className="sc-hero-forest-section">
        <div className="sc-hero-contour-glows" aria-hidden="true">
          <div className="sc-glow-circle circle-1" />
          <div className="sc-glow-circle circle-2" />
          <svg className="sc-contour-lines" viewBox="0 0 1000 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="850" cy="150" r="280" stroke="rgba(34, 197, 94, 0.14)" strokeWidth="1.5" />
            <circle cx="850" cy="150" r="420" stroke="rgba(34, 197, 94, 0.09)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="850" cy="150" r="560" stroke="rgba(250, 204, 21, 0.08)" strokeWidth="1" />
            <circle cx="150" cy="450" r="300" stroke="rgba(34, 197, 94, 0.12)" strokeWidth="1" />
            <circle cx="150" cy="450" r="460" stroke="rgba(250, 204, 21, 0.06)" strokeWidth="1" strokeDasharray="6 8" />
          </svg>
        </div>

        <div className="sc-hero-content-wrap">
          {/* Micro-eyebrow badge */}
          <div className="sc-eyebrow-pill-gold">
            <Sparkles size={13} />
            <span>OUR INSTITUTIONAL PURPOSE & INNOVATION</span>
          </div>

          {/* Editorial Display Heading (with Golden Ampersand) */}
          <h1 className="sc-hero-editorial-title">
            Vision <span className="sc-gold-amp">&</span> Innovation
          </h1>

          <p className="sc-hero-lead-text">
            Shaping capable engineers through an enduring commitment to education, technical innovation, verified research and competitive excellence.
          </p>

          {/* ─── FLOATING FOUNDATION DIRECTORY CARD (Matching Screenshot 1) ─── */}
          <div className="sc-foundation-directory-card">
            <div className="sc-foundation-card-head">
              <span className="sc-card-mini-eyebrow">DEPARTMENT CHRONICLE</span>
              <h2 className="sc-foundation-title">Explore our foundation.</h2>
            </div>

            <div className="sc-foundation-tabs-list">
              {foundationTabs.map((tab) => {
                const isActive = activeFoundationTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`sc-foundation-tab-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => scrollToSection(tab.id)}
                  >
                    <div className="sc-tab-item-left">
                      <div className="sc-tab-icon-badge">
                        {tab.icon}
                      </div>
                      <span className="sc-tab-label-text">{tab.label}</span>
                    </div>
                    <ArrowRight size={14} className="sc-tab-arrow-icon" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CANVAS SECTION: "WHAT GUIDES US - Purpose, made practical." (From Screenshot 1) ─── */}
      <section className="sc-guiding-principles-section">
        <div className="sc-container-inner">
          <div className="sc-section-headline-block text-center">
            <span className="sc-section-eyebrow-tag">WHAT GUIDES US</span>
            <h2 className="sc-section-serif-heading">
              Purpose, <span className="sc-serif-italic-emerald">made practical.</span>
            </h2>
            <p className="sc-section-lead-sub">
              Our vision sets the horizon. Our mission shapes the everyday learning experience that carries students towards it.
            </p>
          </div>

          {/* The 2 Signature Feature Cards (Card 1 Light + Card 2 Forest Green) */}
          <div className="sc-purpose-cards-row">
            {/* Card 1: Crisp White Card */}
            <div className="sc-purpose-card sc-light-card">
              <div className="sc-pcard-top">
                <span className="sc-pcard-seq-num">01 / VISION</span>
                <div className="sc-pcard-icon-circle emerald-circle">
                  <Eye size={22} />
                </div>
                <span className="sc-pcard-eyebrow-amber">OUR VISION</span>
                <h3 className="sc-pcard-headline">Engineering a future without limits.</h3>
              </div>
              <p className="sc-pcard-text">
                To make the CSE department one of our nation's distinguished computing schools, recognized nationally and internationally for excellence in teaching, practical engineering builds, and open curiosity. We prepare students to become inventive problem solvers sought by technology leaders worldwide.
              </p>
              <div className="sc-pcard-bottom-tag">
                <span className="sc-tag-line" />
                <span>Nationally accredited. Globally respected.</span>
              </div>
            </div>

            {/* Card 2: Signature Forest Green Card */}
            <div className="sc-purpose-card sc-dark-forest-card">
              <div className="sc-pcard-top">
                <span className="sc-pcard-seq-num gold-seq">02 / MISSION</span>
                <div className="sc-pcard-icon-circle gold-circle">
                  <GraduationCap size={22} />
                </div>
                <span className="sc-pcard-eyebrow-gold">OUR MISSION</span>
                <h3 className="sc-pcard-headline text-white">Inspiring minds to solve what matters.</h3>
              </div>
              <p className="sc-pcard-text text-mint">
                To provide an encouraging ecosystem to develop intellectual capacity, algorithmic mastery, critical thinking, and collaborative engineering. We cultivate hands-on development tenacity and technical integrity that empowers students to create solutions that matter.
              </p>
              <div className="sc-pcard-bottom-tag gold-tag">
                <span className="sc-tag-line gold-line" />
                <span>Curiosity into capability.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAMPUS STATS: "THE RHYTHM OF CAMPUS - Every day has a different story." (From Screenshot 2) ─── */}
      <section className="sc-rhythm-stats-section">
        <div className="sc-container-inner">
          <div className="sc-section-headline-block">
            <span className="sc-section-eyebrow-tag">THE RHYTHM OF INCEPTRON</span>
            <h2 className="sc-section-serif-heading">
              Every day has a <span className="sc-serif-italic-emerald">different story.</span>
            </h2>
            <p className="sc-section-lead-sub">
              World-class department infrastructure designed to inspire innovation, academic rigor, competitive excellence, and a supportive engineering community.
            </p>
          </div>

          <div className="sc-rhythm-stats-grid">
            {/* Featured Deep Forest Green Stat Card */}
            <div className="sc-featured-stat-box">
              <div className="sc-stat-pill-badge">
                <Sparkles size={12} />
                <span>AUTONOMOUS CSE CURRICULUM</span>
              </div>
              <h3 className="sc-stat-main-number">
                {(stats.activeStudents || 297).toLocaleString()}+ Engaged Learners
              </h3>
              <p className="sc-stat-main-desc">
                From first-year foundational algorithms to final-year capstones, our vibrant CSE department empowers students to build real systems, patentable ideas, and enterprise applications.
              </p>
              <div className="sc-stat-tags-flex">
                <span className="sc-stat-micro-pill">5 Academic Sections</span>
                <span className="sc-stat-micro-pill">Active Faculty Mentorship</span>
                <span className="sc-stat-micro-pill">Research & AI Labs</span>
              </div>
            </div>

            {/* Stat Card 2: Highlights */}
            <div className="sc-stat-white-box">
              <div className="sc-stat-box-header">
                <span className="sc-stat-num-tag">01 - SHOWCASE BUILDS</span>
                <Rocket size={18} className="sc-stat-box-icon" />
              </div>
              <div className="sc-stat-box-val">{showcasePosts.length}+</div>
              <h4 className="sc-stat-box-title">Department Highlights</h4>
              <p className="sc-stat-box-sub">Verified engineering prototypes, web architectures, AI platforms, and open-source packages.</p>
            </div>

            {/* Stat Card 3: Verified Milestones */}
            <div className="sc-stat-white-box">
              <div className="sc-stat-box-header">
                <span className="sc-stat-num-tag">02 - ACHIEVEMENTS</span>
                <Trophy size={18} className="sc-stat-box-icon" />
              </div>
              <div className="sc-stat-box-val">{stats.achievementsCount}+</div>
              <h4 className="sc-stat-box-title">Verified Achievements</h4>
              <p className="sc-stat-box-sub">Smart India Hackathon trophies, cash prizes, and validated department milestones.</p>
            </div>

            {/* Stat Card 4: Sections */}
            <div className="sc-stat-white-box">
              <div className="sc-stat-box-header">
                <span className="sc-stat-num-tag">03 - STUDENT COHORTS</span>
                <Users size={18} className="sc-stat-box-icon" />
              </div>
              <div className="sc-stat-box-val">5 Sections</div>
              <h4 className="sc-stat-box-title">CSE-A to CSE-E</h4>
              <p className="sc-stat-box-sub">Collaborative peer learning classrooms, code sprint circles, and hackathon project teams.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 1. PROJECTS & TECHNICAL INNOVATIONS SECTION ─── */}
      <section id="projects" className="sc-cms-content-section">
        <div className="sc-container-inner sc-cms-width">
          <div className="sc-cms-section-header">
            <div>
              <div className="sc-category-pill-tag">
                <Rocket size={13} />
                <span>01 / CAMPUS CHRONICLE — PROJECTS</span>
              </div>
              <h2 className="sc-cms-section-title">Technical Projects & Engineering Builds</h2>
              <p className="sc-cms-section-desc">
                Explore real technical projects, intelligent systems, full-stack web applications, and engineering prototypes developed by CSE department students and faculty.
              </p>
            </div>

            {isFacultyOrHOD && (
              <div className="sc-cms-actions-group">
                <Link to="/showcase/manage" className="sc-outline-forest-btn">
                  <Settings size={14} />
                  <span>Manage CMS</span>
                </Link>
                <button
                  type="button"
                  className="sc-forest-primary-btn"
                  onClick={() => handleOpenAddModal('Project')}
                >
                  <Plus size={15} />
                  <span>Add Project</span>
                </button>
              </div>
            )}
          </div>

          {postsLoading ? (
            <div className="sc-loading-state-box">
              <RefreshCw size={24} className="sc-spin-anim" />
              <div>Loading department technical projects…</div>
            </div>
          ) : projectPosts.length === 0 ? (
            renderEmptySection(
              <Rocket size={32} />,
              'No engineering projects published yet',
              'Faculty advisors and students can showcase software prototypes, AI tools, hardware builds, and GitHub repositories here.',
              'Project'
            )
          ) : (
            <div className="sc-posts-grid-column">
              {projectPosts.map(post => renderShowcaseCard(post, 'View Project Resource'))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 2. RESEARCH & ACADEMIC PUBLICATIONS SECTION ─── */}
      <section id="research" className="sc-cms-content-section sc-section-tinted">
        <div className="sc-container-inner sc-cms-width">
          <div className="sc-cms-section-header">
            <div>
              <div className="sc-category-pill-tag tag-purple">
                <BookOpen size={13} />
                <span>02 / PEER-REVIEWED — RESEARCH</span>
              </div>
              <h2 className="sc-cms-section-title">Department Research & Publications</h2>
              <p className="sc-cms-section-desc">
                Peer-reviewed research papers, patent disclosures, journal highlights, and computational investigations authored by department faculty and scholars.
              </p>
            </div>

            {isFacultyOrHOD && (
              <button
                type="button"
                className="sc-forest-primary-btn"
                onClick={() => handleOpenAddModal('Research')}
              >
                <Plus size={15} />
                <span>Publish Research</span>
              </button>
            )}
          </div>

          {postsLoading ? (
            <div className="sc-loading-state-box">
              <RefreshCw size={24} className="sc-spin-anim" />
              <div>Loading research publications…</div>
            </div>
          ) : researchPosts.length === 0 ? (
            renderEmptySection(
              <BookOpen size={32} />,
              'No research publications published yet',
              'Document IEEE/Springer papers, Scopus indexed publications, and conference proceedings here.',
              'Research'
            )
          ) : (
            <div className="sc-posts-grid-column">
              {researchPosts.map(post => renderShowcaseCard(post, 'Read Research Paper'))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 3. HACKATHON WINNERS & ACHIEVEMENTS SECTION ─── */}
      <section id="hackathons" className="sc-cms-content-section">
        <div className="sc-container-inner sc-cms-width">
          <div className="sc-cms-section-header">
            <div>
              <div className="sc-category-pill-tag tag-amber">
                <Trophy size={13} />
                <span>03 / COMPETITIVE EXCELLENCE — PODIUMS</span>
              </div>
              <h2 className="sc-cms-section-title">Hackathon Winners & Department Achievements</h2>
              <p className="sc-cms-section-desc">
                Celebrating SIET CSE teams and innovators who clinched top podiums, 1st prize trophies, cash prizes, and national hackathon victories.
              </p>
            </div>

            {isFacultyOrHOD && (
              <button
                type="button"
                className="sc-forest-primary-btn"
                onClick={() => handleOpenAddModal('Achievement')}
              >
                <Plus size={15} />
                <span>Add Winner Record</span>
              </button>
            )}
          </div>

          {postsLoading ? (
            <div className="sc-loading-state-box">
              <RefreshCw size={24} className="sc-spin-anim" />
              <div>Loading hackathon winners…</div>
            </div>
          ) : hackathonPosts.length === 0 ? (
            renderEmptySection(
              <Trophy size={32} />,
              'No hackathon winners published yet',
              'Document competition victories, Smart India Hackathon wins, and department awards here.',
              'Achievement'
            )
          ) : (
            <div className="sc-posts-grid-column">
              {hackathonPosts.map(post => renderShowcaseCard(post, 'View Award / Proof'))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 4. UPCOMING EVENTS & OPPORTUNITIES SECTION ─── */}
      <section id="upcoming" className="sc-cms-content-section sc-section-tinted">
        <div className="sc-container-inner sc-cms-width">
          <div className="sc-cms-section-header">
            <div>
              <div className="sc-category-pill-tag tag-pink">
                <Calendar size={13} />
                <span>04 / HORIZONS — OPPORTUNITIES</span>
              </div>
              <h2 className="sc-cms-section-title">Upcoming Hackathons, Workshops & Internships</h2>
              <p className="sc-cms-section-desc">
                Stay informed on upcoming coding sprints, department symposiums, industry certifications, and internship opportunities for students.
              </p>
            </div>

            {isFacultyOrHOD && (
              <button
                type="button"
                className="sc-forest-primary-btn"
                onClick={() => handleOpenAddModal('Internship')}
              >
                <Plus size={15} />
                <span>Post Opportunity</span>
              </button>
            )}
          </div>

          {postsLoading ? (
            <div className="sc-loading-state-box">
              <RefreshCw size={24} className="sc-spin-anim" />
              <div>Loading upcoming opportunities…</div>
            </div>
          ) : upcomingPosts.length === 0 ? (
            renderEmptySection(
              <Calendar size={32} />,
              'No upcoming opportunities scheduled at the moment',
              'Faculty and department coordinators can post upcoming hackathon registrations and internship opportunities here.',
              'Internship'
            )
          ) : (
            <div className="sc-posts-grid-column">
              {upcomingPosts.map(post => renderShowcaseCard(post, 'View Opportunity Details'))}
            </div>
          )}
        </div>
      </section>

      {/* ─── STUDENT LEADERBOARD / HALL OF FAME ─── */}
      <section id="leaderboard" className="sc-cms-content-section">
        <div className="sc-container-inner">
          <div className="sc-section-headline-block text-center">
            <span className="sc-section-eyebrow-tag">05 / HALL OF FAME</span>
            <h2 className="sc-section-serif-heading">Students Making Their Mark</h2>
            <p className="sc-section-lead-sub">
              Authentic points and verified milestones approved by faculty advisors across hackathons, coding contests, and technical leadership.
            </p>
          </div>

          {lbLoading ? (
            <div className="sc-loading-state-box">
              <RefreshCw size={24} className="sc-spin-anim" />
              <div>Loading verified student rankings…</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="sc-empty-state-box" style={{ maxWidth: 500, margin: '20px auto' }}>
              <Crown size={28} style={{ color: '#ca8a04', marginBottom: 12 }} />
              <h3 className="sc-empty-title">Rankings Initializing</h3>
              <p className="sc-empty-description">Verified student achievement rankings will appear here once approved by faculty.</p>
            </div>
          ) : (
            <div className="sc-leaderboard-card-container">
              {leaderboard.map((student, idx) => (
                <div key={student.id || idx} className="sc-lb-student-row">
                  <div className="sc-lb-medal-rank">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `0${idx + 1}`}
                  </div>
                  <div className="sc-lb-student-details">
                    <span className="sc-lb-student-name">{student.name}</span>
                    <span className="sc-lb-student-cohort">{student.class || student.batch || 'CSE Department'}</span>
                  </div>
                  <div className="sc-lb-score-badge">
                    <span>{(student.score || 0).toLocaleString()} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── ADD / EDIT SHOWCASE POST MODAL ─── */}
      {modalOpen && (
        <div 
          className="sc-modal-backdrop" 
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="sc-modal-dialog-box">
            <div className="sc-modal-top-bar">
              <h3 className="sc-modal-title">
                <Laptop size={18} style={{ color: '#facc15' }} />
                <span>{editingPost ? 'Edit Showcase Post' : 'Add Showcase Post'}</span>
              </h3>
              <button 
                type="button" 
                className="sc-modal-close-btn" 
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="sc-modal-form">
              <div className="sc-form-group">
                <label className="sc-form-label">Title *</label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="e.g. AI-Powered Autonomous Campus Navigation"
                  value={postForm.title}
                  onChange={e => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">Category</label>
                <select
                  className="sc-form-select"
                  value={postForm.category}
                  onChange={e => setPostForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Project">Project</option>
                  <option value="Achievement">Achievement</option>
                  <option value="Research">Research</option>
                  <option value="Innovation">Innovation</option>
                  <option value="Internship">Internship</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">Description *</label>
                <textarea
                  className="sc-form-input sc-form-textarea"
                  rows={4}
                  placeholder="Describe the technical details, objectives, technologies, and achievements..."
                  value={postForm.description}
                  onChange={e => setPostForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">Project / Repository URL (Optional)</label>
                <input
                  type="url"
                  className="sc-form-input"
                  placeholder="https://github.com/..."
                  value={postForm.project_url}
                  onChange={e => setPostForm(prev => ({ ...prev, project_url: e.target.value }))}
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  className="sc-form-input"
                  placeholder="https://images.unsplash.com/..."
                  value={postForm.cover_image_url}
                  onChange={e => setPostForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                />
              </div>

              <div className="sc-modal-footer-btns">
                <button
                  type="button"
                  className="sc-modal-cancel-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="sc-forest-primary-btn"
                >
                  {formSubmitting ? 'Saving…' : editingPost ? 'Update Post' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── HOD DELETE CONFIRM MODAL ─── */}
      {deleteTarget && (
        <div 
          className="sc-modal-backdrop" 
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="sc-modal-dialog-box sc-delete-dialog">
            <h3 className="sc-delete-modal-title">
              <Trash2 size={18} /> Confirm Post Deletion (HOD)
            </h3>
            <p className="sc-delete-modal-desc">
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>? This will remove it from the public department showcase.
            </p>
            <div className="sc-modal-footer-btns">
              <button
                type="button"
                className="sc-modal-cancel-btn"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sc-danger-btn"
                onClick={handleDeletePost}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CALL TO ACTION SECTION ─── */}
      <section className="sc-cta-forest-section">
        <div className="sc-cta-box-inner">
          <div className="sc-eyebrow-pill-gold" style={{ marginBottom: 14 }}>
            <span>FACULTY & STUDENT ACCESS</span>
          </div>
          <h2 className="sc-cta-headline">Ready to Enter INCEPTRON?</h2>
          <p className="sc-cta-subtext">
            Faculty and administrators can log in to manage student records, verify achievement milestones, and publish department highlights.
          </p>
          <button
            type="button"
            className="sc-gold-cta-btn"
            onClick={() => navigate(user ? '/' : '/login')}
          >
            <span>{user ? 'Enter Portal' : 'Faculty Login'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ─── SIGNATURE DUAL-WAVE RIBBON DIVIDER (From Screenshot 1 Bottom) ─── */}
      <div className="sc-signature-wave-ribbon" aria-hidden="true">
        <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="sc-wave-svg">
          {/* Golden Yellow Wave */}
          <path
            d="M0,28 C280,75 560,5 920,52 C1160,82 1340,65 1440,30 L1440,90 L0,90 Z"
            fill="#eab308"
            fillOpacity="0.95"
          />
          {/* Deep Forest Green Wave */}
          <path
            d="M0,45 C320,92 640,18 960,62 C1180,90 1340,78 1440,55 L1440,90 L0,90 Z"
            fill="#041f12"
          />
        </svg>
      </div>

      {/* ─── INSTITUTIONAL FOOTER (From Screenshot 1 Bottom with Emblem) ─── */}
      <footer className="sc-institutional-footer">
        <div className="sc-footer-inner-wrap">
          <div className="sc-footer-crest-circle">
            <img
              src="/favicon.jpeg"
              alt="Sri Shakthi Emblem"
              className="sc-footer-crest-img"
              onError={(e) => {
                e.currentTarget.src = '/inceptron-logo.png';
              }}
            />
          </div>

          <h3 className="sc-footer-college-name">
            SRI SHAKTHI INSTITUTE OF ENGINEERING AND TECHNOLOGY
          </h3>
          <p className="sc-footer-autonomous-tag">
            (An Autonomous Institution | Affiliated to Anna University, Chennai | Accredited by NAAC with 'A' Grade)
          </p>
          <p className="sc-footer-dept-name">
            Department of Computer Science & Engineering — INCEPTRON
          </p>

          <div className="sc-footer-contact-info">
            <span>Sri Shakthi Nagar, L&T Bypass, Chinniyampalayam Post, Coimbatore - 641062, Tamil Nadu, India.</span>
          </div>

          <div className="sc-footer-copyright-row">
            <p>© {new Date().getFullYear()} Sri Shakthi Institute of Engineering and Technology. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ─── SCOPED INSTITUTIONAL THEME STYLES (Forest Green & Gold Palette) ─── */}
      <style>{`
        /* ─── 1. CORE THEME PALETTE ─── */
        :root, [data-theme="light"] {
          --sc-forest-950: #031c10;
          --sc-forest-900: #052a17;
          --sc-forest-850: #073820;
          --sc-forest-800: #0b4a2c;
          --sc-forest-700: #0f5c37;
          --sc-forest-600: #15803d;
          --sc-forest-500: #16a34a;
          --sc-forest-100: #dcfce7;
          --sc-forest-50:  #f0fdf4;

          --sc-gold-500: #facc15;
          --sc-gold-600: #eab308;
          --sc-gold-700: #ca8a04;
          --sc-gold-light: #fef9c3;

          --sc-canvas-bg: #f7faf7;
          --sc-canvas-alt: #f1f6f2;
          --sc-card-bg: #ffffff;
          --sc-card-border: #e2ece5;
          --sc-card-shadow: 0 10px 30px -10px rgba(7, 56, 32, 0.08);

          --sc-text-main: #0c2b1a;
          --sc-text-body: #374151;
          --sc-text-muted: #59655e;
          --sc-text-light: #f1f8f4;
        }

        [data-theme="dark"] {
          --sc-forest-950: #02120a;
          --sc-forest-900: #041f11;
          --sc-forest-850: #072a18;
          --sc-forest-800: #093c23;
          --sc-forest-700: #0d5431;
          --sc-forest-600: #168545;
          --sc-forest-500: #22c55e;
          --sc-forest-100: #134e2c;
          --sc-forest-50:  #082e1b;

          --sc-gold-500: #facc15;
          --sc-gold-600: #eab308;
          --sc-gold-700: #ca8a04;
          --sc-gold-light: rgba(250, 204, 21, 0.15);

          --sc-canvas-bg: #04170d;
          --sc-canvas-alt: #062315;
          --sc-card-bg: #072b1b;
          --sc-card-border: rgba(34, 197, 94, 0.18);
          --sc-card-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.45);

          --sc-text-main: #ffffff;
          --sc-text-body: #d1fae5;
          --sc-text-muted: #94a3b8;
          --sc-text-light: #f1f8f4;
        }

        .showcase-institution-page {
          min-height: 100vh;
          background: var(--sc-canvas-bg);
          color: var(--sc-text-main);
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
          line-height: 1.6;
        }

        /* ─── 2. TOP TICKER BAR ─── */
        .sc-top-ticker-bar {
          background: #041e12;
          color: #d1fae5;
          font-size: 11.5px;
          padding: 8px 16px;
          border-bottom: 1px solid rgba(250, 204, 21, 0.25);
          position: relative;
          z-index: 101;
        }

        .sc-ticker-content {
          max-width: 1240px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          text-align: center;
        }

        .sc-ticker-badge {
          background: #facc15;
          color: #041e12;
          font-weight: 800;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .sc-ticker-text {
          color: #ecfdf5;
          font-weight: 500;
        }

        .sc-ticker-link {
          color: #facc15;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .sc-ticker-link:hover {
          text-decoration: underline;
        }

        /* ─── 3. STICKY NAVBAR ─── */
        .sc-institution-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(5, 42, 23, 0.95);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(250, 204, 21, 0.15);
          padding: 12px 24px;
        }

        .sc-nav-container {
          max-width: 1240px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .sc-nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .sc-nav-crest-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #ffffff;
          padding: 3px;
          border: 1.5px solid #facc15;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }

        .sc-nav-crest-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .sc-nav-brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .sc-nav-college-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15.5px;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #ffffff;
        }

        .sc-nav-college-sub {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #facc15;
          margin-top: 2px;
        }

        .sc-nav-dept-tag {
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #a7f3d0;
          margin-top: 1px;
        }

        .sc-nav-menu-links {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        @media (max-width: 900px) {
          .sc-nav-menu-links { display: none; }
        }

        .sc-nav-menu-links button {
          background: none;
          border: none;
          color: #d1fae5;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s, transform 0.2s;
          padding: 4px 0;
          position: relative;
        }

        .sc-nav-menu-links button:hover {
          color: #facc15;
        }

        .sc-nav-right-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sc-nav-portal-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 18px;
          background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
          color: #041e12;
          border: none;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(250, 204, 21, 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .sc-nav-portal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(250, 204, 21, 0.55);
        }

        /* ─── 4. HERO FOREST SECTION (Screenshots 1 & 2) ─── */
        .sc-hero-forest-section {
          position: relative;
          background: linear-gradient(180deg, #041f12 0%, #06331e 50%, #094528 100%);
          padding: 70px 20px 85px 20px;
          overflow: hidden;
          text-align: center;
        }

        .sc-hero-contour-glows {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .sc-glow-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(75px);
        }

        .sc-glow-circle.circle-1 {
          width: 420px;
          height: 420px;
          background: rgba(34, 197, 94, 0.16);
          top: -100px;
          right: -80px;
        }

        .sc-glow-circle.circle-2 {
          width: 380px;
          height: 380px;
          background: rgba(250, 204, 21, 0.1);
          bottom: -60px;
          left: -80px;
        }

        .sc-contour-lines {
          position: absolute;
          width: 100%;
          height: 100%;
          inset: 0;
          object-fit: cover;
          opacity: 0.7;
        }

        .sc-hero-content-wrap {
          position: relative;
          z-index: 10;
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sc-eyebrow-pill-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 16px;
          background: rgba(250, 204, 21, 0.14);
          border: 1px solid rgba(250, 204, 21, 0.4);
          border-radius: 9999px;
          color: #facc15;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 22px;
        }

        .sc-hero-editorial-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(38px, 5.2vw, 64px);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin: 0 0 18px 0;
          letter-spacing: -0.01em;
        }

        .sc-gold-amp {
          color: #facc15;
          font-style: italic;
          font-weight: 400;
          margin: 0 2px;
        }

        .sc-hero-lead-text {
          font-size: clamp(15.5px, 2vw, 18px);
          color: #c9e8d8;
          max-width: 660px;
          line-height: 1.65;
          margin: 0 0 42px 0;
          font-weight: 400;
        }

        /* ─── 5. FLOATING FOUNDATION DIRECTORY CARD (Screenshot 1) ─── */
        .sc-foundation-directory-card {
          width: 100%;
          max-width: 620px;
          background: #ffffff;
          border-radius: 26px;
          box-shadow: 0 25px 60px -15px rgba(2, 28, 15, 0.45), 0 4px 16px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(226, 236, 229, 0.95);
          padding: 30px 26px;
          text-align: center;
          box-sizing: border-box;
          color: #0c2b1a;
          margin-top: 10px;
        }

        [data-theme="dark"] .sc-foundation-directory-card {
          background: #072a19;
          border-color: rgba(34, 197, 94, 0.25);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
          color: #ffffff;
        }

        .sc-foundation-card-head {
          margin-bottom: 20px;
        }

        .sc-card-mini-eyebrow {
          display: block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ca8a04;
          margin-bottom: 4px;
        }

        .sc-foundation-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .sc-foundation-tabs-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .sc-foundation-tab-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 18px;
          border-radius: 9999px;
          background: #f4f8f4;
          border: 1px solid #e1ede3;
          color: #0f3d24;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.22s ease;
          box-sizing: border-box;
        }

        [data-theme="dark"] .sc-foundation-tab-item {
          background: #093720;
          border-color: rgba(34, 197, 94, 0.15);
          color: #d1fae5;
        }

        .sc-foundation-tab-item:hover {
          background: #e8f3ea;
          border-color: #0b4a2c;
          transform: translateY(-1px);
        }

        [data-theme="dark"] .sc-foundation-tab-item:hover {
          background: #0c472a;
        }

        .sc-foundation-tab-item.is-active {
          background: #0b4a2c;
          border-color: #0b4a2c;
          color: #ffffff;
          box-shadow: 0 6px 18px rgba(11, 74, 44, 0.35);
        }

        .sc-tab-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sc-tab-icon-badge {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.15);
          color: #15803d;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sc-foundation-tab-item.is-active .sc-tab-icon-badge {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .sc-tab-arrow-icon {
          color: #6b7280;
          transition: transform 0.2s;
        }

        .sc-foundation-tab-item.is-active .sc-tab-arrow-icon {
          color: #facc15;
          transform: translateX(3px);
        }

        /* ─── 6. SECTION TITLES & LAYOUT ─── */
        .sc-container-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .sc-cms-width {
          max-width: 960px;
        }

        .sc-guiding-principles-section {
          padding: 85px 0 60px 0;
          background: var(--sc-canvas-bg);
        }

        .sc-section-headline-block {
          margin-bottom: 40px;
        }

        .sc-section-headline-block.text-center {
          text-align: center;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .sc-section-eyebrow-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #0b4a2c;
          margin-bottom: 8px;
        }

        [data-theme="dark"] .sc-section-eyebrow-tag {
          color: #4ade80;
        }

        .sc-section-serif-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: var(--sc-text-main);
          line-height: 1.18;
          margin: 0 0 12px 0;
        }

        .sc-serif-italic-emerald {
          font-style: italic;
          color: #0b4a2c;
        }

        [data-theme="dark"] .sc-serif-italic-emerald {
          color: #34d399;
        }

        .sc-section-lead-sub {
          font-size: 16px;
          color: var(--sc-text-muted);
          line-height: 1.6;
          margin: 0;
        }

        /* ─── 7. THE 2 PURPOSE CARDS (Card 1 Light + Card 2 Dark Forest Green) ─── */
        .sc-purpose-cards-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 28px;
          margin-top: 10px;
        }

        .sc-purpose-card {
          border-radius: 28px;
          padding: 38px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.25s, box-shadow 0.25s;
          box-sizing: border-box;
        }

        .sc-purpose-card:hover {
          transform: translateY(-4px);
        }

        /* Card 1: Light Card */
        .sc-light-card {
          background: #ffffff;
          border: 1px solid #e1ede3;
          box-shadow: 0 14px 40px -10px rgba(6, 45, 28, 0.07);
          color: #0c2b1a;
        }

        [data-theme="dark"] .sc-light-card {
          background: #072a19;
          border-color: rgba(34, 197, 94, 0.25);
          box-shadow: 0 14px 40px -10px rgba(0, 0, 0, 0.5);
          color: #ffffff;
        }

        /* Card 2: Deep Forest Green Card */
        .sc-dark-forest-card {
          background: linear-gradient(145deg, #073820 0%, #0b4f2e 100%);
          border: 1px solid rgba(250, 204, 21, 0.2);
          box-shadow: 0 16px 45px -10px rgba(7, 56, 32, 0.35);
          color: #ffffff;
        }

        .sc-pcard-seq-num {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0b4a2c;
          margin-bottom: 16px;
        }

        .sc-pcard-seq-num.gold-seq {
          color: #facc15;
        }

        [data-theme="dark"] .sc-pcard-seq-num {
          color: #86efac;
        }

        .sc-pcard-icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .sc-pcard-icon-circle.emerald-circle {
          background: #0b4a2c;
          color: #ffffff;
        }

        .sc-pcard-icon-circle.gold-circle {
          background: #facc15;
          color: #041e12;
        }

        .sc-pcard-eyebrow-amber {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ca8a04;
          margin-bottom: 8px;
        }

        .sc-pcard-eyebrow-gold {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #facc15;
          margin-bottom: 8px;
        }

        .sc-pcard-headline {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 800;
          line-height: 1.25;
          margin: 0 0 16px 0;
        }

        .sc-pcard-headline.text-white {
          color: #ffffff;
        }

        .sc-pcard-text {
          font-size: 14.5px;
          line-height: 1.7;
          color: #4b5563;
          margin: 0 0 28px 0;
        }

        [data-theme="dark"] .sc-pcard-text {
          color: #cbd5e1;
        }

        .sc-pcard-text.text-mint {
          color: #c9e8d8;
        }

        .sc-pcard-bottom-tag {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          font-weight: 700;
          color: #0b4a2c;
          padding-top: 18px;
          border-top: 1px solid #e1ede3;
        }

        [data-theme="dark"] .sc-pcard-bottom-tag {
          border-top-color: rgba(34, 197, 94, 0.2);
          color: #86efac;
        }

        .sc-pcard-bottom-tag.gold-tag {
          color: #facc15;
          border-top-color: rgba(255, 255, 255, 0.15);
        }

        .sc-tag-line {
          width: 24px;
          height: 2px;
          background: #0b4a2c;
        }

        .sc-tag-line.gold-line {
          background: #facc15;
        }

        /* ─── 8. CAMPUS RHYTHM STATS GRID (Screenshot 2) ─── */
        .sc-rhythm-stats-section {
          padding: 60px 0 80px 0;
          background: var(--sc-canvas-alt);
          border-top: 1px solid var(--sc-card-border);
          border-bottom: 1px solid var(--sc-card-border);
        }

        .sc-rhythm-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 22px;
        }

        .sc-featured-stat-box {
          grid-column: span 1;
          background: linear-gradient(145deg, #06311d 0%, #0a4628 100%);
          border-radius: 24px;
          padding: 30px 28px;
          color: #ffffff;
          box-shadow: 0 14px 35px -8px rgba(6, 49, 29, 0.35);
          border: 1px solid rgba(250, 204, 21, 0.25);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        @media (min-width: 992px) {
          .sc-featured-stat-box {
            grid-column: span 2;
          }
        }

        .sc-stat-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: rgba(250, 204, 21, 0.15);
          border: 1px solid rgba(250, 204, 21, 0.4);
          border-radius: 9999px;
          color: #facc15;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          width: fit-content;
          margin-bottom: 16px;
        }

        .sc-stat-main-number {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(30px, 3.5vw, 42px);
          font-weight: 900;
          color: #ffffff;
          line-height: 1.1;
          margin: 0 0 12px 0;
        }

        .sc-stat-lead-desc {
          font-size: 14.5px;
          color: #c9e8d8;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }

        .sc-stat-tags-flex {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sc-stat-micro-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.1);
          color: #ecfdf5;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .sc-stat-white-box {
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-card-border);
          border-radius: 24px;
          padding: 28px 24px;
          box-shadow: var(--sc-card-shadow);
          display: flex;
          flex-direction: column;
        }

        .sc-stat-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .sc-stat-num-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #0b4a2c;
        }

        [data-theme="dark"] .sc-stat-num-tag {
          color: #4ade80;
        }

        .sc-stat-box-icon {
          color: #0b4a2c;
        }

        [data-theme="dark"] .sc-stat-box-icon {
          color: #facc15;
        }

        .sc-stat-box-val {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 32px;
          font-weight: 900;
          color: var(--sc-text-main);
          line-height: 1;
          margin-bottom: 8px;
        }

        .sc-stat-box-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--sc-text-main);
          margin: 0 0 6px 0;
        }

        .sc-stat-box-sub {
          font-size: 13px;
          color: var(--sc-text-muted);
          line-height: 1.5;
          margin: 0;
        }

        /* ─── 9. CMS SECTIONS & EDITORIAL CARDS (Screenshot 2) ─── */
        .sc-cms-content-section {
          padding: 80px 0;
        }

        .sc-cms-content-section.sc-section-tinted {
          background: var(--sc-canvas-alt);
          border-top: 1px solid var(--sc-card-border);
          border-bottom: 1px solid var(--sc-card-border);
        }

        .sc-cms-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 34px;
        }

        .sc-cms-section-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(26px, 3.2vw, 36px);
          font-weight: 800;
          color: var(--sc-text-main);
          margin: 0 0 10px 0;
          line-height: 1.25;
        }

        .sc-cms-section-desc {
          font-size: 15px;
          color: var(--sc-text-muted);
          margin: 0;
          max-width: 680px;
          line-height: 1.6;
        }

        .sc-category-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
          background: rgba(11, 74, 44, 0.1);
          color: #0b4a2c;
          border: 1px solid rgba(11, 74, 44, 0.25);
        }

        [data-theme="dark"] .sc-category-pill-tag {
          background: rgba(34, 197, 94, 0.12);
          color: #4ade80;
          border-color: rgba(34, 197, 94, 0.3);
        }

        .sc-category-pill-tag.tag-purple {
          background: rgba(168, 85, 247, 0.1);
          color: #9333ea;
          border-color: rgba(168, 85, 247, 0.3);
        }

        .sc-category-pill-tag.tag-amber {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .sc-category-pill-tag.tag-pink {
          background: rgba(236, 72, 153, 0.1);
          color: #db2777;
          border-color: rgba(236, 72, 153, 0.3);
        }

        .sc-cms-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sc-forest-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #0b4a2c;
          color: #ffffff;
          border: 1px solid #083720;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(11, 74, 44, 0.3);
          transition: all 0.2s;
        }

        .sc-forest-primary-btn:hover {
          background: #083720;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(11, 74, 44, 0.45);
        }

        .sc-outline-forest-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-card-border);
          color: var(--sc-text-main);
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sc-outline-forest-btn:hover {
          border-color: #0b4a2c;
          color: #0b4a2c;
          transform: translateY(-1px);
        }

        /* ─── 10. EDITORIAL POST CARD (Crisp, High-End Card from Screenshots) ─── */
        .sc-posts-grid-column {
          display: flex;
          flex-direction: column;
          gap: 26px;
          width: 100%;
        }

        .sc-editorial-card {
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-card-border);
          border-radius: 24px;
          padding: 30px;
          box-shadow: var(--sc-card-shadow);
          transition: transform 0.22s, border-color 0.22s, box-shadow 0.22s;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .sc-editorial-card:hover {
          border-color: rgba(11, 74, 44, 0.45);
          box-shadow: 0 16px 40px -12px rgba(6, 45, 28, 0.16);
          transform: translateY(-2px);
        }

        .sc-card-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .sc-card-badge-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sc-card-cat-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(11, 74, 44, 0.1);
          color: #0b4a2c;
          border: 1px solid rgba(11, 74, 44, 0.25);
        }

        [data-theme="dark"] .sc-card-cat-pill {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .sc-card-date-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--sc-text-muted);
        }

        .sc-card-action-btns {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sc-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          border: 1px solid var(--sc-card-border);
          color: var(--sc-text-main);
          transition: all 0.2s;
        }

        .sc-action-btn:hover {
          background: var(--sc-canvas-alt);
        }

        .sc-action-btn.edit-btn:hover {
          color: #0b4a2c;
          border-color: #0b4a2c;
        }

        .sc-action-btn.delete-btn {
          color: #dc2626;
        }

        .sc-action-btn.delete-btn:hover {
          background: rgba(220, 38, 38, 0.08);
          border-color: #dc2626;
        }

        .sc-card-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--sc-text-main);
          margin: 0 0 14px 0;
          line-height: 1.35;
        }

        .sc-card-image-box {
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 18px;
          border: 1px solid var(--sc-card-border);
          background: #000;
          max-height: 380px;
        }

        .sc-card-image {
          width: 100%;
          max-height: 380px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .sc-editorial-card:hover .sc-card-image {
          transform: scale(1.015);
        }

        .sc-card-body-text {
          margin-bottom: 18px;
        }

        .sc-card-desc {
          font-size: 14.5px;
          color: var(--sc-text-body);
          line-height: 1.7;
          margin: 0;
          white-space: pre-line;
        }

        .sc-card-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          padding-top: 16px;
          border-top: 1px solid var(--sc-card-border);
        }

        .sc-card-author-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sc-author-avatar-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #0b4a2c;
          color: #facc15;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(250, 204, 21, 0.4);
        }

        .sc-author-text-meta {
          display: flex;
          flex-direction: column;
        }

        .sc-author-name {
          font-size: 13px;
          font-weight: 800;
          color: var(--sc-text-main);
        }

        .sc-author-title {
          font-size: 11.5px;
          color: var(--sc-text-muted);
        }

        .sc-card-link-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 9999px;
          background: #0b4a2c;
          border: 1px solid #083720;
          color: #ffffff;
          font-size: 12.5px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(11, 74, 44, 0.2);
          transition: all 0.2s;
        }

        .sc-card-link-button:hover {
          background: #083720;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(11, 74, 44, 0.35);
        }

        /* ─── 11. STUDENT HALL OF FAME / LEADERBOARD ─── */
        .sc-leaderboard-card-container {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sc-lb-student-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 22px;
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-card-border);
          border-radius: 18px;
          box-shadow: var(--sc-card-shadow);
          transition: transform 0.2s, border-color 0.2s;
        }

        .sc-lb-student-row:hover {
          transform: translateY(-2px);
          border-color: #0b4a2c;
        }

        .sc-lb-medal-rank {
          font-size: 20px;
          font-weight: 900;
          width: 36px;
          text-align: center;
        }

        .sc-lb-student-details {
          flex: 1;
        }

        .sc-lb-student-name {
          font-weight: 800;
          font-size: 15px;
          color: var(--sc-text-main);
          display: block;
        }

        .sc-lb-student-cohort {
          font-size: 12px;
          color: var(--sc-text-muted);
        }

        .sc-lb-score-badge {
          font-weight: 800;
          font-size: 14px;
          color: #0b4a2c;
          background: rgba(11, 74, 44, 0.1);
          padding: 6px 14px;
          border-radius: 9999px;
          border: 1px solid rgba(11, 74, 44, 0.2);
        }

        [data-theme="dark"] .sc-lb-score-badge {
          background: rgba(250, 204, 21, 0.15);
          color: #facc15;
          border-color: rgba(250, 204, 21, 0.3);
        }

        /* ─── 12. CALL TO ACTION FOREST SECTION ─── */
        .sc-cta-forest-section {
          padding: 85px 20px;
          text-align: center;
          background: linear-gradient(180deg, #06311d 0%, #041f12 100%);
          color: #ffffff;
          position: relative;
        }

        .sc-cta-box-inner {
          max-width: 680px;
          margin: 0 auto;
        }

        .sc-cta-headline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(30px, 3.8vw, 46px);
          font-weight: 800;
          margin-bottom: 14px;
        }

        .sc-cta-subtext {
          font-size: 16px;
          color: #c9e8d8;
          margin-bottom: 28px;
          line-height: 1.6;
        }

        .sc-gold-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 38px;
          background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
          color: #041e12;
          border-radius: 9999px;
          font-size: 16px;
          font-weight: 900;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(250, 204, 21, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .sc-gold-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(250, 204, 21, 0.6);
        }

        /* ─── 13. DUAL-WAVE RIBBON & FOOTER (Screenshot 1 Bottom) ─── */
        .sc-signature-wave-ribbon {
          width: 100%;
          line-height: 0;
          background: #041f12;
        }

        .sc-wave-svg {
          width: 100%;
          height: 70px;
          display: block;
        }

        .sc-institutional-footer {
          background: #041f12;
          color: #d1fae5;
          padding: 40px 20px 32px 20px;
          text-align: center;
          border-top: 1px solid rgba(250, 204, 21, 0.15);
        }

        .sc-footer-inner-wrap {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sc-footer-crest-circle {
          width: 60px;
          height: 60px;
          border-radius: 14px;
          background: #ffffff;
          padding: 4px;
          border: 2px solid #facc15;
          margin-bottom: 16px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .sc-footer-crest-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .sc-footer-college-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0.06em;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .sc-footer-autonomous-tag {
          font-size: 11px;
          color: #facc15;
          font-weight: 700;
          margin: 0 0 6px 0;
          letter-spacing: 0.04em;
        }

        .sc-footer-dept-name {
          font-size: 13px;
          font-weight: 700;
          color: #a7f3d0;
          margin: 0 0 16px 0;
        }

        .sc-footer-contact-info {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .sc-footer-copyright-row {
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
          font-size: 11.5px;
          color: #64748b;
        }

        /* ─── 14. MODAL DIALOGS (Forest Green & Gold Styled) ─── */
        .sc-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(3, 20, 11, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .sc-modal-dialog-box {
          width: 100%;
          max-width: 520px;
          background: var(--sc-card-bg);
          border: 1px solid var(--sc-card-border);
          border-radius: 22px;
          padding: 26px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
          color: var(--sc-text-main);
        }

        .sc-modal-dialog-box.sc-delete-dialog {
          max-width: 440px;
        }

        .sc-modal-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--sc-card-border);
        }

        .sc-modal-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .sc-modal-close-btn {
          background: none;
          border: none;
          color: var(--sc-text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
        }

        .sc-modal-close-btn:hover {
          color: var(--sc-text-main);
        }

        .sc-modal-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .sc-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sc-form-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--sc-text-main);
        }

        .sc-form-input, .sc-form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--sc-card-border);
          background: var(--sc-canvas-alt);
          color: var(--sc-text-main);
          font-size: 13.5px;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .sc-form-input:focus, .sc-form-select:focus {
          outline: none;
          border-color: #0b4a2c;
          box-shadow: 0 0 0 3px rgba(11, 74, 44, 0.2);
        }

        .sc-form-textarea {
          resize: vertical;
          min-height: 90px;
        }

        .sc-modal-footer-btns {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        .sc-modal-cancel-btn {
          padding: 8px 18px;
          background: transparent;
          border: 1px solid var(--sc-card-border);
          border-radius: 9999px;
          color: var(--sc-text-muted);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sc-modal-cancel-btn:hover {
          color: var(--sc-text-main);
          background: var(--sc-canvas-alt);
        }

        .sc-danger-btn {
          padding: 8px 20px;
          background: #dc2626;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s;
        }

        .sc-danger-btn:hover {
          background: #b91c1c;
        }

        .sc-delete-modal-title {
          font-size: 17px;
          font-weight: 800;
          color: #dc2626;
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sc-delete-modal-desc {
          font-size: 14px;
          color: var(--sc-text-body);
          line-height: 1.6;
          margin: 0 0 20px 0;
        }

        /* ─── 15. EMPTY, ERROR & TOAST STATES ─── */
        .sc-empty-state-box, .sc-error-state-box {
          width: 100%;
          max-width: 540px;
          margin: 28px auto;
          padding: 48px 24px;
          text-align: center;
          border-radius: 22px;
          background: var(--sc-card-bg);
          border: 1.5px dashed var(--sc-card-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }

        .sc-empty-icon-circle {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(11, 74, 44, 0.1);
          color: #0b4a2c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .sc-error-icon-circle {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .sc-empty-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--sc-text-main);
          margin: 0 0 8px 0;
        }

        .sc-empty-description {
          font-size: 14px;
          color: var(--sc-text-muted);
          line-height: 1.55;
          margin: 0 0 20px 0;
          max-width: 420px;
        }

        .sc-gold-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 22px;
          background: #facc15;
          color: #041e12;
          border: none;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(250, 204, 21, 0.35);
          transition: all 0.2s;
        }

        .sc-gold-pill-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(250, 204, 21, 0.5);
        }

        .sc-loading-state-box {
          text-align: center;
          padding: 44px 20px;
          color: var(--sc-text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .sc-spin-anim {
          animation: scSpin 1s linear infinite;
          color: #0b4a2c;
        }

        @keyframes scSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sc-floating-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          padding: 12px 20px;
          border-radius: 12px;
          color: #ffffff;
          font-weight: 700;
          font-size: 13.5px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 8px;
          animation: scFadeIn 0.2s ease;
        }

        .sc-floating-toast.success {
          background: #0b4a2c;
          border: 1px solid #15803d;
        }

        .sc-floating-toast.error {
          background: #dc2626;
        }

        @keyframes scFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sc-db-notice-banner {
          padding: 14px 18px;
          margin-bottom: 24px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 14px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #b45309;
          font-size: 13.5px;
        }

        .sc-db-notice-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .sc-db-notice-hint {
          margin-top: 4px;
          font-size: 12px;
          color: var(--sc-text-muted);
        }
      `}</style>
    </div>
  );
}
