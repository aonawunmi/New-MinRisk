-- =====================================================================
-- FIX: SEC RLS Policies for Clerk Auth (v2 — corrected column names)
-- =====================================================================
-- Problem:
--   1. Previous RLS policies used auth.uid() — doesn't work with Clerk
--   2. sec_submission_deadlines has regulator_id, NOT organization_id
--   3. Original migration policies also used auth.uid()
--
-- This script drops ALL old policies and recreates using Clerk helpers:
--   clerk_user_uuid(), current_org_id(), is_admin(), is_super_admin()
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. regulators — Reference data, everyone can read
-- =====================================================================
DROP POLICY IF EXISTS "regulators_select_all" ON regulators;
DROP POLICY IF EXISTS "regulators_admin_insert" ON regulators;
DROP POLICY IF EXISTS "regulators_admin_update" ON regulators;
DROP POLICY IF EXISTS "regulators_super_admin_all" ON regulators;
DROP POLICY IF EXISTS "regulators_super_admin_manage" ON regulators;
DROP POLICY IF EXISTS "regulators_view_own" ON regulators;

CREATE POLICY "regulators_select_all" ON regulators
  FOR SELECT USING (true);

CREATE POLICY "regulators_super_admin_manage" ON regulators
  FOR ALL USING (is_super_admin());

-- =====================================================================
-- 2. organization_regulators — Org-scoped via current_org_id()
-- =====================================================================
DROP POLICY IF EXISTS "org_regulators_select_own" ON organization_regulators;
DROP POLICY IF EXISTS "org_regulators_admin_insert" ON organization_regulators;
DROP POLICY IF EXISTS "org_regulators_admin_delete" ON organization_regulators;
DROP POLICY IF EXISTS "org_regulators_super_admin" ON organization_regulators;
DROP POLICY IF EXISTS "org_regulators_view_assigned" ON organization_regulators;
DROP POLICY IF EXISTS "org_regulators_view_own_org" ON organization_regulators;

CREATE POLICY "org_regulators_select_own" ON organization_regulators
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "org_regulators_super_admin" ON organization_regulators
  FOR ALL USING (is_super_admin());

CREATE POLICY "org_regulators_admin_insert" ON organization_regulators
  FOR INSERT WITH CHECK (is_admin() AND organization_id = current_org_id());

CREATE POLICY "org_regulators_admin_delete" ON organization_regulators
  FOR DELETE USING (is_admin() AND organization_id = current_org_id());

-- =====================================================================
-- 3. sec_standard_categories — Reference data, all can read
-- =====================================================================
DROP POLICY IF EXISTS "sec_categories_select_all" ON sec_standard_categories;

CREATE POLICY "sec_categories_select_all" ON sec_standard_categories
  FOR SELECT USING (true);

-- =====================================================================
-- 4. sec_category_mappings — Org-scoped
-- =====================================================================
DROP POLICY IF EXISTS "sec_mappings_select_own" ON sec_category_mappings;
DROP POLICY IF EXISTS "sec_mappings_admin_insert" ON sec_category_mappings;
DROP POLICY IF EXISTS "sec_mappings_admin_update" ON sec_category_mappings;
DROP POLICY IF EXISTS "sec_mappings_admin_delete" ON sec_category_mappings;

CREATE POLICY "sec_mappings_select_own" ON sec_category_mappings
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "sec_mappings_admin_insert" ON sec_category_mappings
  FOR INSERT WITH CHECK (is_admin() AND organization_id = current_org_id());

CREATE POLICY "sec_mappings_admin_update" ON sec_category_mappings
  FOR UPDATE USING (is_admin() AND organization_id = current_org_id());

CREATE POLICY "sec_mappings_admin_delete" ON sec_category_mappings
  FOR DELETE USING (is_admin() AND organization_id = current_org_id());

-- =====================================================================
-- 5. sec_submissions — Org-scoped
-- =====================================================================
DROP POLICY IF EXISTS "sec_submissions_select_own" ON sec_submissions;
DROP POLICY IF EXISTS "sec_submissions_admin_insert" ON sec_submissions;
DROP POLICY IF EXISTS "sec_submissions_admin_update" ON sec_submissions;
DROP POLICY IF EXISTS "sec_sub_super_admin" ON sec_submissions;
DROP POLICY IF EXISTS "sec_sub_org_manage" ON sec_submissions;
DROP POLICY IF EXISTS "sec_sub_org_read" ON sec_submissions;
DROP POLICY IF EXISTS "sec_sub_regulator_read" ON sec_submissions;
DROP POLICY IF EXISTS "sec_sub_regulator_review" ON sec_submissions;

CREATE POLICY "sec_sub_org_read" ON sec_submissions
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "sec_sub_org_manage" ON sec_submissions
  FOR ALL USING (is_admin() AND organization_id = current_org_id());

CREATE POLICY "sec_sub_super_admin" ON sec_submissions
  FOR ALL USING (is_super_admin());

-- =====================================================================
-- 6. sec_submission_deadlines — Has regulator_id, NOT organization_id
--    Everyone can read (need to know when submissions are due)
-- =====================================================================
DROP POLICY IF EXISTS "sec_deadlines_select_own" ON sec_submission_deadlines;
DROP POLICY IF EXISTS "sec_deadlines_admin_manage" ON sec_submission_deadlines;
DROP POLICY IF EXISTS "sec_deadlines_super_admin" ON sec_submission_deadlines;
DROP POLICY IF EXISTS "sec_deadlines_regulator_manage" ON sec_submission_deadlines;
DROP POLICY IF EXISTS "sec_deadlines_org_read" ON sec_submission_deadlines;
DROP POLICY IF EXISTS "sec_deadlines_read_all" ON sec_submission_deadlines;

CREATE POLICY "sec_deadlines_read_all" ON sec_submission_deadlines
  FOR SELECT USING (true);

CREATE POLICY "sec_deadlines_super_admin" ON sec_submission_deadlines
  FOR ALL USING (is_super_admin());

-- =====================================================================
-- 7. sec_submission_narratives — Via parent submission's org
-- =====================================================================
DROP POLICY IF EXISTS "sec_narratives_select_own" ON sec_submission_narratives;
DROP POLICY IF EXISTS "sec_narratives_admin_manage" ON sec_submission_narratives;
DROP POLICY IF EXISTS "sec_narr_super_admin" ON sec_submission_narratives;
DROP POLICY IF EXISTS "sec_narr_org_manage" ON sec_submission_narratives;
DROP POLICY IF EXISTS "sec_narr_org_read" ON sec_submission_narratives;
DROP POLICY IF EXISTS "sec_narr_regulator_read" ON sec_submission_narratives;

CREATE POLICY "sec_narr_org_read" ON sec_submission_narratives
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM sec_submissions WHERE organization_id = current_org_id()
    )
  );

CREATE POLICY "sec_narr_org_manage" ON sec_submission_narratives
  FOR ALL USING (
    is_admin() AND submission_id IN (
      SELECT id FROM sec_submissions WHERE organization_id = current_org_id()
    )
  );

CREATE POLICY "sec_narr_super_admin" ON sec_submission_narratives
  FOR ALL USING (is_super_admin());

-- =====================================================================
-- 8. sec_review_comments — Via parent submission's org
-- =====================================================================
DROP POLICY IF EXISTS "sec_comments_select_own" ON sec_review_comments;
DROP POLICY IF EXISTS "sec_comments_insert" ON sec_review_comments;
DROP POLICY IF EXISTS "sec_review_super_admin" ON sec_review_comments;
DROP POLICY IF EXISTS "sec_review_regulator_insert" ON sec_review_comments;
DROP POLICY IF EXISTS "sec_review_regulator_read" ON sec_review_comments;
DROP POLICY IF EXISTS "sec_review_org_read" ON sec_review_comments;
DROP POLICY IF EXISTS "sec_review_admin_insert" ON sec_review_comments;

CREATE POLICY "sec_review_org_read" ON sec_review_comments
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM sec_submissions WHERE organization_id = current_org_id()
    )
  );

CREATE POLICY "sec_review_admin_insert" ON sec_review_comments
  FOR INSERT WITH CHECK (
    is_admin() AND submission_id IN (
      SELECT id FROM sec_submissions WHERE organization_id = current_org_id()
    )
  );

CREATE POLICY "sec_review_super_admin" ON sec_review_comments
  FOR ALL USING (is_super_admin());

-- =====================================================================
-- 9. sec_default_category_mappings — Reference data, all can read
-- =====================================================================
DROP POLICY IF EXISTS "sec_defaults_select_all" ON sec_default_category_mappings;

CREATE POLICY "sec_defaults_select_all" ON sec_default_category_mappings
  FOR SELECT USING (true);

-- =====================================================================
-- 10. regulator_access — Fix to use Clerk helpers
-- =====================================================================
DROP POLICY IF EXISTS "regulator_access_super_admin" ON regulator_access;
DROP POLICY IF EXISTS "regulator_access_view_own" ON regulator_access;

CREATE POLICY "regulator_access_super_admin" ON regulator_access
  FOR ALL USING (is_super_admin());

CREATE POLICY "regulator_access_view_own" ON regulator_access
  FOR SELECT USING (user_id = clerk_user_uuid());

-- =====================================================================
-- 11. Ensure RLS is enabled on all tables
-- =====================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'regulators', 'organization_regulators',
    'sec_standard_categories', 'sec_category_mappings',
    'sec_submissions', 'sec_submission_deadlines',
    'sec_submission_narratives', 'sec_review_comments',
    'sec_default_category_mappings', 'regulator_access'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = tbl AND n.nspname = 'public' AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;
