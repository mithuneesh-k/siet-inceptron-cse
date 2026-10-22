-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  SIET INCEPTRON CSE — Master Supabase Database Schema                 ║
-- ║  Run this entire file in your Supabase SQL Editor (Dashboard)         ║
-- ║  https://supabase.com/dashboard → SQL Editor → New Query              ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════
-- 1. USERS — Authentication & credentials table
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text UNIQUE NOT NULL,
  password_hash        text NOT NULL,
  role                 text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  must_change_password boolean DEFAULT false,
  created_at           timestamptz DEFAULT now()
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
-- 3. FACULTY — Faculty and HOD profiles linked to users
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
-- 4. ACHIEVEMENTS — Student milestones (hackathons, internships, etc.)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.achievements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type             text NOT NULL CHECK (type IN ('hackathon', 'internship', 'course', 'project', 'certification')),
  title            text NOT NULL,
  description      text,
  position         text,
  duration         text,
  proof_url        text,
  points           int NOT NULL DEFAULT 0,
  verified         boolean DEFAULT false,
  status           text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  created_at       timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 5. TEAMS & TEAM MEMBERS — Student project/hackathon teams
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN ('hackathon', 'project', 'research')),
  creator_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_open     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

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
-- 6. ANNOUNCEMENTS — Department news, events, and updates
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.announcements (
  id                 text PRIMARY KEY DEFAULT ('ann_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6)),
  title              text NOT NULL,
  message            text NOT NULL,
  type               text DEFAULT 'General',
  is_important       boolean DEFAULT false,
  link               text,
  target             text DEFAULT 'all',
  image_url          text,
  image_storage_path text,
  created_by         text,
  created_at         timestamptz DEFAULT now(),
  expires_at         timestamptz
);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. STUDENT_PLATFORM_CONNECTIONS — External platform handles & metrics
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.student_platform_connections (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL,
  platform_code           text NOT NULL CHECK (platform_code IN ('codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank')),
  handle                  text NOT NULL,
  normalized_handle       text NOT NULL,
  ownership_verified      boolean NOT NULL DEFAULT false,
  status                  text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'sync_error', 'linked_unverified', 'verified')),
  metrics                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at          timestamptz NULL,
  last_attempted_at       timestamptz NULL,
  last_error_code         text NULL,
  verification_token      text NULL,
  verification_expires_at timestamptz NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_platform UNIQUE (user_id, platform_code)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 8. STUDENT_LEADERBOARD VIEW — Unified ranked leaderboard calculation
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.student_leaderboard WITH (security_invoker = true) AS
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
  WHERE a.verified = true OR a.status = 'approved'
  GROUP BY a.user_id
) agg ON agg.user_id = s.user_id;

-- ═══════════════════════════════════════════════════════════════════════
-- 9. ATOMIC FACULTY DELETION RPC
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_faculty_member(p_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Faculty user not found.');
  END IF;

  IF v_role = 'admin' THEN
    RETURN json_build_object('success', false, 'code', 'FORBIDDEN_ADMIN', 'message', 'Admin accounts cannot be deleted via the faculty endpoint.');
  END IF;

  IF v_role != 'faculty' THEN
    RETURN json_build_object('success', false, 'code', 'FORBIDDEN_NON_FACULTY', 'message', 'Only faculty accounts can be deleted via this endpoint.');
  END IF;

  UPDATE public.achievements SET reviewed_by = NULL WHERE reviewed_by = p_target_user_id;
  DELETE FROM public.faculty WHERE user_id = p_target_user_id;
  DELETE FROM public.users WHERE id = p_target_user_id;

  RETURN json_build_object('success', true, 'message', 'Faculty deleted successfully.');
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 10. INDEXES FOR LIGHTNING FAST QUERIES
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_user_id           ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_no           ON public.students(roll_no);
CREATE INDEX IF NOT EXISTS idx_students_class_batch       ON public.students(class, batch);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id            ON public.faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id       ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_verified      ON public.achievements(verified);
CREATE INDEX IF NOT EXISTS idx_achievements_status        ON public.achievements(status);
CREATE INDEX IF NOT EXISTS idx_teams_creator_id           ON public.teams(creator_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id       ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id       ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at   ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_platform_user_id   ON public.student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platform_code      ON public.student_platform_connections(platform_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_handle_unique ON public.student_platform_connections (platform_code, normalized_handle);

-- ═══════════════════════════════════════════════════════════════════════
-- 11. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;

-- Revoke direct anon / authenticated access so queries strictly route through the backend service_role
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.students FROM anon, authenticated;
REVOKE ALL ON public.faculty FROM anon, authenticated;
REVOKE ALL ON public.achievements FROM anon, authenticated;
REVOKE ALL ON public.teams FROM anon, authenticated;
REVOKE ALL ON public.team_members FROM anon, authenticated;
REVOKE ALL ON public.announcements FROM anon, authenticated;
REVOKE ALL ON public.student_platform_connections FROM anon, authenticated;
REVOKE ALL ON public.student_leaderboard FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 12. TEAM OD EVENTS & FACULTY NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.team_od_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name        text NOT NULL,
  event_name       text NOT NULL,
  venue            text NOT NULL,
  college_name     text NOT NULL,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  team_details     text,
  remarks          text,
  faculty_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reporting_status text NOT NULL DEFAULT 'pending' CHECK (reporting_status IN ('pending', 'not_reported', 'informed')),
  informed_at      timestamptz DEFAULT NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT chk_team_od_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_team_od_faculty_id       ON public.team_od_events(faculty_id);
CREATE INDEX IF NOT EXISTS idx_team_od_reporting_status ON public.team_od_events(reporting_status);
CREATE INDEX IF NOT EXISTS idx_team_od_start_date       ON public.team_od_events(start_date);
CREATE INDEX IF NOT EXISTS idx_team_od_end_date         ON public.team_od_events(end_date);
CREATE INDEX IF NOT EXISTS idx_team_od_created_at       ON public.team_od_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_od_students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_od_id uuid NOT NULL REFERENCES public.team_od_events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text,
  roll_no     text,
  class       text,
  role        text DEFAULT 'Member',
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT uq_team_od_student UNIQUE (team_od_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_team_od_students_team_od_id ON public.team_od_students(team_od_id);
CREATE INDEX IF NOT EXISTS idx_team_od_students_student_id ON public.team_od_students(student_id);

CREATE TABLE IF NOT EXISTS public.faculty_notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message      text NOT NULL,
  team_od_id   uuid REFERENCES public.team_od_events(id) ON DELETE SET NULL,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faculty_notifications_recipient  ON public.faculty_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_faculty_notifications_created_at ON public.faculty_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faculty_notifications_is_read    ON public.faculty_notifications(recipient_id, is_read);
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_notif_unique_od   ON public.faculty_notifications(recipient_id, team_od_id) WHERE team_od_id IS NOT NULL;

ALTER TABLE public.team_od_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_od_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_notifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.team_od_events TO postgres, service_role;
GRANT ALL ON public.team_od_students TO postgres, service_role;
GRANT ALL ON public.faculty_notifications TO postgres, service_role;

REVOKE ALL ON public.team_od_events FROM anon, authenticated;
REVOKE ALL ON public.team_od_students FROM anon, authenticated;
REVOKE ALL ON public.faculty_notifications FROM anon, authenticated;

-- Function security execution permissions
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_faculty_member(uuid) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- 12. DEFAULT SEED ACCOUNTS (ADMIN & FACULTY)
-- ═══════════════════════════════════════════════════════════════════════
-- Passwords:
-- admin@siet.ac.in       -> password123
-- admin@srishakthi.ac.in -> admin123
-- hodcse@siet.ac.in      -> password123

INSERT INTO public.users (email, password_hash, role)
VALUES 
  ('admin@siet.ac.in', '$2a$10$XQXxYahHVjcSNx4PRMgR7OtwSNIgfNxEMNU07lMxXjCLFbPF5EAN2', 'admin'),
  ('admin@srishakthi.ac.in', '$2a$10$V/7BEyBLHIZXa5.AZcmRvOEI6hgCy.EWl6Dppy6uPDM47od1SRIee', 'admin'),
  ('hodcse@siet.ac.in', '$2a$10$XQXxYahHVjcSNx4PRMgR7OtwSNIgfNxEMNU07lMxXjCLFbPF5EAN2', 'faculty')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.faculty (user_id, name, designation, department)
SELECT id, 'Dr. HOD CSE', 'HOD & Professor', 'CSE'
FROM public.users WHERE email = 'hodcse@siet.ac.in'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.faculty (user_id, name, designation, department)
SELECT id, 'System Administrator', 'ADMIN', 'CSE'
FROM public.users WHERE email = 'admin@siet.ac.in'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.faculty (user_id, name, designation, department)
SELECT id, 'ADMIN', 'HOD', 'CSE'
FROM public.users WHERE email = 'admin@srishakthi.ac.in'
ON CONFLICT (user_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- COMPLETE! Your entire Inceptron database is ready in one clean file.
-- ═══════════════════════════════════════════════════════════════════════
