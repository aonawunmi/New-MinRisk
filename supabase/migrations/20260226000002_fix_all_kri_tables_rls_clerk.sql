-- Fix ALL remaining KRI table RLS policies for Clerk auth
-- The Clerk migration (20260217) dropped ALL old auth.uid() policies but missed recreating:
--   1. kri_definitions DELETE policy (has SELECT/INSERT/UPDATE but no DELETE)
--   2. kri_data_entries — ALL policies missing (zero recreated)
--   3. kri_alerts — ALL policies missing (zero recreated)
--   4. kri_risk_links — fixed in 20260226_fix_kri_risk_links_rls_clerk.sql

-- ============================================================================
-- 1. kri_definitions — Add missing DELETE policy
-- ============================================================================
DROP POLICY IF EXISTS kri_definitions_delete_policy ON kri_definitions;
DROP POLICY IF EXISTS clerk_kri_defs_delete ON kri_definitions;

CREATE POLICY "clerk_kri_defs_delete" ON kri_definitions
  FOR DELETE USING (
    organization_id = current_org_id()
    OR is_super_admin()
  );

-- ============================================================================
-- 2. kri_data_entries — All CRUD policies (none exist after Clerk migration)
-- ============================================================================
-- Drop any remnants just in case
DROP POLICY IF EXISTS kri_data_entries_select_policy ON kri_data_entries;
DROP POLICY IF EXISTS kri_data_entries_insert_policy ON kri_data_entries;
DROP POLICY IF EXISTS kri_data_entries_update_policy ON kri_data_entries;
DROP POLICY IF EXISTS kri_data_entries_delete_policy ON kri_data_entries;
DROP POLICY IF EXISTS clerk_kri_data_entries_select ON kri_data_entries;
DROP POLICY IF EXISTS clerk_kri_data_entries_insert ON kri_data_entries;
DROP POLICY IF EXISTS clerk_kri_data_entries_update ON kri_data_entries;
DROP POLICY IF EXISTS clerk_kri_data_entries_delete ON kri_data_entries;

-- Ensure RLS is enabled
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clerk_kri_data_entries_select" ON kri_data_entries
  FOR SELECT USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_kri_data_entries_insert" ON kri_data_entries
  FOR INSERT WITH CHECK (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_kri_data_entries_update" ON kri_data_entries
  FOR UPDATE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_kri_data_entries_delete" ON kri_data_entries
  FOR DELETE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

-- ============================================================================
-- 3. kri_alerts — All CRUD policies (none exist after Clerk migration)
-- ============================================================================
-- Drop any remnants just in case
DROP POLICY IF EXISTS kri_alerts_select_policy ON kri_alerts;
DROP POLICY IF EXISTS kri_alerts_insert_policy ON kri_alerts;
DROP POLICY IF EXISTS kri_alerts_update_policy ON kri_alerts;
DROP POLICY IF EXISTS kri_alerts_delete_policy ON kri_alerts;
DROP POLICY IF EXISTS clerk_kri_alerts_select ON kri_alerts;
DROP POLICY IF EXISTS clerk_kri_alerts_insert ON kri_alerts;
DROP POLICY IF EXISTS clerk_kri_alerts_update ON kri_alerts;
DROP POLICY IF EXISTS clerk_kri_alerts_delete ON kri_alerts;

-- Ensure RLS is enabled
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clerk_kri_alerts_select" ON kri_alerts
  FOR SELECT USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_kri_alerts_insert" ON kri_alerts
  FOR INSERT WITH CHECK (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_kri_alerts_update" ON kri_alerts
  FOR UPDATE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_kri_alerts_delete" ON kri_alerts
  FOR DELETE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );
