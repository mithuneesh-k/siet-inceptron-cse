-- ==============================================================================
-- Migration: Create Competitive Index & Platform System Tables
-- Target: Supabase (PostgreSQL)
-- IMPORTANT: DO NOT EXECUTE THIS MIGRATION AUTOMATICALLY IN PRODUCTION.
-- ==============================================================================

-- 1. Platform Definitions Table
CREATE TABLE IF NOT EXISTS platform_definitions (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    live_support BOOLEAN DEFAULT true,
    ownership_verification_supported BOOLEAN DEFAULT true,
    verification_method VARCHAR(50) DEFAULT 'BIO_TOKEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial platforms
INSERT INTO platform_definitions (code, name, category, live_support, ownership_verification_supported, verification_method)
VALUES
    ('github', 'GitHub', 'open_source', true, true, 'BIO_TOKEN'),
    ('leetcode', 'LeetCode', 'problem_solving', true, true, 'BIO_TOKEN'),
    ('codeforces', 'Codeforces', 'competitive_programming', true, true, 'LOCATION_TOKEN'),
    ('codechef', 'CodeChef', 'competitive_programming', false, false, 'NONE'),
    ('hackerrank', 'HackerRank', 'problem_solving', false, false, 'NONE'),
    ('geeksforgeeks', 'GeeksforGeeks', 'problem_solving', false, false, 'NONE'),
    ('kaggle', 'Kaggle', 'open_source', false, false, 'NONE')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, category = EXCLUDED.category, live_support = EXCLUDED.live_support;

-- 2. Student Platform Connections Table
-- NOTE: Raw verification_token is NOT stored. Only verification_token_hash is persisted.
CREATE TABLE IF NOT EXISTS student_platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_code VARCHAR(50) NOT NULL REFERENCES platform_definitions(code),
    username VARCHAR(100) NOT NULL,
    connection_status VARCHAR(50) DEFAULT 'LINKED_UNVERIFIED',
    ownership_status VARCHAR(50) DEFAULT 'UNVERIFIED', -- UNVERIFIED | VERIFIED
    verification_token_hash VARCHAR(255),
    verification_expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    raw_metrics JSONB DEFAULT '{}'::jsonb,
    snapshot_score INT DEFAULT 0,
    sync_status VARCHAR(50) DEFAULT 'IDLE', -- IDLE | SYNCING | SYNC_FAILED | SUCCESS
    last_synced_at TIMESTAMPTZ,
    last_attempted_at TIMESTAMPTZ,
    last_error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform_code)
);

CREATE INDEX IF NOT EXISTS idx_student_platform_conn_user ON student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platform_conn_status ON student_platform_connections(ownership_status);

-- Cross-user duplicate verified handle protection index
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_platform_handle 
ON student_platform_connections(platform_code, LOWER(username)) 
WHERE ownership_status = 'VERIFIED';

-- 3. Student Competitive Profiles Table
CREATE TABLE IF NOT EXISTS student_competitive_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    overall_score INT DEFAULT 0,
    problem_solving_score INT DEFAULT 0,
    competitive_programming_score INT DEFAULT 0,
    open_source_score INT DEFAULT 0,
    certifications_score INT DEFAULT 0,
    college_achievements_score INT DEFAULT 0,
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    connected_platform_count INT DEFAULT 0,
    scoring_version VARCHAR(20) DEFAULT 'v1',
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_profiles_overall ON student_competitive_profiles(overall_score DESC);

-- 4. Sync Audit Logs Table
CREATE TABLE IF NOT EXISTS sync_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_category VARCHAR(50),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_audit_user ON sync_audit_logs(user_id);

-- Security Architecture: RLS Enabled (Backend Service-Role Authoritative)
-- The application uses custom JWT authentication. Frontend operations route through Express API.
-- No direct client write policies are granted. Supabase Service Role bypasses RLS safely.

ALTER TABLE platform_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_competitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_audit_logs ENABLE ROW LEVEL SECURITY;

-- Optional public read policies for metadata (No direct client writes allowed)
CREATE POLICY "Public read platform definitions" ON platform_definitions
    FOR SELECT USING (true);

