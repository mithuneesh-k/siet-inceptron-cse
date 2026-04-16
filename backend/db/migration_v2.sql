-- =================================================================
-- SIET Inceptron — Schema Migration v2
-- Separates profile data into students & faculty tables
--
-- HOW TO RUN:
--   1. Go to your Supabase project dashboard
--   2. Click "SQL Editor" in the left sidebar
--   3. Paste this entire script and click "Run"
-- =================================================================

-- Step 1: Add role column + extra columns to users if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS batch text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;

-- Step 2: Assign roles based on existing is_admin flag
UPDATE users SET role = 'admin'   WHERE roll_no = 'ADMIN001';
UPDATE users SET role = 'faculty' WHERE is_admin = true AND roll_no != 'ADMIN001';
UPDATE users SET role = 'student' WHERE is_admin = false;

-- Step 3: Create the students profile table
CREATE TABLE IF NOT EXISTS students (
  user_id      uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  roll_no      text UNIQUE,
  reg_no       text,
  year         integer,
  class        text,
  batch        text,
  date_of_birth date,
  bio          text,
  github       text,
  linkedin     text,
  avatar_url   text,
  phone        text,
  updated_at   timestamp with time zone DEFAULT now()
);

-- Step 4: Create the faculty profile table
CREATE TABLE IF NOT EXISTS faculty (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  designation text,
  department  text DEFAULT 'CSE',
  avatar_url  text,
  updated_at  timestamp with time zone DEFAULT now()
);

-- Step 5: Migrate student data from users → students
INSERT INTO students (user_id, name, roll_no, reg_no, year, class, batch, date_of_birth, bio, github, linkedin, avatar_url, phone)
SELECT id, name, roll_no, reg_no, year, class, batch, date_of_birth, bio, github, linkedin, avatar_url, phone
FROM users
WHERE is_admin = false
ON CONFLICT (user_id) DO UPDATE SET
  name          = EXCLUDED.name,
  roll_no       = EXCLUDED.roll_no,
  reg_no        = EXCLUDED.reg_no,
  year          = EXCLUDED.year,
  class         = EXCLUDED.class,
  batch         = EXCLUDED.batch,
  date_of_birth = EXCLUDED.date_of_birth,
  bio           = EXCLUDED.bio,
  github        = EXCLUDED.github,
  linkedin      = EXCLUDED.linkedin,
  avatar_url    = EXCLUDED.avatar_url,
  phone         = EXCLUDED.phone;

-- Step 6: Migrate faculty data from users → faculty
INSERT INTO faculty (user_id, name)
SELECT id, name
FROM users
WHERE is_admin = true
ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name;

-- Done! Verify:
SELECT 'students migrated:' as info, count(*) FROM students
UNION ALL
SELECT 'faculty migrated:', count(*) FROM faculty
UNION ALL
SELECT 'users with role set:', count(*) FROM users WHERE role IS NOT NULL;
