-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 002: Secure RLS Policies & Private Field Protection         ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- 1. Remove insecure unrestricted RLS policies
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
DROP POLICY IF EXISTS "Service role full access on students" ON public.students;
DROP POLICY IF EXISTS "Service role full access on faculty" ON public.faculty;
DROP POLICY IF EXISTS "Service role full access on achievements" ON public.achievements;
DROP POLICY IF EXISTS "Service role full access on teams" ON public.teams;
DROP POLICY IF EXISTS "Service role full access on team_members" ON public.team_members;

-- 2. Ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 3. Add must_change_password column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- 4. Secure student_leaderboard view with security_invoker = true
ALTER VIEW public.student_leaderboard SET (security_invoker = true);

-- 5. Revoke direct anon/authenticated access to backend tables and views
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.students FROM anon, authenticated;
REVOKE ALL ON public.faculty FROM anon, authenticated;
REVOKE ALL ON public.achievements FROM anon, authenticated;
REVOKE ALL ON public.teams FROM anon, authenticated;
REVOKE ALL ON public.team_members FROM anon, authenticated;
REVOKE ALL ON public.student_leaderboard FROM anon, authenticated;
