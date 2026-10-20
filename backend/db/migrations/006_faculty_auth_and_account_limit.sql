-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 006: Faculty Authentication Fields & 20-Account Limit Rule   ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- 1. Add employee_id and username columns to faculty table (if not already present)
ALTER TABLE public.faculty
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS username text;

-- 2. Add username column to users table (if not already present)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text;

-- 3. Unique constraints for employee_id and username to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faculty_employee_id_unique'
  ) THEN
    ALTER TABLE public.faculty ADD CONSTRAINT faculty_employee_id_unique UNIQUE (employee_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faculty_username_unique'
  ) THEN
    ALTER TABLE public.faculty ADD CONSTRAINT faculty_username_unique UNIQUE (username);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
END $$;

-- 4. Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_faculty_employee_id ON public.faculty(employee_id);
CREATE INDEX IF NOT EXISTS idx_faculty_username ON public.faculty(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 5. Database-level trigger to strictly enforce the MAXIMUM 20 FACULTY ACCOUNTS limit
-- Ensures that under high concurrency, no 21st faculty or admin account can ever be inserted.
CREATE OR REPLACE FUNCTION public.enforce_faculty_account_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_faculty_count integer;
BEGIN
  -- Only check when inserting or promoting a user to faculty or admin
  IF NEW.role IN ('faculty', 'admin') THEN
    SELECT COUNT(*) INTO v_faculty_count
    FROM public.users
    WHERE role IN ('faculty', 'admin')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_faculty_count >= 20 THEN
      RAISE EXCEPTION 'Maximum faculty account limit of 20 reached. Current count: %. Account creation rejected.', v_faculty_count
        USING ERRCODE = 'EX20F';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_faculty_account_limit ON public.users;
CREATE TRIGGER trg_enforce_faculty_account_limit
BEFORE INSERT OR UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_faculty_account_limit();

-- 6. Populate deterministic identifiers for existing seed faculty
UPDATE public.faculty f
SET 
  employee_id = CASE 
    WHEN u.email = 'admin@siet.ac.in' THEN 'FAC001'
    WHEN u.email = 'hodcse@siet.ac.in' THEN 'FAC002'
    WHEN u.email = 'admin@srishakthi.ac.in' THEN 'FAC003'
    ELSE COALESCE(f.employee_id, 'FAC' || LPAD(f.id::text, 3, '0'))
  END,
  username = CASE 
    WHEN u.email = 'admin@siet.ac.in' THEN 'admin'
    WHEN u.email = 'hodcse@siet.ac.in' THEN 'hodcse'
    WHEN u.email = 'admin@srishakthi.ac.in' THEN 'admin_srishakthi'
    ELSE COALESCE(f.username, SPLIT_PART(u.email, '@', 1))
  END
FROM public.users u
WHERE f.user_id = u.id
  AND (f.employee_id IS NULL OR f.username IS NULL);

UPDATE public.users u
SET username = f.username
FROM public.faculty f
WHERE u.id = f.user_id
  AND u.username IS NULL;

-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK INSTRUCTIONS:
-- To remove the constraint and trigger:
--   DROP TRIGGER IF EXISTS trg_enforce_faculty_account_limit ON public.users;
--   DROP FUNCTION IF EXISTS public.enforce_faculty_account_limit();
--   ALTER TABLE public.faculty DROP CONSTRAINT IF EXISTS faculty_employee_id_unique;
--   ALTER TABLE public.faculty DROP CONSTRAINT IF EXISTS faculty_username_unique;
--   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_unique;
-- ════════════════════════════════════════════════════════════════════════
