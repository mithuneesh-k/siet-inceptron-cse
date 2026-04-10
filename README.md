C:\Users\mithu\Inceptron\ssiet-cse-portal\
├── backend\               ← Node.js + Express API (port 5000)
│   ├── db\db.json         ← JSON database (auto-created, 20 seeded students)
│   ├── routes\            ← auth, users, achievements, leaderboard, teams, updates
│   ├── services\          ← live hackathon/internship/job data
│   └── server.js          ← entry point
└── frontend\              ← Vite React app (port 5173)
    └── src\
        ├── pages\         ← Landing, Login, Register, Updates, Profile, Leaderboard, Teams, Admin
        └── components\    ← Navbar, ScoreBadge, AchievementCard, TeamCard, LiveFeedCard

## HOW TO RUN

### Option 1: Run both separately (recommended)
Terminal 1 (Backend):
  cd C:\Users\mithu\Inceptron\ssiet-cse-portal\backend
  node server.js
  → Runs on http://localhost:5000

Terminal 2 (Frontend):
  cd C:\Users\mithu\Inceptron\ssiet-cse-portal\frontend
  npm run dev
  → Runs on http://localhost:5173

### Option 2: Run both together from root
  cd C:\Users\mithu\Inceptron\ssiet-cse-portal
  npm install          ← only needed once
  npm run dev          ← starts both with concurrently

## DEMO CREDENTIALS (all use password: password123)
- Admin:         admin@ssiet.edu
- Top Student:   suresh.b@ssiet.edu   (320 pts, SIH winner, Amazon intern)
- 3rd Year:      arjun.k@ssiet.edu    (225 pts, SIH 2024 winner)
- 2nd Year:      ananya.s@ssiet.edu   (115 pts, Google AI hackathon)
- 1st Year:      pavithra.c@ssiet.edu (15 pts)

## SCORING SYSTEM
| Achievement              | Points |
|--------------------------|--------|
| Hackathon Win (1st)      | +100   |
| Hackathon Win (2nd)      | +60    |
| Hackathon Win (3rd)      | +40    |
| Hackathon Participation  | +10    |
| Internship 3+ months     | +70    |
| Internship 1-3 months    | +40    |
| Internship <1 month      | +20    |
| Online Course            | +15    |
| Project / Side Project   | +25    |
| Certification            | +10    |

## KEY FEATURES
✅ Landing page with animated hero, stats, top-achievers carousel, live feed preview
✅ Live hackathon / internship / job updates (8 hackathons, 8 internships, 6 jobs)
✅ Student profiles with achievement timeline and score breakdown
✅ Scoring system auto-calculates points on achievement submission
✅ Leaderboard with podium for top 3, filters by year and section
✅ Teams: create, join, leave, browse by type (hackathon/project/research)
✅ Admin panel: overview stats, student management, achievement verification
✅ JWT authentication with 7-day session
✅ 20 pre-seeded students across Years 1-4, CSE-A/B/C sections
✅ No native compilation required (uses lowdb, pure JavaScript)
