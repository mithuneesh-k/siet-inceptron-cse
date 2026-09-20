# SIET INCEPTRON — DEPLOYMENT ROLLBACK PLAN & PROCEDURES

**Target Environment**: Staging & Production Rollout Procedures  
**Current Baseline Commit**: `c1c1ca94dd96e97f380a757652114526ee016ab8`  
**Current Branch**: `fix/light-mode-ui`

---

## 1. Application Code Rollback (Git & Hosting Container Service)

### Frontend Service
- **Last Known Good Commit**: `c1c1ca94dd96e97f380a757652114526ee016ab8`
- **Rollback Procedure**:
  1. Trigger manual deployment in hosting console (Render / Vercel) pinned to commit `c1c1ca94dd96e97f380a757652114526ee016ab8`.
  2. Verify Vite build asset hash update.

### Backend API Service
- **Last Known Good Commit**: `c1c1ca94dd96e97f380a757652114526ee016ab8`
- **Rollback Procedure**:
  1. Trigger backend container service redeployment pinned to commit `c1c1ca94dd96e97f380a757652114526ee016ab8`.
  2. Perform health check verification: `GET /api/health` returning `200 OK`.

---

## 2. Database Security & Migration Rollback Policy

> **CRITICAL PRODUCTION SAFETY MANDATE**:
> 1. **NEVER DISABLE RLS** as a routine rollback measure. Disabling Row Level Security exposes public tables to un-authenticated direct PostgREST access. For security migrations, keep RLS enabled at all times and roll forward a policy fix or restore verified baseline policies.
> 2. **NEVER DROP POPULATED COLUMNS OR TABLES** in production to revert application code. For additive migrations (e.g. `004_announcement_images.sql`), leave unused columns intact when rolling back application code.
> 3. **NEVER EXECUTE `DROP TABLE` IN PRODUCTION**. Destructive table drops are permitted ONLY during fresh staging resets and are strictly forbidden on production databases.

### Migration Reversibility Matrix

| Migration File | Safe Production Rollback Strategy | Destructive Staging-Only Action |
| :--- | :--- | :--- |
| `002_secure_supabase_rls_and_policies.sql` | **Keep RLS Enabled**. Re-apply or roll forward previous known-secure policies via SQL editor. **Do NOT run `DISABLE ROW LEVEL SECURITY`.** | `DROP POLICY IF EXISTS ... ON public.users;` |
| `003_delete_faculty_rpc.sql` | **Safe**. Drop RPC function without affecting data: `DROP FUNCTION IF EXISTS public.delete_faculty_member(uuid);` | `DROP FUNCTION IF EXISTS public.delete_faculty_member(uuid);` |
| `004_announcement_images.sql` | **Leave columns intact**. Revert backend code; existing data remains safe in `image_url` columns. | `ALTER TABLE public.announcements DROP COLUMN IF EXISTS image_url;` *(Staging Reset Only)* |
| `create_platform_connections.sql` | **Preserve Table & Revert Code**. Keep table data intact; revert API container image. | `DROP TABLE IF EXISTS public.student_platform_connections CASCADE;` *(STAGING-RESET-ONLY)* |

---

## 3. Emergency Restoration from Point-in-Time Recovery (PITR) Backup

If database corruption occurs during staging or production deployment:
1. Open Supabase Console -> Project Settings -> Database -> Backups.
2. Select **Restore to Point-in-Time** matching the timestamp prior to deployment execution.
3. Restore snapshot into a **NON-PRODUCTION** secondary target project for data integrity verification before overriding primary database.
