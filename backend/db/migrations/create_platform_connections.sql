-- Create student_platform_connections table for Codeforces / platform integrations
-- DO NOT RUN AUTOMATICALLY ON APPLICATION BOOT

CREATE TABLE IF NOT EXISTS student_platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform_code TEXT NOT NULL,
  handle TEXT NOT NULL,
  normalized_handle TEXT NOT NULL,
  ownership_verified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'connected',
  metrics JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NULL,
  last_attempted_at TIMESTAMPTZ NULL,
  last_error_code TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_platform UNIQUE (user_id, platform_code)
);

CREATE INDEX IF NOT EXISTS idx_student_platform_user_id ON student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platform_code ON student_platform_connections(platform_code);
