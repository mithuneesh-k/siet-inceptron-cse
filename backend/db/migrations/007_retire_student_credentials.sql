-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 007: Safe Student Credential Retirement & Data Preservation ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════
-- STEP 1: VERIFICATION & PRESERVATION PRE-CHECK
-- ════════════════════════════════════════════════════════════════════════
-- This migration safely retires student login credentials without deleting
-- any student records, foreign-key relationships, achievements, or academic data.
--
-- Tables preserved:
--   - public.students (all 297 profiles, roll_no, reg_no, class, batch, etc.)
--   - public.academic_students (all 311 records, UMIS, photo paths, etc.)
--   - public.achievements (all records linked to student user_id)
--   - public.student_semester_results & student_course_results
--   - public.users (records preserved to maintain foreign keys, password_hash retired)

-- ════════════════════════════════════════════════════════════════════════
-- STEP 2: OPTIONAL BACKUP OF STUDENT CREDENTIAL HASHES
-- ════════════════════════════════════════════════════════════════════════
-- Create a secured backup table before updating password hashes
CREATE TABLE IF NOT EXISTS public._backup_student_credentials (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email text,
  retired_password_hash text,
  retired_at timestamptz DEFAULT now()
);

-- Copy existing hashes into backup table (idempotent)
INSERT INTO public._backup_student_credentials (user_id, email, retired_password_hash)
SELECT id, email, password_hash
FROM public.users
WHERE role = 'student'
ON CONFLICT (user_id) DO NOTHING;

-- Restrict backup table access exclusively to service_role
REVOKE ALL ON public._backup_student_credentials FROM PUBLIC;
REVOKE ALL ON public._backup_student_credentials FROM anon;
REVOKE ALL ON public._backup_student_credentials FROM authenticated;
GRANT ALL ON public._backup_student_credentials TO service_role;

-- ════════════════════════════════════════════════════════════════════════
-- STEP 3: RETIRE STUDENT LOGIN CAPABILITY
-- ════════════════════════════════════════════════════════════════════════
-- Replace active student password hashes with an unmatchable disabled token.
-- This ensures bcrypt verification on the student password_hash will never succeed,
-- while keeping the non-null constraint on password_hash satisfied.
UPDATE public.users
SET password_hash = '$2a$10$DISABLED_STUDENT_ACCOUNT_PORTAL_2026_INCEPTRON_SECURE'
WHERE role = 'student';

-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK & RECOVERY INSTRUCTIONS:
-- If student login ever needs to be restored from backup:
--   UPDATE public.users u
--   SET password_hash = b.retired_password_hash
--   FROM public._backup_student_credentials b
--   WHERE u.id = b.user_id;
--
-- To drop the backup table after permanent retirement:
--   DROP TABLE IF EXISTS public._backup_student_credentials;
-- ════════════════════════════════════════════════════════════════════════
