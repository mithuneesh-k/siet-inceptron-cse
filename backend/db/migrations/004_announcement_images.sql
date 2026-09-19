-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 004: Announcement Image Support                            ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_storage_path text;
