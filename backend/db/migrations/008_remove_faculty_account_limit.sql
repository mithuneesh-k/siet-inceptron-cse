-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 008: Remove Fixed Faculty Account Limit                     ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- 1. Remove the obsolete 20-account maximum limit trigger from public.users
DROP TRIGGER IF EXISTS trg_enforce_faculty_account_limit ON public.users;

-- 2. Remove the trigger function
DROP FUNCTION IF EXISTS public.enforce_faculty_account_limit();

-- 3. Confirm that all core identity & security constraints remain active:
--    - Unique usernames on users & faculty
--    - Unique employee_id on faculty
--    - Indexes for fast lookup
--    - All existing faculty and student records preserved intact

COMMENT ON TABLE public.faculty IS 'Authorized departmental faculty accounts with dynamic scaling (no fixed 20-account limit).';

-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION INSTRUCTIONS:
-- To verify that the trigger has been removed:
--   SELECT tgname FROM pg_trigger WHERE tgname = 'trg_enforce_faculty_account_limit';
-- Should return 0 rows.
--
-- RECOVERY / ROLLBACK INSTRUCTIONS:
-- If you ever need to restore a fixed 20-account ceiling:
--   CREATE OR REPLACE FUNCTION public.enforce_faculty_account_limit()
--   RETURNS TRIGGER AS $$
--   DECLARE v_count integer;
--   BEGIN
--     IF NEW.role IN ('faculty', 'admin') THEN
--       SELECT COUNT(*) INTO v_count FROM public.users WHERE role IN ('faculty', 'admin');
--       IF v_count >= 20 THEN
--         RAISE EXCEPTION 'Faculty limit reached.' USING ERRCODE = 'EX20F';
--       END IF;
--     END IF;
--     RETURN NEW;
--   END;
--   $$ LANGUAGE plpgsql;
--   CREATE TRIGGER trg_enforce_faculty_account_limit
--   BEFORE INSERT OR UPDATE OF role ON public.users
--   FOR EACH ROW EXECUTE FUNCTION public.enforce_faculty_account_limit();
-- ════════════════════════════════════════════════════════════════════════
