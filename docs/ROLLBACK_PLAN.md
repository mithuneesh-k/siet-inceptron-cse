# SIET INCEPTRON — DEPLOYMENT ROLLBACK PLAN & PROCEDURES

**Target Environment**: Staging & Production Rollout Procedures  
**Current Baseline Commit**: `9c47d4812f9ab0cc147b5c68aae1b286785d5e8f`  
**Current Branch**: `fix/light-mode-ui`

---

## 1. Application Code Rollback (Git & Hosting Service)

### Frontend Service
- **Last Known Good Commit**: `9c47d4812f9ab0cc147b5c68aae1b286785d5e8f`
- **Rollback Procedure**:
  1. Trigger manual deployment in hosting console (Render / Vercel) pinned to commit `9c47d4812f9ab0cc147b5c68aae1b286785d5e8f`.
  2. Verify Vite build asset hash update.

### Backend API Service
- **Last Known Good Commit**: `9c47d4812f9ab0cc147b5c68aae1b286785d5e8f`
- **Rollback Procedure**:
  1. Trigger backend service redeployment pinned to commit `9c47d4812f9ab0cc147b5c68aae1b286785d5e8f`.
  2. Perform health check verification: `GET /api/health` returning `200 OK`.

---

## 2. Database Migration Rollback Analysis & Procedures

> **CRITICAL RULE**: A Git revert does NOT undo SQL schema changes or stored RPCs in Supabase. The table below documents individual migration reversibility and manual rollback steps.

| Migration File | Reversible? | Data Loss Risk? | Manual Rollback Procedure |
| :--- | :--- | :--- | :--- |
| `002_secure_supabase_rls_and_policies.sql` | **Yes** | **No** | Re-enable default RLS policies and re-grant permissions if needed: <br>`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;` <br>`GRANT SELECT ON public.users TO authenticated;` |
| `003_delete_faculty_rpc.sql` | **Yes** | **No** | Drop stored function: <br>`DROP FUNCTION IF EXISTS public.delete_faculty_member(uuid);` |
| `004_announcement_images.sql` | **Yes** | **Low** (if non-null columns populated) | Remove added columns: <br>`ALTER TABLE public.announcements DROP COLUMN IF EXISTS image_url, DROP COLUMN IF EXISTS image_storage_path;` |
| `create_platform_connections.sql` | **Yes** | **HIGH** (drops all student platform links if dropped) | Drop table (Staging only): <br>`DROP TABLE IF EXISTS public.student_platform_connections CASCADE;` <br>*Note: In production, preserve table and perform data point-in-time recovery if required.* |

---

## 3. Emergency Restoration from Point-in-Time Recovery (PITR) Backup

If schema corruption occurs during staging or production deployment:
1. Open Supabase Console -> Project Settings -> Database -> Backups.
2. Select **Restore to Point-in-Time** matching the timestamp prior to migration execution.
3. Restore snapshot into a **NON-PRODUCTION** secondary target for data integrity verification before overriding primary database.
