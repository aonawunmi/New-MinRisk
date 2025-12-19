-- ============================================================
-- PHASE 2 CLEANUP: Remove Duplicate/Old Incident Policies
-- ============================================================
-- Problem: incidents table has 15 policies instead of 7
-- Fix: Drop ALL policies and recreate only the 7 we need
-- Duration: 2-5 minutes
-- ============================================================

-- Step 1: Drop ALL existing policies on incidents table
DROP POLICY IF EXISTS "Users can view own incidents; Admins see all" ON incidents;
DROP POLICY IF EXISTS "Users can create incidents in their organization" ON incidents;
DROP POLICY IF EXISTS "Users update own incidents; Admins update all" ON incidents;
DROP POLICY IF EXISTS "Admins can delete incidents in their organization" ON incidents;
DROP POLICY IF EXISTS "incidents_select_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_update_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_select_user" ON incidents;
DROP POLICY IF EXISTS "incidents_select_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_user" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_update_user" ON incidents;
DROP POLICY IF EXISTS "incidents_update_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_admin" ON incidents;

-- Step 2: Create the 7 policies we need (3 USER + 4 ADMIN)

-- USER POLICIES (3)
-- ================

-- SELECT: Users see only their own incidents
CREATE POLICY "incidents_select_user"
  ON incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND incidents.reported_by = ctx.user_id
        AND ctx.is_admin = FALSE
    )
  );

-- INSERT: Users can create incidents in their org
CREATE POLICY "incidents_insert_user"
  ON incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND incidents.reported_by = ctx.user_id
        AND ctx.is_admin = FALSE
    )
  );

-- UPDATE: Users can only update their own OPEN incidents
CREATE POLICY "incidents_update_user"
  ON incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND incidents.reported_by = ctx.user_id
        AND incidents.status = 'OPEN'
        AND ctx.is_admin = FALSE
    )
  );


-- ADMIN POLICIES (4)
-- ==================

-- SELECT: Admins see all org incidents
CREATE POLICY "incidents_select_admin"
  ON incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: Admins can create incidents (for any user in org)
CREATE POLICY "incidents_insert_admin"
  ON incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- UPDATE: Admins can update any org incident
CREATE POLICY "incidents_update_admin"
  ON incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- DELETE: Admins can delete any org incident
CREATE POLICY "incidents_delete_admin"
  ON incidents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incidents.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );


-- Step 3: Verify we now have exactly 7 policies
SELECT
  'incidents' as table_name,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) = 7 THEN '✅ Correct: 7 policies (3 user + 4 admin)'
    WHEN COUNT(*) > 7 THEN '❌ Too many: ' || COUNT(*) || ' policies'
    ELSE '❌ Too few: ' || COUNT(*) || ' policies'
  END as status
FROM pg_policies
WHERE tablename = 'incidents';
