// Live data service — fetches hackathons from Unstop + Devpost, mock internships & jobs

const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours
let cache = { hackathons: [], internships: [], jobs: [], lastFetch: null };

// ─── Unstop ────────────────────────────────────────────────────────────────
async function fetchUnstopHackathons() {
  try {
    const res = await fetch(
      'https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1&per_page=15&oppstatus=open&quickApply=true'
    );
    const data = await res.json();
    return (data.data?.data || []).map((h) => ({
      id: `unstop-${h.id || h.title}`,
      title: h.title,
      link: `https://unstop.com/${h.public_url}`,
      organizer: h.organisation?.name || 'Unknown',
      logo: h.banner_mobile?.image_url || '',
      deadline: h.end_date || '',
      startDate: h.start_date ? new Date(h.start_date).toLocaleDateString() : '',
      endDate: h.end_date ? new Date(h.end_date).toLocaleDateString() : '',
      currency: h.prizes?.[0]?.currency || 'INR',
      prize: (h.prizes || []).reduce((acc, c) => acc + (c?.cash ?? 0), 0).toLocaleString(),
      location: h.region || 'Online',
      tags: (h.filters || []).map((f) => f.name),
      source: 'unstop',
      registrationCount: h.registerCount || 0,
      mode: h.region || 'Online',
      difficulty: h.difficulty || 'Beginner',
    }));
  } catch (e) {
    console.error('Unstop fetch failed:', e.message);
    return [];
  }
}

// ─── Devpost ───────────────────────────────────────────────────────────────
async function fetchDevpostHackathons() {
  try {
    const res = await fetch('https://devpost.com/api/hackathons?page=1');
    const data = await res.json();
    return (data.hackathons || []).map((h) => ({
      id: `devpost-${h.id || h.title}`,
      title: h.title,
      link: h.url,
      organizer: h.organization_name || 'Unknown',
      logo: h.thumbnail_url || '',
      deadline: h.submission_period_dates?.split(' - ')[1] || '',
      startDate: h.submission_period_dates?.split(' - ')[0] || '',
      endDate: h.submission_period_dates?.split(' - ')[1] || '',
      prize: h.prize_amount || '0',
      location: h.displayed_location?.location || 'Online',
      tags: (h.themes || []).map((t) => t.name),
      source: 'devpost',
      registrationCount: h.registrations_count || 0,
      mode: h.displayed_location?.location || 'Online',
      difficulty: 'Open',
    }));
  } catch (e) {
    console.error('Devpost fetch failed:', e.message);
    return [];
  }
}

// ─── Mock fallbacks ────────────────────────────────────────────────────────
const mockInternships = [
  { id: 'i1', title: 'Software Development Intern', company: 'Zoho Corporation', location: 'Chennai / Hybrid', duration: '6 months', stipend: '₹15,000/month', tags: ['Java', 'Python', 'Full Stack'], link: 'https://careers.zoho.com', logo: '🟠', deadline: '2025-05-31', description: 'Build features for Zoho CRM, Books, or Cliq. Open to 3rd and 4th year students. PPO possible.' },
  { id: 'i2', title: 'Data Science Intern', company: 'TCS iON', location: 'Remote', duration: '3 months', stipend: '₹10,000/month', tags: ['Python', 'Machine Learning', 'SQL'], link: 'https://ibegin.tcs.com', logo: '🔵', deadline: '2025-04-30', description: 'Work on assessment platform analytics. Certificate + letter of recommendation provided.' },
  { id: 'i3', title: 'DevOps Engineering Intern', company: 'Freshworks', location: 'Chennai, TN', duration: '2 months', stipend: '₹25,000/month', tags: ['Docker', 'Kubernetes', 'CI/CD'], link: 'https://www.freshworks.com/careers/', logo: '🌿', deadline: '2025-05-15', description: 'Assist in maintaining Freshdesk infrastructure. Strong stipend. Open to 3rd year students.' },
  { id: 'i4', title: 'AI/ML Research Intern', company: 'IIT Madras — RBCDSAI', location: 'Chennai (On-site)', duration: '2–3 months', stipend: 'Stipend negotiable', tags: ['Python', 'Deep Learning', 'NLP'], link: 'https://rbcdsai.iitm.ac.in', logo: '🎓', deadline: '2025-04-25', description: "Research internship at IIT Madras's AI center. Work on NLP, computer vision, or time-series problems." },
  { id: 'i5', title: 'Mobile App Developer Intern', company: 'Chargebee', location: 'Chennai / Remote', duration: '3 months', stipend: '₹20,000/month', tags: ['React Native', 'Flutter', 'Firebase'], link: 'https://www.chargebee.com/careers/', logo: '⚡', deadline: '2025-05-20', description: "Build and improve Chargebee's mobile billing experience. Collaborative team, good mentorship." },
  { id: 'i6', title: 'Cybersecurity Intern', company: 'Wipro — CyberDefense', location: 'Bangalore / Hybrid', duration: '2 months', stipend: '₹12,000/month', tags: ['Network Security', 'SIEM', 'Penetration Testing'], link: 'https://careers.wipro.com', logo: '🟣', deadline: '2025-05-10', description: 'Hands-on internship in SOC environment. Exposure to Splunk, CrowdStrike, and incident response.' },
  { id: 'i7', title: 'Cloud Infrastructure Intern', company: 'Infosys — Cloud & Edge Practice', location: 'Coimbatore / Remote', duration: '3 months', stipend: '₹10,000/month', tags: ['AWS', 'Terraform', 'Linux'], link: 'https://infosys.com/careers', logo: '💙', deadline: '2025-06-01', description: 'Manage cloud migrations and infrastructure-as-code pipelines. AWS or Azure experience preferred.' },
  { id: 'i8', title: 'UI/UX Design Intern', company: 'Kissflow', location: 'Chennai (On-site)', duration: '2 months', stipend: '₹15,000/month', tags: ['Figma', 'User Research', 'Prototyping'], link: 'https://kissflow.com/careers', logo: '🎨', deadline: '2025-04-28', description: "Design intuitive workflows for Kissflow's no-code platform. Figma portfolio required." },
];

const mockJobs = [
  { id: 'j1', title: 'Associate Software Engineer', company: 'Zoho Corporation', location: 'Chennai, TN', type: 'Full Time', package: '₹6.5–10 LPA', tags: ['Java', 'JavaScript', 'Python'], link: 'https://careers.zoho.com', logo: '🟠', deadline: '2025-05-31', description: 'Off-campus drive for 2025 batch. Build products used by millions. ZEAL test required.' },
  { id: 'j2', title: 'System Engineer', company: 'TCS', location: 'Pan India', type: 'Full Time', package: '₹3.36 LPA', tags: ['Java', 'SQL', 'Problem Solving'], link: 'https://ibegin.tcs.com', logo: '🔵', deadline: '2025-05-15', description: '2025 batch off-campus. TCS NQT exam. Multiple locations. Good learning environment.' },
  { id: 'j3', title: 'Software Developer — CSE Freshers', company: 'Freshworks', location: 'Chennai, TN', type: 'Full Time', package: '₹12–15 LPA', tags: ['Ruby', 'React', 'PostgreSQL'], link: 'https://www.freshworks.com/careers/', logo: '🌿', deadline: '2025-04-30', description: 'FAANG-level product company. Competitive package, global exposure, and great work culture.' },
  { id: 'j4', title: 'Graduate Engineer Trainee (CSE)', company: 'HCL Technologies', location: 'Coimbatore / Chennai', type: 'Full Time', package: '₹3.84–4.5 LPA', tags: ['C++', 'Java', 'Cloud'], link: 'https://careers.hcltech.com', logo: '🟢', deadline: '2025-06-15', description: 'Large MNC with strong Tamil Nadu presence. Excellent training program for freshers.' },
  { id: 'j5', title: 'SDE-1 (Frontend)', company: 'Chargebee', location: 'Chennai (Hybrid)', type: 'Full Time', package: '₹10–14 LPA', tags: ['React', 'TypeScript', 'REST APIs'], link: 'https://chargebee.com/careers', logo: '⚡', deadline: '2025-05-20', description: 'Growing SaaS company. Work on billing and subscription management interfaces used globally.' },
  { id: 'j6', title: 'Data Analyst — Fresher', company: 'Cognizant', location: 'Bangalore / Hybrid', type: 'Full Time', package: '₹4.5–6 LPA', tags: ['SQL', 'Power BI', 'Python'], link: 'https://careers.cognizant.com', logo: '💙', deadline: '2025-05-28', description: 'Work on business intelligence and reporting for Fortune 500 clients. GenC Analyst track.' },
];

// ─── Public API ────────────────────────────────────────────────────────────
async function getLiveData() {
  const now = Date.now();
  if (!cache.lastFetch || (now - cache.lastFetch) > CACHE_TTL) {
    const [unstop, devpost] = await Promise.all([
      fetchUnstopHackathons(),
      fetchDevpostHackathons(),
    ]);
    cache.hackathons = [...unstop, ...devpost];
    cache.internships = mockInternships;
    cache.jobs = mockJobs;
    cache.lastFetch = now;
  }
  return cache;
}

module.exports = { getLiveData };
