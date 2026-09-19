# 🚀 SIET Inceptron — CSE Department Portal

**Inceptron** is the premier digital ecosystem for the Computer Science and Engineering department at **Sri Shakthi Institute of Engineering and Technology (SIET), Coimbatore**. It tracks student achievements, facilitates team formation for hackathons, and provides a real-time leaderboard powered by a robust merit-point system.

![Premium Green Theme](https://img.shields.io/badge/Theme-Dark%20Sage%20Green-10B981)
![Powered by Supabase](https://img.shields.io/badge/Backend-Supabase-blueviolet)
![React 18](https://img.shields.io/badge/Frontend-React%2018-blue)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF)

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

*   **Frontend**: React 18, Vite, Vanilla CSS (Dark Sage Green Theme with light mode support).
*   **Backend**: Node.js, Express.
*   **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
*   **Authentication**: JWT-based secure sessions.

---

## 💻 Local Development Setup

Follow these steps to set up and run the portal on your local machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mithuneesh-k/siet-inceptron-cse.git
   cd siet-inceptron-cse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   npm run install:all
   ```

3. **Configure Environment Variables**:
   - Create `backend/.env` using `backend/.env.example` as a template.
   - Create `frontend/.env` using `frontend/.env.example` as a template.

4. **Run Database Migrations**:
   Execute the migration scripts located in `backend/db/migrations/` in your Supabase SQL Editor in the appropriate logical order:
   - `backend/db/migrations/create_platform_connections.sql` (Creates platform connections schema)
   - `backend/db/migrations/002_secure_supabase_rls_and_policies.sql` (Configures security policies)
   - `backend/db/migrations/003_delete_faculty_rpc.sql` (Adds hardened faculty RPC helpers)
   - `backend/db/migrations/004_announcement_images.sql` (Adds image support for announcements)

5. **Start Development Servers**:
   ```bash
   npm run dev
   ```

6. **Access Local Services**:
   - **Frontend Application**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`
   - **Health Check**: `http://localhost:5000/api/health`

---

## 🔑 Environment Variables

> [!IMPORTANT]
> Never commit `.env` files or expose confidential credentials (such as Supabase service-role keys) in frontend code or public repositories. `.env.example` files serve as templates.

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace_with_a_long_secure_random_value
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PLATFORM_SUPABASE_URL=https://your-platform-project.supabase.co
PLATFORM_SUPABASE_SERVICE_ROLE_KEY=your_platform_service_role_key
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🗄️ Database Migrations

The repository includes migration scripts under `backend/db/migrations/`:

| Migration File | Description |
|----------------|-------------|
| `backend/db/migrations/create_platform_connections.sql` | Table structures & constraints for external platform integration (Codeforces, LeetCode, etc.). |
| `backend/db/migrations/002_secure_supabase_rls_and_policies.sql` | Hardened Row Level Security (RLS) policies for users, students, and faculty. |
| `backend/db/migrations/003_delete_faculty_rpc.sql` | Safe RPC procedure for faculty record deletion. |
| `backend/db/migrations/004_announcement_images.sql` | Adds optional image banner support to department announcements. |

Run these scripts in your primary/platform Supabase SQL editor as required by your environment setup. Always verify column existence and target tables prior to execution.

---

## 🌐 Production Deployment Guide

### Backend (Render Deployment)
1. Create a new **Web Service** on Render connected to your repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci`
   - **Start Command**: `npm start`
3. In the Render Environment Variables tab, configure:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET` (generate a high-entropy secret)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `PLATFORM_SUPABASE_URL` and `PLATFORM_SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL`: Set to your deployed Vercel URL (e.g., `https://your-frontend.vercel.app`). Multiple origins can be specified separated by commas (e.g. `https://your-frontend.vercel.app,http://localhost:5173`).

### Frontend (Vercel Deployment)
1. Import the repository into Vercel.
2. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. In Environment Variables, set:
   - `VITE_API_BASE_URL=https://your-render-backend.onrender.com/api`

---

## 📂 Project Structure

```text
├── backend/
│   ├── db/              # Supabase Client, Migrations & RLS Logic
│   ├── middleware/      # Auth & Admin Guards
│   ├── routes/          # API Handlers (Achievements, Admin, Auth, Platforms, etc.)
│   └── server.js        # Express Entry Point & CORS Setup
└── frontend/
    ├── src/
    │   ├── api/         # Axios API Client & Base Configuration
    │   ├── components/  # Modals, Navbar, Cards, Announcements Feed
    │   ├── contexts/    # AuthContext & Role Management
    │   ├── pages/       # Admin, Profile, Leaderboard, Platforms, Teams
    │   └── index.css    # Global Sage Green Design System
    └── package.json     # Frontend Dependencies & Scripts
```

---

## ✨ Developed by
**CSE Department — Sri Shakthi Institute of Engineering and Technology**  
*Helping students turn their achievements into milestones.*
