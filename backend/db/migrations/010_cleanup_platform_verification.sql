-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 010 (CANDIDATE / REVIEW ONLY): Cleanup Obsolete Platform    ║
-- ║  Verification Columns from student_platform_connections               ║
-- ║                                                                        ║
-- ║  SAFETY NOTICE: DO NOT RUN WITHOUT EXPLICIT USER AUTHORIZATION         ║
-- ║  AND A CONFIRMED BACKUP.                                               ║
-- ║                                                                        ║
-- ║  This script removes the retired manual verification columns while     ║
-- ║  STRICTLY PRESERVING:                                                  ║
-- ║  - student_platform_connections table                                  ║
-- ║  - Platform handles (Codeforces, LeetCode, GFG, HackerRank)            ║
-- ║  - Synced problem metrics, ratings, and leaderboard rankings           ║
-- ║  - All academic records, student profiles, and achievements            ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Verify current table state (Read-only check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'student_platform_connections'
  ) THEN
    RAISE NOTICE 'Table student_platform_connections does not exist. Skipping.';
  ELSE
    RAISE NOTICE 'Table student_platform_connections found. Proceeding with safe column cleanup.';
  END IF;
END $$;

-- Drop obsolete verification token and manual verification flags
ALTER TABLE public.student_platform_connections 
  DROP COLUMN IF EXISTS verification_token,
  DROP COLUMN IF EXISTS verification_expires_at,
  DROP COLUMN IF EXISTS ownership_verified;

-- Maintain active table constraints and indexes
COMMENT ON TABLE public.student_platform_connections IS 'Stores student competitive coding handles and problem-solving metrics for the active Competitive Leaderboard.';
