-- ==============================================================================
-- Rollback Migration: Remove Competitive Index & Platform System Tables
-- Target: Supabase (PostgreSQL)
-- IMPORTANT: THIS ROLLBACK DESTROYS COMPETITIVE INDEX DATA. USE ONLY WHEN INTENTIONALLY REMOVING THE FEATURE.
-- DO NOT EXECUTE AUTOMATICALLY.
-- ==============================================================================

-- 1. Drop RLS policies if existing
DROP POLICY IF EXISTS "Public read platform definitions" ON platform_definitions;

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_sync_audit_user;
DROP INDEX IF EXISTS idx_comp_profiles_overall;
DROP INDEX IF EXISTS idx_verified_platform_handle;
DROP INDEX IF EXISTS idx_student_platform_conn_status;
DROP INDEX IF EXISTS idx_student_platform_conn_user;

-- 3. Drop Competitive Index tables in reverse dependency order
DROP TABLE IF EXISTS sync_audit_logs CASCADE;
DROP TABLE IF EXISTS student_competitive_profiles CASCADE;
DROP TABLE IF EXISTS student_platform_connections CASCADE;
DROP TABLE IF EXISTS platform_definitions CASCADE;

-- Note: Existing portal core tables (users, students, achievements, teams, announcements, etc.) are untouched.
