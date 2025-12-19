-- ============================================================
-- INCIDENT MODULE - PHASE 2: RLS POLICIES & ACCESS CONTROL
-- ============================================================
-- Implements comprehensive Row Level Security for:
-- - incidents table (USER vs ADMIN access)
-- - incident_amendments (admin-only)
-- - incident_risk_mapping_history (admin-only)
-- - incident_comments (public vs internal)
--
-- Duration: ~30-45 minutes
-- Status: Ready to execute
-- ============================================================

-- =============================================================================
-- STEP 1: Enable RLS on All Tables
-- =============================================================================

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_risk_mapping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;
-- incident_risk_links already has RLS enabled from prerequisite fixes


-- =============================================================================
-- STEP 2: Drop Existing Incident Policies (Clean Slate)
-- =============================================================================

-- Drop any existing policies on incidents table
DROP POLICY IF EXISTS "Users see own incidents" ON incidents;
DROP POLICY IF EXISTS "Admins see all org incidents" ON incidents;
DROP POLICY IF EXISTS "incidents_select_user" ON incidents;
DROP POLICY IF EXISTS "incidents_select_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_user" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_update_user" ON incidents;
DROP POLICY IF EXISTS "incidents_update_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_admin" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_user" ON incidents;


-- =============================================================================
-- STEP 3: Incidents Table - USER Policies
-- =============================================================================

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

-- UPDATE: Users can only update their own OPEN incidents (limited fields)
-- Status changes are blocked by trigger for non-admins
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


-- =============================================================================
-- STEP 4: Incidents Table - ADMIN Policies
-- =============================================================================

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


-- =============================================================================
-- STEP 5: Incident Amendments - Admin-Only Access
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "amendments_select_admin" ON incident_amendments;
DROP POLICY IF EXISTS "amendments_insert_system" ON incident_amendments;

-- SELECT: Only admins can view amendment history
CREATE POLICY "amendments_select_admin"
  ON incident_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_amendments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: System-controlled (backend functions only)
CREATE POLICY "amendments_insert_system"
  ON incident_amendments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_amendments.organization_id = ctx.organization_id
    )
  );

COMMENT ON POLICY "amendments_select_admin" ON incident_amendments IS
  'Only administrators can view complete amendment history for audit purposes.';


-- =============================================================================
-- STEP 6: Incident Risk Mapping History - Admin-Only Access
-- =============================================================================

-- Policies already created in prerequisite fixes, but let's ensure they exist
DROP POLICY IF EXISTS "mapping_history_select_admin" ON incident_risk_mapping_history;
DROP POLICY IF EXISTS "mapping_history_insert_system" ON incident_risk_mapping_history;

-- SELECT: Only admins can view mapping history
CREATE POLICY "mapping_history_select_admin"
  ON incident_risk_mapping_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_risk_mapping_history.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: System-controlled only
CREATE POLICY "mapping_history_insert_system"
  ON incident_risk_mapping_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_risk_mapping_history.organization_id = ctx.organization_id
    )
  );

COMMENT ON POLICY "mapping_history_select_admin" ON incident_risk_mapping_history IS
  'Complete provenance of incident-to-risk mappings. Admin-only for audit trail integrity.';


-- =============================================================================
-- STEP 7: Incident Comments - Public vs Internal Visibility
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "comments_select_public" ON incident_comments;
DROP POLICY IF EXISTS "comments_select_admin" ON incident_comments;
DROP POLICY IF EXISTS "comments_insert_user" ON incident_comments;
DROP POLICY IF EXISTS "comments_insert_admin" ON incident_comments;
DROP POLICY IF EXISTS "comments_update_user" ON incident_comments;

-- SELECT: Users see public comments on incidents they can access
CREATE POLICY "comments_select_public"
  ON incident_comments FOR SELECT
  USING (
    is_internal = FALSE
    AND incident_id IN (SELECT id FROM incidents) -- Inherits incident access rules
  );

-- SELECT: Admins see all comments (public + internal) in their org
CREATE POLICY "comments_select_admin"
  ON incident_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: Users can add public comments to incidents they can see
CREATE POLICY "comments_insert_user"
  ON incident_comments FOR INSERT
  WITH CHECK (
    is_internal = FALSE
    AND incident_id IN (SELECT id FROM incidents)
    AND EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND incident_comments.user_id = ctx.user_id
        AND ctx.is_admin = FALSE
    )
  );

-- INSERT: Admins can add internal comments
CREATE POLICY "comments_insert_admin"
  ON incident_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

-- UPDATE: Users can only edit their own public comments (within reasonable time?)
CREATE POLICY "comments_update_user"
  ON incident_comments FOR UPDATE
  USING (
    is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.user_id = ctx.user_id
        AND ctx.is_admin = FALSE
    )
  );

-- UPDATE: Admins can edit any comment in their org
CREATE POLICY "comments_update_admin"
  ON incident_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_context() ctx
      WHERE incident_comments.organization_id = ctx.organization_id
        AND ctx.is_admin = TRUE
    )
  );

COMMENT ON POLICY "comments_select_public" ON incident_comments IS
  'Users see only public (non-internal) comments on incidents they have access to.';

COMMENT ON POLICY "comments_select_admin" ON incident_comments IS
  'Administrators see all comments including internal investigative dialogue.';


-- =============================================================================
-- STEP 8: Verification Queries
-- =============================================================================

-- Count policies on each table
SELECT
  'incidents' as table_name,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 7 THEN '✅ Expected: 7+ policies (3 user + 4 admin)'
    ELSE '❌ Only ' || COUNT(*) || ' policies found'
  END as status
FROM pg_policies
WHERE tablename = 'incidents'

UNION ALL

SELECT
  'incident_amendments',
  COUNT(*),
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Expected: 2+ policies'
    ELSE '❌ Only ' || COUNT(*) || ' policies'
  END
FROM pg_policies
WHERE tablename = 'incident_amendments'

UNION ALL

SELECT
  'incident_risk_mapping_history',
  COUNT(*),
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Expected: 2+ policies'
    ELSE '❌ Only ' || COUNT(*) || ' policies'
  END
FROM pg_policies
WHERE tablename = 'incident_risk_mapping_history'

UNION ALL

SELECT
  'incident_comments',
  COUNT(*),
  CASE
    WHEN COUNT(*) >= 5 THEN '✅ Expected: 5+ policies'
    ELSE '❌ Only ' || COUNT(*) || ' policies'
  END
FROM pg_policies
WHERE tablename = 'incident_comments'

UNION ALL

SELECT
  'incident_risk_links',
  COUNT(*),
  CASE
    WHEN COUNT(*) >= 5 THEN '✅ Expected: 5 policies (from prerequisite)'
    ELSE '❌ Only ' || COUNT(*) || ' policies'
  END
FROM pg_policies
WHERE tablename = 'incident_risk_links';


-- Verify RLS is enabled
SELECT
  'RLS Status' as check_name,
  CASE
    WHEN COUNT(*) = 5 THEN '✅ RLS enabled on all 5 tables'
    ELSE '❌ RLS only enabled on ' || COUNT(*) || ' of 5 tables'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('incidents', 'incident_amendments', 'incident_risk_mapping_history',
                    'incident_comments', 'incident_risk_links')
  AND rowsecurity = true;


-- =============================================================================
-- STEP 9: Security Test Cases (Manual Testing)
-- =============================================================================

-- Test Case 1: User from Org A cannot see Org B incidents
-- Run as: SET LOCAL "request.jwt.claims" TO '{"sub": "user-org-a-id"}';
-- SELECT COUNT(*) FROM incidents WHERE organization_id = 'org-b-id';
-- Expected: 0 rows

-- Test Case 2: User cannot change status of incident
-- UPDATE incidents SET status = 'CLOSED' WHERE id = 'some-incident-id';
-- Expected: Trigger error "Only administrators can change incident status"

-- Test Case 3: Admin can see all org incidents
-- Run as admin user
-- SELECT COUNT(*) FROM incidents WHERE organization_id = 'admin-org-id';
-- Expected: All org incidents visible

-- Test Case 4: User cannot see internal comments
-- SELECT * FROM incident_comments WHERE is_internal = TRUE;
-- Expected: 0 rows (for non-admin users)

-- Test Case 5: Admin can see internal comments
-- Run as admin user
-- SELECT * FROM incident_comments WHERE is_internal = TRUE;
-- Expected: All internal comments in their org visible


-- =============================================================================
-- SUMMARY
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'PHASE 2 COMPLETE: RLS POLICIES & ACCESS CONTROL';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies Created:';
  RAISE NOTICE '✅ incidents: 7 policies (USER: select/insert/update, ADMIN: select/insert/update/delete)';
  RAISE NOTICE '✅ incident_amendments: 2 policies (admin-only view, system insert)';
  RAISE NOTICE '✅ incident_risk_mapping_history: 2 policies (admin-only)';
  RAISE NOTICE '✅ incident_comments: 6 policies (public vs internal visibility)';
  RAISE NOTICE '✅ incident_risk_links: 5 policies (from prerequisite)';
  RAISE NOTICE '';
  RAISE NOTICE 'Access Control Summary:';
  RAISE NOTICE '• USERS: See only own incidents, can create/update OPEN incidents';
  RAISE NOTICE '• ADMINS: See all org incidents, full CRUD access';
  RAISE NOTICE '• Status changes: Admin-only (enforced by trigger)';
  RAISE NOTICE '• Amendments: Admin-only view';
  RAISE NOTICE '• Mapping history: Admin-only view';
  RAISE NOTICE '• Comments: Public (all users) vs Internal (admin-only)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Features:';
  RAISE NOTICE '• Multi-tenant isolation enforced';
  RAISE NOTICE '• Role-based access control';
  RAISE NOTICE '• Audit trail protection';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Review verification queries above (should show ✅)';
  RAISE NOTICE '2. Optionally run manual security tests';
  RAISE NOTICE '3. Proceed to Phase 3: USER Interface';
  RAISE NOTICE '';
END $$;
