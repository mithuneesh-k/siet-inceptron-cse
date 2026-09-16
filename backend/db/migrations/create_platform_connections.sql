-- Create student_platform_connections table for Codeforces / platform integrations in separate PLATFORM DB
-- DO NOT EXECUTE AUTOMATICALLY ON APPLICATION BOOT

CREATE TABLE IF NOT EXISTS public.student_platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform_code TEXT NOT NULL CHECK (platform_code IN ('codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank')),
  handle TEXT NOT NULL,
  normalized_handle TEXT NOT NULL,
  ownership_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'sync_error', 'linked_unverified', 'verified')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NULL,
  last_attempted_at TIMESTAMPTZ NULL,
  last_error_code TEXT NULL,
  verification_token TEXT NULL,
  verification_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_platform UNIQUE (user_id, platform_code)
);

-- Enable RLS safely
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_student_platform_user_id ON public.student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platform_code ON public.student_platform_connections(platform_code);

-- Global unique index: ONE platform handle belongs to strictly ONE student row
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_handle_unique ON public.student_platform_connections (platform_code, normalized_handle);
