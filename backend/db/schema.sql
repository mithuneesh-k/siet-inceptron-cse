-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  SIET INCEPTRON CSE — Complete Supabase Database Schema             ║
-- ║  Run this entire file in your Supabase SQL Editor (Dashboard)       ║
-- ║  https://supabase.com/dashboard → SQL Editor → New Query            ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════
-- 1. USERS — Authentication / login table
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  created_at    timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. STUDENTS — Student profile linked to users
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.students (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  roll_no        text UNIQUE NOT NULL,
  reg_no         text,
  year           int,
  class          text,
  batch          text,
  date_of_birth  date,
  bio            text,
  github         text,
  linkedin       text,
  instagram      text,
  twitter        text,
  portfolio      text,
  avatar_url     text,
  phone          text,
  phone_public   boolean DEFAULT false,
  dob_public     boolean DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. FACULTY — Faculty/Admin profile linked to users
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.faculty (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  designation     text DEFAULT 'Faculty',
  department      text DEFAULT 'CSE',
  avatar_url      text,
  advising_class  text,
  advising_batch  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. ACHIEVEMENTS — Student achievements (hackathons, internships, etc.)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.achievements (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('hackathon', 'internship', 'course', 'project', 'certification')),
  title       text NOT NULL,
  description text,
  position    text,        -- '1st', '2nd', '3rd', 'participated' (for hackathons)
  duration    text,        -- 'short', 'medium', 'long' (for internships)
  proof_url   text,
  points      int NOT NULL DEFAULT 0,
  verified    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 5. TEAMS — Student teams (hackathon teams, project groups, etc.)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN ('hackathon', 'project', 'research')),
  creator_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_open     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. TEAM_MEMBERS — Many-to-many: users ↔ teams with role + status
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.team_members (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  status     text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. STUDENT_LEADERBOARD — Materialized View for fast leaderboard queries
--    (Used by /api/leaderboard routes)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.student_leaderboard AS
SELECT
  s.user_id,
  s.name,
  s.roll_no,
  s.class,
  s.batch,
  s.year,
  s.avatar_url,
  s.github,
  s.linkedin,
  COALESCE(agg.score, 0)             AS score,
  COALESCE(agg.achievement_count, 0) AS achievement_count,
  COALESCE(agg.gold_wins, 0)         AS gold_wins,
  COALESCE(agg.silver_wins, 0)       AS silver_wins,
  COALESCE(agg.bronze_wins, 0)       AS bronze_wins
FROM public.students s
LEFT JOIN (
  SELECT
    a.user_id,
    SUM(a.points)                                                           AS score,
    COUNT(*)                                                                AS achievement_count,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '1st')     AS gold_wins,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '2nd')     AS silver_wins,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '3rd')     AS bronze_wins
  FROM public.achievements a
  WHERE a.verified = true
  GROUP BY a.user_id
) agg ON agg.user_id = s.user_id;

-- ═══════════════════════════════════════════════════════════════════════
-- 8. INDEXES for performance
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_user_id       ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_no       ON public.students(roll_no);
CREATE INDEX IF NOT EXISTS idx_students_class_batch   ON public.students(class, batch);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id        ON public.faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id   ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_verified  ON public.achievements(verified);
CREATE INDEX IF NOT EXISTS idx_teams_creator_id       ON public.teams(creator_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id   ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id   ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status    ON public.team_members(status);

-- ═══════════════════════════════════════════════════════════════════════
-- 9. ROW LEVEL SECURITY — Disable for now (service role key bypasses RLS)
--    Enable these later for production with proper policies
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (your backend uses service_role key)
CREATE POLICY "Service role full access on users"        ON public.users        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on students"     ON public.students     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on faculty"      ON public.faculty      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on achievements" ON public.achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on teams"        ON public.teams        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on team_members" ON public.team_members FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- Next: seed an admin user so you can log in.
-- ═══════════════════════════════════════════════════════════════════════
