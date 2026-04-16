-- =================================================================
-- SIET Inceptron — Schema Cleanup
-- Removes profile columns from users table now that data is
-- safely stored in students and faculty tables.
--
-- After this runs, users table will only contain:
--   id, email, password_hash, role, created_at
--
-- Run in Supabase SQL Editor AFTER verifying migration_v2.sql worked.
-- =================================================================

-- Verify data was migrated first (safety check)
DO $$
BEGIN
  IF (SELECT count(*) FROM students) = 0 THEN
    RAISE EXCEPTION 'students table is empty — do NOT proceed. Run migration_v2.sql first!';
  END IF;
  IF (SELECT count(*) FROM faculty) = 0 THEN
    RAISE EXCEPTION 'faculty table is empty — do NOT proceed. Run migration_v2.sql first!';
  END IF;
END $$;

-- Drop profile columns from users table
ALTER TABLE users
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS roll_no,
  DROP COLUMN IF EXISTS reg_no,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS class,
  DROP COLUMN IF EXISTS batch,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS github,
  DROP COLUMN IF EXISTS linkedin,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS is_admin;

-- Verify final structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
