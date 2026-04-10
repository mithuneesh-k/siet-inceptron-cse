// Mock live data service for hackathons, internships, and jobs
// In production: replace with Rapid API / RSS feed fetchers

const mockHackathons = [
  {
    id: 'h1', title: 'Smart India Hackathon 2025', organizer: 'Government of India',
    deadline: '2025-05-15', mode: 'Hybrid', prize: '₹1,00,000', tags: ['AI/ML', 'GovTech', 'Open Innovation'],
    link: 'https://sih.gov.in', logo: '🏛️', difficulty: 'National Level',
    description: "India's biggest hackathon. Teams of 6. Problem statements from central ministries and PSUs."
  },
  {
    id: 'h2', title: 'HackIndia Sprint 10', organizer: 'HackIndia Foundation',
    deadline: '2025-04-28', mode: 'Online', prize: '₹50,000', tags: ['Web3', 'AI', 'Open Source'],
    link: 'https://hackindia.xyz', logo: '⚡', difficulty: 'National Level',
    description: 'Monthly online hackathon by HackIndia. Individual or teams of up to 4. Cash prizes and internship offers.'
  },
  {
    id: 'h3', title: 'Devfolio Fellowship Hackathon 2025', organizer: 'Devfolio',
    deadline: '2025-05-01', mode: 'Online', prize: '$10,000 USD', tags: ['Blockchain', 'DeFi', 'IPFS'],
    link: 'https://devfolio.co', logo: '🔷', difficulty: 'International',
    description: 'Build on Web3 with Ethereum, Polygon, and Solana. Top prizes from major sponsors.'
  },
  {
    id: 'h4', title: 'Google Solution Challenge 2025', organizer: 'Google',
    deadline: '2025-03-30', mode: 'Online', prize: 'Google swag + interview fast-track', tags: ['Flutter', 'Firebase', 'UN SDGs'],
    link: 'https://developers.google.com/community/gdsc', logo: '🟢', difficulty: 'Global',
    description: 'Build solutions for UN Sustainable Development Goals using Google tech. Top 100 teams get global recognition.'
  },
  {
    id: 'h5', title: 'IIT Bombay TechFest Hackathon 2025', organizer: 'IIT Bombay',
    deadline: '2025-06-10', mode: 'Hybrid', prize: '₹75,000', tags: ['Robotics', 'AI', 'Smart City'],
    link: 'https://techfest.org', logo: '🤖', difficulty: 'National Level',
    description: 'Flagship hackathon of Asia\'s largest science & technology festival. Held at IIT Bombay campus.'
  },
  {
    id: 'h6', title: 'Unstop GenAI Hackathon', organizer: 'Unstop + IBM',
    deadline: '2025-04-20', mode: 'Online', prize: '₹30,000 + Internship offer', tags: ['Generative AI', 'LLM', 'IBM Watson'],
    link: 'https://unstop.com', logo: '🧠', difficulty: 'National Level',
    description: 'Build impactful GenAI solutions using IBM Watson. Top teams get placement offers at IBM India.'
  },
  {
    id: 'h7', title: 'Coimbatore Smart City Hackathon', organizer: 'Coimbatore Municipal Corporation',
    deadline: '2025-05-05', mode: 'Offline', prize: '₹40,000', tags: ['Smart City', 'IoT', 'Urban Tech'],
    link: '#', logo: '🏙️', difficulty: 'State Level',
    description: 'Build solutions for Coimbatore\'s urban challenges — traffic, waste, water management. Open to all Tamil Nadu colleges.'
  },
  {
    id: 'h8', title: 'HackWithInfy 2025', organizer: 'Infosys',
    deadline: '2025-06-30', mode: 'Online', prize: 'PPO + ₹1,50,000', tags: ['Java', 'Cloud', 'Enterprise'],
    link: 'https://hackwithinfy.com', logo: '💙', difficulty: 'National Level',
    description: 'Infosys national hackathon for engineering students. Winners get Pre-Placement Offers (PPO) at Infosys.'
  },
];

const mockInternships = [
  {
    id: 'i1', title: 'Software Development Intern', company: 'Zoho Corporation',
    location: 'Chennai / Hybrid', duration: '6 months', stipend: '₹15,000/month',
    tags: ['Java', 'Python', 'Full Stack'], link: 'https://careers.zoho.com', logo: '🟠',
    deadline: '2025-05-31', description: 'Build features for Zoho CRM, Books, or Cliq. Open to 3rd and 4th year students. PPO possible.'
  },
  {
    id: 'i2', title: 'Data Science Intern', company: 'TCS iON',
    location: 'Remote', duration: '3 months', stipend: '₹10,000/month',
    tags: ['Python', 'Machine Learning', 'SQL'], link: 'https://ibegin.tcs.com', logo: '🔵',
    deadline: '2025-04-30', description: 'Work on assessment platform analytics. Certificate + letter of recommendation provided.'
  },
  {
    id: 'i3', title: 'DevOps Engineering Intern', company: 'Freshworks',
    location: 'Chennai, TN', duration: '2 months', stipend: '₹25,000/month',
    tags: ['Docker', 'Kubernetes', 'CI/CD'], link: 'https://www.freshworks.com/careers/', logo: '🌿',
    deadline: '2025-05-15', description: 'Assist in maintaining Freshdesk infrastructure. Strong stipend. Open to 3rd year students.'
  },
  {
    id: 'i4', title: 'AI/ML Research Intern', company: 'IIT Madras — RBCDSAI',
    location: 'Chennai (On-site)', duration: '2–3 months', stipend: 'Stipend negotiable',
    tags: ['Python', 'Deep Learning', 'NLP'], link: 'https://rbcdsai.iitm.ac.in', logo: '🎓',
    deadline: '2025-04-25', description: 'Research internship at IIT Madras\'s AI center. Work on NLP, computer vision, or time-series problems.'
  },
  {
    id: 'i5', title: 'Mobile App Developer Intern', company: 'Chargebee',
    location: 'Chennai / Remote', duration: '3 months', stipend: '₹20,000/month',
    tags: ['React Native', 'Flutter', 'Firebase'], link: 'https://www.chargebee.com/careers/', logo: '⚡',
    deadline: '2025-05-20', description: 'Build and improve Chargebee\'s mobile billing experience. Collaborative team, good mentorship.'
  },
  {
    id: 'i6', title: 'Cybersecurity Intern', company: 'Wipro — CyberDefense',
    location: 'Bangalore / Hybrid', duration: '2 months', stipend: '₹12,000/month',
    tags: ['Network Security', 'SIEM', 'Penetration Testing'], link: 'https://careers.wipro.com', logo: '🟣',
    deadline: '2025-05-10', description: 'Hands-on internship in SOC environment. Exposure to Splunk, CrowdStrike, and incident response.'
  },
  {
    id: 'i7', title: 'Cloud Infrastructure Intern', company: 'Infosys — Cloud & Edge Practice',
    location: 'Coimbatore / Remote', duration: '3 months', stipend: '₹10,000/month',
    tags: ['AWS', 'Terraform', 'Linux'], link: 'https://infosys.com/careers', logo: '💙',
    deadline: '2025-06-01', description: 'Manage cloud migrations and infrastructure-as-code pipelines. AWS or Azure experience preferred.'
  },
  {
    id: 'i8', title: 'UI/UX Design Intern', company: 'Kissflow',
    location: 'Chennai (On-site)', duration: '2 months', stipend: '₹15,000/month',
    tags: ['Figma', 'User Research', 'Prototyping'], link: 'https://kissflow.com/careers', logo: '🎨',
    deadline: '2025-04-28', description: 'Design intuitive workflows for Kissflow\'s no-code platform. Figma portfolio required.'
  },
];

const mockJobs = [
  {
    id: 'j1', title: 'Associate Software Engineer', company: 'Zoho Corporation',
    location: 'Chennai, TN', type: 'Full Time', package: '₹6.5–10 LPA',
    tags: ['Java', 'JavaScript', 'Python'], link: 'https://careers.zoho.com', logo: '🟠',
    deadline: '2025-05-31', description: 'Off-campus drive for 2025 batch. Build products used by millions. ZEAL test required.'
  },
  {
    id: 'j2', title: 'System Engineer', company: 'TCS',
    location: 'Pan India', type: 'Full Time', package: '₹3.36 LPA',
    tags: ['Java', 'SQL', 'Problem Solving'], link: 'https://ibegin.tcs.com', logo: '🔵',
    deadline: '2025-05-15', description: '2025 batch off-campus. TCS NQT exam. Multiple locations. Good learning environment.'
  },
  {
    id: 'j3', title: 'Software Developer — CSE Freshers', company: 'Freshworks',
    location: 'Chennai, TN', type: 'Full Time', package: '₹12–15 LPA',
    tags: ['Ruby', 'React', 'PostgreSQL'], link: 'https://www.freshworks.com/careers/', logo: '🌿',
    deadline: '2025-04-30', description: 'FAANG-level product company. Competitive package, global exposure, and great work culture.'
  },
  {
    id: 'j4', title: 'Graduate Engineer Trainee (CSE)', company: 'HCL Technologies',
    location: 'Coimbatore / Chennai', type: 'Full Time', package: '₹3.84–4.5 LPA',
    tags: ['C++', 'Java', 'Cloud'], link: 'https://careers.hcltech.com', logo: '🟢',
    deadline: '2025-06-15', description: 'Large MNC with strong Tamil Nadu presence. Excellent training program for freshers.'
  },
  {
    id: 'j5', title: 'SDE-1 (Frontend)', company: 'Chargebee',
    location: 'Chennai (Hybrid)', type: 'Full Time', package: '₹10–14 LPA',
    tags: ['React', 'TypeScript', 'REST APIs'], link: 'https://chargebee.com/careers', logo: '⚡',
    deadline: '2025-05-20', description: 'Growing SaaS company. Work on billing and subscription management interfaces used globally.'
  },
  {
    id: 'j6', title: 'Data Analyst — Fresher', company: 'Cognizant',
    location: 'Bangalore / Hybrid', type: 'Full Time', package: '₹4.5–6 LPA',
    tags: ['SQL', 'Power BI', 'Python'], link: 'https://careers.cognizant.com', logo: '💙',
    deadline: '2025-05-28', description: 'Work on business intelligence and reporting for Fortune 500 clients. GenC Analyst track.'
  },
];

let cache = { hackathons: null, internships: null, jobs: null, lastFetch: null };
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

function getLiveData() {
  const now = Date.now();
  if (!cache.lastFetch || (now - cache.lastFetch) > CACHE_TTL) {
    cache.hackathons = mockHackathons;
    cache.internships = mockInternships;
    cache.jobs = mockJobs;
    cache.lastFetch = now;
  }
  return cache;
}

module.exports = { getLiveData };
