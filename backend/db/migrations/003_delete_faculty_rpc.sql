-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 003: Idempotent Atomic Faculty Deletion RPC (Hardened)     ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.delete_faculty_member(p_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  -- 1. Check target user exists and get role from public.users
  SELECT role INTO v_role FROM public.users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Faculty user not found.');
  END IF;

  IF v_role = 'admin' THEN
    RETURN json_build_object('success', false, 'code', 'FORBIDDEN_ADMIN', 'message', 'Admin accounts cannot be deleted via the faculty endpoint.');
  END IF;

  IF v_role != 'faculty' THEN
    RETURN json_build_object('success', false, 'code', 'FORBIDDEN_NON_FACULTY', 'message', 'Only faculty accounts can be deleted via this endpoint.');
  END IF;

  -- 2. Safely null out approved_by references in achievements
  UPDATE public.achievements SET approved_by = NULL WHERE approved_by = p_target_user_id;

  -- 3. Delete faculty profile record
  DELETE FROM public.faculty WHERE user_id = p_target_user_id;

  -- 4. Delete user account record
  DELETE FROM public.users WHERE id = p_target_user_id;

  RETURN json_build_object('success', true, 'message', 'Faculty deleted successfully.');
END;
$$;

-- Revoke execution from untrusted client roles
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM authenticated;

-- Grant execution ONLY to server-side service_role
GRANT EXECUTE ON FUNCTION public.delete_faculty_member(uuid) TO service_role;
