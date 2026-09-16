# 🚀 SIET Inceptron — CSE Department Portal

**Inceptron** is the premier digital ecosystem for the Computer Science and Engineering department at **Sri Shakthi Institute of Engineering and Technology (SIET), Coimbatore**. It tracks student achievements, facilitates team formation for hackathons, and provides a real-time leaderboard powered by a robust merit-point system.

![Premium Green Theme](https://img.shields.io/badge/Theme-Premium%20Sage%20Green-2A7D14)
![Powered by Supabase](https://img.shields.io/badge/Backend-Supabase-blueviolet)
![React 18](https://img.shields.io/badge/Frontend-React%2018-blue)

---

## 🏛️ Governance & Role Architecture

Inceptron implements a multi-tier authorization system to ensure data integrity and departmental oversight.

### 👑 HOD & Principal Admins
*   Full departmental oversight.
*   **Faculty Management**: Assign class advisors to specific batches and sections.
*   **Global Administration**: Manage all students, verify all achievements, and moderate the live feed.
*   **Bulk Actions**: CSV imports and global data exports.

### 👨‍🏫 Faculty Advisors
*   **Autonomous Management**: Full CRUD access to students within their *assigned* class and batch (e.g., CSE-C, 2025-2029).
*   **Achievement Approval**: Review and verify/reject achievement requests submitted by their own students.
*   **Class Dashboard**: A dedicated "Advisor Mode" view to track class progress at a glance.

### 👩‍💻 Students
*   **Merit Tracking**: Request approval for hackathons, internships, and certifications.
*   **Team Formation**: Create or join teams for upcoming competitions.
*   **Real-time Leaderboard**: See where they stand in their section, year, or the entire department.

---

## 🏅 Merit Point & Approval System

To maintain the highest standards of competition, points are only awarded after verification by an authorized advisor or admin.

| Achievement Type          | Detail                    | Points |
|---------------------------|---------------------------|--------|
| **Hackathon**             | 🥇 1st Place             | +100   |
| **Hackathon**             | 🥈 2nd Place             | +60    |
| **Hackathon**             | 🥉 3rd Place             | +40    |
| **Hackathon**             | 🎖️ Participation         | +10    |
| **Internship**            | ⏱️ Long (3+ Months)      | +70    |
| **Internship**            | ⏱️ Medium (1-3 Months)    | +40    |
| **Internship**            | ⏱️ Short (< 1 Month)      | +20    |
| **Course**                | 📚 Certification / Side   | +15    |
| **Project**               | 🚀 Live Deployment       | +25    |

> **Workflow**: Student Submits → Achievement Marked as **Pending** (No Points) → Advisor Approves → **Verified** (Points Awarded).

---

## 🛠️ Technology Stack

*   **Frontend**: React 18, Vite, Vanilla CSS (Premium Sage Green Theme).
*   **Backend**: Node.js, Express.
*   **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
*   **Authentication**: JWT-based secure sessions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project (URL and Service Key configured in `.env`)

### Installation & Launch

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/mithuneesh-k/siet-inceptron-cse.git
    cd siet-inceptron-cse
    ```

3.  **Environment Setup**:
    Create a `.env` file in the `backend/` directory (and optionally in root):
    ```env
    PORT=5000
    JWT_SECRET=your_secure_random_string
    SUPABASE_URL=your_primary_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_primary_service_role_key
    
    # Optional Platform Integration Database:
    PLATFORM_SUPABASE_URL=your_platform_supabase_url
    PLATFORM_SUPABASE_SERVICE_ROLE_KEY=your_platform_service_role_key
    ```
    Create a `.env` file in the `frontend/` directory (optional if defaulting to port 5000):
    ```env
    VITE_API_BASE_URL=http://localhost:5000/api
    ```

4.  **Database Migrations**:
    For existing database setups, run the idempotent SQL migration scripts located under [`backend/db/migrations/`](file:///c:/Users/nijju/csmin/siet-inceptron-cse/backend/db/migrations/):
    - `001_create_platform_connections.sql`
    - `002_secure_supabase_rls_and_policies.sql`

5.  **Launch the System**:
    From the root directory, run:
    ```bash
    npm install
    npm run install:all
    npm run dev
    ```
    *   **Frontend Local**: http://localhost:5173
    *   **Backend Local**: http://localhost:5000 (Production `PORT` may be controlled dynamically by Render or host environment)

---

## 📂 Project Structure

```text
├── backend/
│   ├── routes/          # API Handlers (Achievements, Admin, Auth, etc.)
│   ├── middleware/      # Auth & Admin Guards
│   ├── db/              # Supabase Client & Scoping Logic
│   └── server.js        # Express Entry Point
└── frontend/
    └── src/
        ├── pages/       # Admin, Profile, Leaderboard, Teams
        ├── components/  # AchievementCard, Navbar, Modals
        └── contexts/    # AuthContext for role management
```

---

## ✨ Developed by
**CSE Department — Sri Shakthi Institute of Engineering and Technology**
*Helping students turn their achievements into milestones.*
