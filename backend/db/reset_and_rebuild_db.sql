-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  SIET INCEPTRON CSE — Reset & Rebuild Entire Database Script          ║
-- ║  WARNING: This will drop all existing tables and re-create everything ║
-- ║  Run in Supabase SQL Editor: Dashboard → SQL Editor → New Query        ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- 1. DROP ALL EXISTING OBJECTS (CLEAN SLATE)
DROP VIEW IF EXISTS public.student_leaderboard CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.student_platform_connections CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.faculty CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.delete_faculty_member(uuid) CASCADE;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. USERS
CREATE TABLE public.users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text UNIQUE NOT NULL,
  password_hash        text NOT NULL,
  role                 text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  must_change_password boolean DEFAULT false,
  created_at           timestamptz DEFAULT now()
);

-- 4. STUDENTS
CREATE TABLE public.students (
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

-- 5. FACULTY
CREATE TABLE public.faculty (
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

-- 6. ACHIEVEMENTS
CREATE TABLE public.achievements (
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

-- 7. TEAMS & TEAM MEMBERS
CREATE TABLE public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN ('hackathon', 'project', 'research')),
  creator_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_open     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE public.team_members (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  status     text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- 8. ANNOUNCEMENTS
CREATE TABLE public.announcements (
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

-- 9. STUDENT_PLATFORM_CONNECTIONS
CREATE TABLE public.student_platform_connections (
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

-- 10. LEADERBOARD VIEW
CREATE VIEW public.student_leaderboard WITH (security_invoker = true) AS
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

-- 11. RPC FUNCTION
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

-- 12. INDEXES
CREATE INDEX idx_students_user_id           ON public.students(user_id);
CREATE INDEX idx_students_roll_no           ON public.students(roll_no);
CREATE INDEX idx_students_class_batch       ON public.students(class, batch);
CREATE INDEX idx_faculty_user_id            ON public.faculty(user_id);
CREATE INDEX idx_achievements_user_id       ON public.achievements(user_id);
CREATE INDEX idx_achievements_verified      ON public.achievements(verified);
CREATE INDEX idx_achievements_status        ON public.achievements(status);
CREATE INDEX idx_teams_creator_id           ON public.teams(creator_id);
CREATE INDEX idx_team_members_team_id       ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id       ON public.team_members(user_id);
CREATE INDEX idx_announcements_created_at   ON public.announcements(created_at DESC);
CREATE INDEX idx_student_platform_user_id   ON public.student_platform_connections(user_id);
CREATE INDEX idx_student_platform_code      ON public.student_platform_connections(platform_code);
CREATE UNIQUE INDEX idx_platform_handle_unique ON public.student_platform_connections (platform_code, normalized_handle);

-- 13. RLS & ACCESS CONTROL
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.students FROM anon, authenticated;
REVOKE ALL ON public.faculty FROM anon, authenticated;
REVOKE ALL ON public.achievements FROM anon, authenticated;
REVOKE ALL ON public.teams FROM anon, authenticated;
REVOKE ALL ON public.team_members FROM anon, authenticated;
REVOKE ALL ON public.announcements FROM anon, authenticated;
REVOKE ALL ON public.student_platform_connections FROM anon, authenticated;
REVOKE ALL ON public.student_leaderboard FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_faculty_member(uuid) TO service_role;

-- 14. SEED ADMIN & FACULTY ACCOUNTS
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
