// Live data service — fetches hackathons from Unstop + Devpost, mock internships & jobs

const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours
let cache = { hackathons: [], internships: [], jobs: [], lastFetch: null };

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

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
      description: stripHtml(h.details || h.seo_description || ''),
    }));
  } catch (e) {
    console.error('Unstop fetch failed:', e.message);
    return [];
  }
}

// ─── Unstop Internships ──────────────────────────────────────────────────────
async function fetchUnstopInternships() {
  try {
    const res = await fetch(
      'https://unstop.com/api/public/opportunity/search-result?opportunity=internships&page=1&per_page=18&oppstatus=open&sortBy=&orderBy=&filter_condition=&undefined=true'
    );
    const data = await res.json();
    return (data.data?.data || []).map((item) => ({
      id: `unstop-intern-${item.id}`,
      title: item.title,
      company: item.organisation?.name,
      companyId: item.organisation?.id,
      type: item.type,
      subtype: item.subtype,
      status: item.status,
      region: item.region,
      isPaid: item.isPaid,
      updatedAt: item.updated_at,
      description: stripHtml(item.details),
      link: item.seo_url || item.short_url || item.public_url,
      logo: item.organisation?.logoUrl2 || '',
      workFunctions: item.workfunction?.map((wf) => wf.name) || [],
      eligibility: item.filters?.map((f) => f.name) || [],
      tags: item.tags?.map((t) => t.name ?? t) || [],
      address: item.address_with_country_logo,
      registrationOpen: item.regn_open === 1,
      source: 'unstop',
      // Map to frontend expected fields
      stipend: item.isPaid ? (item.stipend || 'Stipend not specified') : 'Unpaid',
      deadline: item.end_date || '',
      location: item.region || 'Online',
      mode: item.region || 'Online',
      difficulty: item.difficulty || 'Beginner',
    }));
  } catch (e) {
    console.error('Unstop internships fetch failed:', e.message);
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

// ─── Unstop Jobs ─────────────────────────────────────────────────────────────
async function fetchUnstopJobs() {
  try {
    const res = await fetch(
      'https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&page=1&per_page=18&oppstatus=open'
    );
    const data = await res.json();
    const liveJobs = (data.data?.data || []).map((item) => ({
      id: `unstop-job-${item.id}`,
      title: item.title,
      company: item.organisation?.name || 'Tech Company',
      companyId: item.organisation?.id,
      type: item.type || 'Full Time',
      subtype: item.subtype,
      status: item.status,
      region: item.region || 'India',
      location: item.region || 'Pan India',
      package: item.job_detail?.ctc_breakup || item.job_detail?.salary || item.ctc || (item.isPaid ? 'Competitive CTC' : 'As per Industry Standards'),
      tags: (item.filters || item.tags || []).map((f) => f.name ?? f).slice(0, 4),
      link: item.seo_url || item.short_url || item.public_url ? (item.public_url?.startsWith('http') ? item.public_url : `https://unstop.com/${item.public_url || item.seo_url}`) : 'https://unstop.com/jobs',
      logo: item.organisation?.logoUrl2 || item.banner_mobile?.image_url || '',
      deadline: item.end_date || '',
      description: stripHtml(item.details || item.job_detail?.about || ''),
      source: 'unstop',
      difficulty: item.difficulty || 'Entry Level',
      mode: item.region || 'Full Time',
    }));

    return liveJobs.length > 0 ? liveJobs : mockJobs;
  } catch (e) {
    console.error('Unstop jobs fetch failed:', e.message);
    return mockJobs;
  }
}

// ─── Mock fallbacks ────────────────────────────────────────────────────────
const mockJobs = [
  { id: 'j1', title: 'Associate Software Engineer', company: 'Zoho Corporation', location: 'Chennai, TN', type: 'Full Time', package: '₹6.5–10 LPA', tags: ['Java', 'JavaScript', 'Python'], link: 'https://careers.zoho.com', logo: '🟠', deadline: '2026-05-31', description: 'Off-campus drive for CSE batch. Build products used by millions. ZEAL test required.' },
  { id: 'j2', title: 'System Engineer', company: 'TCS', location: 'Pan India', type: 'Full Time', package: '₹3.36 LPA', tags: ['Java', 'SQL', 'Problem Solving'], link: 'https://ibegin.tcs.com', logo: '🔵', deadline: '2026-05-15', description: 'CSE batch off-campus. TCS NQT exam. Multiple locations. Good learning environment.' },
  { id: 'j3', title: 'Software Developer — CSE Freshers', company: 'Freshworks', location: 'Chennai, TN', type: 'Full Time', package: '₹12–15 LPA', tags: ['Ruby', 'React', 'PostgreSQL'], link: 'https://www.freshworks.com/careers/', logo: '🌿', deadline: '2026-04-30', description: 'FAANG-level product company. Competitive package, global exposure, and great work culture.' },
  { id: 'j4', title: 'Graduate Engineer Trainee (CSE)', company: 'HCL Technologies', location: 'Coimbatore / Chennai', type: 'Full Time', package: '₹3.84–4.5 LPA', tags: ['C++', 'Java', 'Cloud'], link: 'https://careers.hcltech.com', logo: '🟢', deadline: '2026-06-15', description: 'Large MNC with strong Tamil Nadu presence. Excellent training program for freshers.' },
  { id: 'j5', title: 'SDE-1 (Frontend)', company: 'Chargebee', location: 'Chennai (Hybrid)', type: 'Full Time', package: '₹10–14 LPA', tags: ['React', 'TypeScript', 'REST APIs'], link: 'https://chargebee.com/careers', logo: '⚡', deadline: '2026-05-20', description: 'Growing SaaS company. Work on billing and subscription management interfaces used globally.' },
  { id: 'j6', title: 'Data Analyst — Fresher', company: 'Cognizant', location: 'Bangalore / Hybrid', type: 'Full Time', package: '₹4.5–6 LPA', tags: ['SQL', 'Power BI', 'Python'], link: 'https://careers.cognizant.com', logo: '💙', deadline: '2026-05-28', description: 'Work on business intelligence and reporting for Fortune 500 clients. GenC Analyst track.' },
];

// ─── Public API ────────────────────────────────────────────────────────────
async function getLiveData() {
  const now = Date.now();
  if (!cache.lastFetch || (now - cache.lastFetch) > CACHE_TTL) {
    const [unstop, devpost, internships, jobs] = await Promise.all([
      fetchUnstopHackathons(),
      fetchDevpostHackathons(),
      fetchUnstopInternships(),
      fetchUnstopJobs(),
    ]);
    cache.hackathons = [...unstop, ...devpost];
    cache.internships = internships;
    cache.jobs = jobs;
    cache.lastFetch = now;
  }
  return cache;
}

module.exports = { getLiveData };
