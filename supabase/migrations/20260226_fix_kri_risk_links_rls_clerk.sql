-- Fix kri_risk_links RLS policies for Clerk auth
-- The Clerk migration (20260217) skipped this table, leaving old auth.uid() policies
-- that always return NULL since the app uses Clerk (not Supabase Auth)

-- Drop old broken policies
DROP POLICY IF EXISTS kri_risk_links_select_policy ON kri_risk_links;
DROP POLICY IF EXISTS kri_risk_links_insert_policy ON kri_risk_links;
DROP POLICY IF EXISTS kri_risk_links_delete_policy ON kri_risk_links;
DROP POLICY IF EXISTS kri_risk_links_update_policy ON kri_risk_links;

-- Ensure RLS is enabled
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- Create new Clerk-aware policies (matching kri_definitions pattern)
CREATE POLICY "clerk_kri_risk_links_select" ON kri_risk_links
  FOR SELECT USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_kri_risk_links_insert" ON kri_risk_links
  FOR INSERT WITH CHECK (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_kri_risk_links_update" ON kri_risk_links
  FOR UPDATE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_kri_risk_links_delete" ON kri_risk_links
  FOR DELETE USING (
    kri_id IN (SELECT id FROM kri_definitions WHERE organization_id = current_org_id())
    OR is_super_admin()
  );
