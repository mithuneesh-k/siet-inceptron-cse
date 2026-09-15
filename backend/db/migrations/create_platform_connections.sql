-- Create student_platform_connections table for Codeforces / platform integrations
-- DO NOT EXECUTE AUTOMATICALLY ON APPLICATION BOOT

CREATE TABLE IF NOT EXISTS public.student_platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_code TEXT NOT NULL CHECK (platform_code IN ('codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank')),
  handle TEXT NOT NULL,
  normalized_handle TEXT NOT NULL,
  ownership_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'sync_error', 'linked_unverified', 'verified')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NULL,
  last_attempted_at TIMESTAMPTZ NULL,
  last_error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_platform UNIQUE (user_id, platform_code)
);

-- Enable RLS safely (backend uses custom JWT + Supabase service-role, no direct browser writes)
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_student_platform_user_id ON public.student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platform_code ON public.student_platform_connections(platform_code);

-- Partial unique index: prevents one verified coding account from being claimed by multiple students
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_platform_handle ON public.student_platform_connections (platform_code, normalized_handle) WHERE ownership_verified = TRUE;
