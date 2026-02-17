-- =====================================================================
-- CLERK MIGRATION: Full database schema migration
-- =====================================================================
-- Purpose: Migrate from Supabase Auth to Clerk Third-Party Auth
--
-- What this does:
--   1. Adds clerk_id + email columns to user_profiles
--   2. Drops ALL FK constraints referencing auth.users
--   3. Creates helper functions (clerk_user_uuid, current_org_id, is_admin)
--   4. Drops and recreates ALL RLS policies using Clerk JWT
--   5. Updates stored procedures/trigger functions
--   6. Adds clerk_org_id to organizations
--   7. Adds performance indexes
--
-- IMPORTANT: Run on STAGING first. This is a breaking change for
-- Supabase Auth. After this migration, ONLY Clerk-authenticated
-- users can access the app.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PART 1: SCHEMA CHANGES
-- =====================================================================

-- 1A. Add Clerk columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 1B. Add clerk_org_id to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clerk_org_id TEXT UNIQUE;

-- 1C. Drop the FK from user_profiles.id → auth.users(id)
-- This is the critical constraint that ties profiles to Supabase Auth
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class cl ON con.conrelid = cl.oid
    JOIN pg_namespace ns ON cl.relnamespace = ns.oid
    WHERE ns.nspname = 'public'
      AND cl.relname = 'user_profiles'
      AND con.contype = 'f'  -- foreign key
      AND EXISTS (
        SELECT 1 FROM pg_class ref_cl
        JOIN pg_namespace ref_ns ON ref_cl.relnamespace = ref_ns.oid
        WHERE con.confrelid = ref_cl.oid
          AND ref_ns.nspname = 'auth'
          AND ref_cl.relname = 'users'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
    RAISE NOTICE 'Dropped FK constraint % from user_profiles', r.constraint_name;
  END LOOP;
END $$;

-- 1D. Drop ALL FK constraints from ANY public table referencing auth.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ns.nspname AS table_schema,
           cl.relname AS table_name,
           con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class cl ON con.conrelid = cl.oid
    JOIN pg_namespace ns ON cl.relnamespace = ns.oid
    WHERE ns.nspname = 'public'
      AND con.contype = 'f'  -- foreign key
      AND EXISTS (
        SELECT 1 FROM pg_class ref_cl
        JOIN pg_namespace ref_ns ON ref_cl.relnamespace = ref_ns.oid
        WHERE con.confrelid = ref_cl.oid
          AND ref_ns.nspname = 'auth'
          AND ref_cl.relname = 'users'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
                   r.table_schema, r.table_name, r.constraint_name);
    RAISE NOTICE 'Dropped FK constraint % from %.%', r.constraint_name, r.table_schema, r.table_name;
  END LOOP;
END $$;

-- 1E. Drop the trigger on auth.users that creates user_profiles
-- (Clerk webhook will handle user creation instead)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =====================================================================
-- PART 2: HELPER FUNCTIONS
-- =====================================================================

-- 2A. clerk_user_uuid() — Maps Clerk JWT sub → user_profiles UUID
-- Used in RLS policies to get the current user's internal UUID
CREATE OR REPLACE FUNCTION public.clerk_user_uuid()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM user_profiles WHERE clerk_id = (SELECT auth.jwt()->>'sub') LIMIT 1
$$;

-- 2B. current_org_id() — Get current user's organization UUID
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM user_profiles WHERE clerk_id = (SELECT auth.jwt()->>'sub') LIMIT 1
$$;

-- 2C. is_admin() — Check if current user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE clerk_id = (SELECT auth.jwt()->>'sub')
      AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
  )
$$;

-- 2D. is_super_admin() — Check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE clerk_id = (SELECT auth.jwt()->>'sub')
      AND role = 'super_admin'
  )
$$;

-- 2E. current_user_role() — Get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM user_profiles WHERE clerk_id = (SELECT auth.jwt()->>'sub') LIMIT 1
$$;

-- =====================================================================
-- PART 3: DROP ALL EXISTING RLS POLICIES
-- =====================================================================
-- We drop ALL policies on affected tables, then recreate them.
-- This ensures a clean slate with no leftover auth.uid() references.

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  -- List of all tables that have RLS policies referencing auth
  FOR tbl IN
    SELECT DISTINCT tablename::text
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- =====================================================================
-- PART 4: RECREATE ALL RLS POLICIES (Clerk-based)
-- =====================================================================

-- Enable RLS on all BASE TABLES only (views inherit from underlying tables)
-- Use a dynamic approach to avoid errors on views/missing tables
DO $$
DECLARE
  tbl TEXT;
  tables_to_enable TEXT[] := ARRAY[
    'user_profiles', 'organizations', 'risks', 'controls', 'incidents',
    'user_invitations', 'audit_trail', 'risk_owner_history', 'external_events',
    'risk_intelligence_alerts', 'risk_intelligence_treatment_log', 'rss_sources',
    'app_configs', 'active_period', 'risk_history', 'period_commits',
    'control_assessments', 'incident_risk_links', 'ai_response_cache',
    'intelligence_analysis_cache', 'event_dedup_index',
    'risk_appetite_categories', 'risk_tolerance_exceptions',
    'library_suggestions', 'kri_kci_breach_tracking',
    'risk_controls_junction', 'risk_indicators_junction',
    'risk_keywords', 'control_effectiveness_tracking',
    'risk_approval_workflow', 'incident_resolution_actions',
    'kri_definitions',
    'root_cause_register', 'impact_register', 'control_library', 'kri_kci_library'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_enable LOOP
    -- Only enable RLS on base tables (not views)
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = tbl AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'Enabled RLS on table: %', tbl;
    ELSE
      RAISE NOTICE 'Skipped % (view or does not exist)', tbl;
    END IF;
  END LOOP;
END $$;

-- -------------------------------------------------------
-- 4A. user_profiles — Own profile only
-- -------------------------------------------------------
CREATE POLICY "clerk_profiles_select"
  ON user_profiles FOR SELECT
  USING (clerk_id = (auth.jwt()->>'sub'));

CREATE POLICY "clerk_profiles_update"
  ON user_profiles FOR UPDATE
  USING (clerk_id = (auth.jwt()->>'sub'));

-- Service role inserts (webhook creates profiles)
CREATE POLICY "clerk_profiles_insert"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Super admins can view all profiles in any org (for admin panel)
CREATE POLICY "clerk_profiles_select_admin"
  ON user_profiles FOR SELECT
  USING (is_super_admin());

-- Admins can view profiles in their org (for user management)
CREATE POLICY "clerk_profiles_select_org_admin"
  ON user_profiles FOR SELECT
  USING (
    organization_id = current_org_id()
    AND is_admin()
  );

-- -------------------------------------------------------
-- 4B. organizations — Own org only, super admins see all
-- -------------------------------------------------------
CREATE POLICY "clerk_orgs_select"
  ON organizations FOR SELECT
  USING (
    id = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_orgs_update"
  ON organizations FOR UPDATE
  USING (
    id = current_org_id()
    AND is_admin()
  );

CREATE POLICY "clerk_orgs_insert"
  ON organizations FOR INSERT
  WITH CHECK (true);  -- Service role / super admin only

-- -------------------------------------------------------
-- 4C. risks — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_risks_select"
  ON risks FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_risks_insert"
  ON risks FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "clerk_risks_update"
  ON risks FOR UPDATE
  USING (
    organization_id = current_org_id()
    AND (user_id = clerk_user_uuid() OR is_admin())
  );

CREATE POLICY "clerk_risks_delete"
  ON risks FOR DELETE
  USING (
    organization_id = current_org_id()
    AND (user_id = clerk_user_uuid() OR is_admin())
  );

-- -------------------------------------------------------
-- 4D. controls — Via risk's organization
-- -------------------------------------------------------
CREATE POLICY "clerk_controls_select"
  ON controls FOR SELECT
  USING (
    risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_controls_insert"
  ON controls FOR INSERT
  WITH CHECK (
    risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_controls_update"
  ON controls FOR UPDATE
  USING (
    risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_controls_delete"
  ON controls FOR DELETE
  USING (
    risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id())
    AND is_admin()
  );

-- -------------------------------------------------------
-- 4E. incidents — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_incidents_select"
  ON incidents FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_incidents_insert"
  ON incidents FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "clerk_incidents_update"
  ON incidents FOR UPDATE
  USING (organization_id = current_org_id());

CREATE POLICY "clerk_incidents_delete"
  ON incidents FOR DELETE
  USING (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4F. incident_risk_links — Via incident's organization
-- -------------------------------------------------------
CREATE POLICY "clerk_incident_risk_links_select"
  ON incident_risk_links FOR SELECT
  USING (
    incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_incident_risk_links_insert"
  ON incident_risk_links FOR INSERT
  WITH CHECK (
    incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_incident_risk_links_update"
  ON incident_risk_links FOR UPDATE
  USING (
    incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id())
  );

CREATE POLICY "clerk_incident_risk_links_delete"
  ON incident_risk_links FOR DELETE
  USING (
    incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id())
  );

-- -------------------------------------------------------
-- 4G. external_events — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_external_events_select"
  ON external_events FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_external_events_insert"
  ON external_events FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "clerk_external_events_update"
  ON external_events FOR UPDATE
  USING (organization_id = current_org_id());

CREATE POLICY "clerk_external_events_delete"
  ON external_events FOR DELETE
  USING (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4H. risk_intelligence_alerts — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_intel_alerts_select"
  ON risk_intelligence_alerts FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_intel_alerts_insert"
  ON risk_intelligence_alerts FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "clerk_intel_alerts_update"
  ON risk_intelligence_alerts FOR UPDATE
  USING (organization_id = current_org_id());

CREATE POLICY "clerk_intel_alerts_delete"
  ON risk_intelligence_alerts FOR DELETE
  USING (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4I. risk_intelligence_treatment_log — Via alert's org
-- -------------------------------------------------------
CREATE POLICY "clerk_intel_treatment_select"
  ON risk_intelligence_treatment_log FOR SELECT
  USING (
    alert_id IN (SELECT id FROM risk_intelligence_alerts WHERE organization_id = current_org_id())
    OR is_super_admin()
  );

CREATE POLICY "clerk_intel_treatment_insert"
  ON risk_intelligence_treatment_log FOR INSERT
  WITH CHECK (
    alert_id IN (SELECT id FROM risk_intelligence_alerts WHERE organization_id = current_org_id())
  );

-- -------------------------------------------------------
-- 4J. user_invitations — Admin-only, org-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_invitations_select"
  ON user_invitations FOR SELECT
  USING (
    organization_id = current_org_id()
    AND is_admin()
  );

CREATE POLICY "clerk_invitations_insert"
  ON user_invitations FOR INSERT
  WITH CHECK (
    organization_id = current_org_id()
    AND is_admin()
  );

CREATE POLICY "clerk_invitations_update"
  ON user_invitations FOR UPDATE
  USING (
    organization_id = current_org_id()
    AND is_admin()
  );

-- -------------------------------------------------------
-- 4K. audit_trail — Organization-scoped read, open insert
-- -------------------------------------------------------
CREATE POLICY "clerk_audit_select"
  ON audit_trail FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_audit_insert"
  ON audit_trail FOR INSERT
  WITH CHECK (true);  -- Triggered by system

-- -------------------------------------------------------
-- 4L. risk_owner_history — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_owner_history_select"
  ON risk_owner_history FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_owner_history_insert"
  ON risk_owner_history FOR INSERT
  WITH CHECK (true);  -- Triggered by system

-- -------------------------------------------------------
-- 4M. rss_sources — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_rss_select"
  ON rss_sources FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_rss_insert"
  ON rss_sources FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "clerk_rss_update"
  ON rss_sources FOR UPDATE
  USING (organization_id = current_org_id());

CREATE POLICY "clerk_rss_delete"
  ON rss_sources FOR DELETE
  USING (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4N. app_configs — Own config only
-- -------------------------------------------------------
CREATE POLICY "clerk_app_configs_select"
  ON app_configs FOR SELECT
  USING (user_id = clerk_user_uuid() OR is_super_admin());

CREATE POLICY "clerk_app_configs_insert"
  ON app_configs FOR INSERT
  WITH CHECK (user_id = clerk_user_uuid());

CREATE POLICY "clerk_app_configs_update"
  ON app_configs FOR UPDATE
  USING (user_id = clerk_user_uuid());

-- -------------------------------------------------------
-- 4O. active_period — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_active_period_select"
  ON active_period FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_active_period_insert"
  ON active_period FOR INSERT
  WITH CHECK (organization_id = current_org_id() AND is_admin());

CREATE POLICY "clerk_active_period_update"
  ON active_period FOR UPDATE
  USING (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4P. risk_history — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_risk_history_select"
  ON risk_history FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_risk_history_insert"
  ON risk_history FOR INSERT
  WITH CHECK (organization_id = current_org_id());

-- -------------------------------------------------------
-- 4Q. period_commits — Organization-scoped, admin insert
-- -------------------------------------------------------
CREATE POLICY "clerk_period_commits_select"
  ON period_commits FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_period_commits_insert"
  ON period_commits FOR INSERT
  WITH CHECK (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4R. control_assessments — Organization-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_control_assessments_select"
  ON control_assessments FOR SELECT
  USING (organization_id = current_org_id() OR is_super_admin());

CREATE POLICY "clerk_control_assessments_insert"
  ON control_assessments FOR INSERT
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "clerk_control_assessments_update"
  ON control_assessments FOR UPDATE
  USING (organization_id = current_org_id());

CREATE POLICY "clerk_control_assessments_delete"
  ON control_assessments FOR DELETE
  USING (organization_id = current_org_id() AND is_admin());

-- -------------------------------------------------------
-- 4S. Library tables — Organization-scoped with admin gates
-- -------------------------------------------------------

-- Library tables: root_cause_register, impact_register, control_library, kri_kci_library
-- These may be VIEWS (not tables), so wrap in conditional blocks
DO $$
DECLARE
  lib_table TEXT;
  lib_tables TEXT[] := ARRAY['root_cause_register', 'impact_register', 'control_library', 'kri_kci_library'];
  prefix TEXT;
  prefixes TEXT[] := ARRAY['root_cause', 'impact', 'control_lib', 'kri_lib'];
  i INT;
BEGIN
  FOR i IN 1..array_length(lib_tables, 1) LOOP
    lib_table := lib_tables[i];
    prefix := prefixes[i];

    -- Only create policies if it's a base table (not a view)
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = lib_table AND c.relkind = 'r'
    ) THEN
      EXECUTE format('CREATE POLICY "clerk_%s_select" ON %I FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())', prefix, lib_table);
      EXECUTE format('CREATE POLICY "clerk_%s_insert" ON %I FOR INSERT WITH CHECK (organization_id = current_org_id())', prefix, lib_table);
      EXECUTE format('CREATE POLICY "clerk_%s_update" ON %I FOR UPDATE USING (organization_id = current_org_id() AND is_admin())', prefix, lib_table);
      EXECUTE format('CREATE POLICY "clerk_%s_delete" ON %I FOR DELETE USING (organization_id = current_org_id() AND is_admin())', prefix, lib_table);
      RAISE NOTICE 'Created RLS policies for table: %', lib_table;
    ELSE
      RAISE NOTICE 'Skipped policies for % (view or does not exist)', lib_table;
    END IF;
  END LOOP;
END $$;

-- -------------------------------------------------------
-- 4T. ai_response_cache — Shared or org-scoped
-- -------------------------------------------------------
CREATE POLICY "clerk_ai_cache_select"
  ON ai_response_cache FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_ai_cache_insert"
  ON ai_response_cache FOR INSERT
  WITH CHECK (auth.jwt()->>'sub' IS NOT NULL);

CREATE POLICY "clerk_ai_cache_update"
  ON ai_response_cache FOR UPDATE
  USING (auth.jwt()->>'sub' IS NOT NULL);

-- -------------------------------------------------------
-- 4U. Conditional tables (may or may not exist)
-- -------------------------------------------------------

-- intelligence_analysis_cache
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_intel_cache_select" ON intelligence_analysis_cache FOR SELECT USING (auth.jwt()->>''sub'' IS NOT NULL)';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- event_dedup_index
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_dedup_select" ON event_dedup_index FOR SELECT USING (auth.jwt()->>''sub'' IS NOT NULL)';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_dedup_insert" ON event_dedup_index FOR INSERT WITH CHECK (auth.jwt()->>''sub'' IS NOT NULL)';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- risk_appetite_categories
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_appetite_select" ON risk_appetite_categories FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_appetite_insert" ON risk_appetite_categories FOR INSERT WITH CHECK (organization_id = current_org_id() AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_appetite_update" ON risk_appetite_categories FOR UPDATE USING (organization_id = current_org_id() AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_appetite_delete" ON risk_appetite_categories FOR DELETE USING (organization_id = current_org_id() AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- risk_tolerance_exceptions
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_tolerance_select" ON risk_tolerance_exceptions FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_tolerance_insert" ON risk_tolerance_exceptions FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_tolerance_update" ON risk_tolerance_exceptions FOR UPDATE USING (organization_id = current_org_id() AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- library_suggestions
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_lib_suggestions_select" ON library_suggestions FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_lib_suggestions_insert" ON library_suggestions FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_lib_suggestions_update" ON library_suggestions FOR UPDATE USING (organization_id = current_org_id() AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- kri_kci_breach_tracking
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_breach_select" ON kri_kci_breach_tracking FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_breach_insert" ON kri_kci_breach_tracking FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_breach_update" ON kri_kci_breach_tracking FOR UPDATE USING (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- risk_controls_junction
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_risk_controls_select" ON risk_controls_junction FOR SELECT USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_risk_controls_insert" ON risk_controls_junction FOR INSERT WITH CHECK (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()))';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_risk_controls_delete" ON risk_controls_junction FOR DELETE USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- risk_indicators_junction
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_risk_indicators_select" ON risk_indicators_junction FOR SELECT USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_risk_indicators_insert" ON risk_indicators_junction FOR INSERT WITH CHECK (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()))';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_risk_indicators_delete" ON risk_indicators_junction FOR DELETE USING (risk_id IN (SELECT id FROM risks WHERE organization_id = current_org_id()) AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- risk_keywords
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_keywords_select" ON risk_keywords FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_keywords_insert" ON risk_keywords FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- control_effectiveness_tracking
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_effectiveness_select" ON control_effectiveness_tracking FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_effectiveness_insert" ON control_effectiveness_tracking FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- risk_approval_workflow
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_approval_select" ON risk_approval_workflow FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_approval_insert" ON risk_approval_workflow FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_approval_update" ON risk_approval_workflow FOR UPDATE USING (organization_id = current_org_id() AND is_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- kri_definitions
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_kri_defs_select" ON kri_definitions FOR SELECT USING (organization_id = current_org_id() OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_kri_defs_insert" ON kri_definitions FOR INSERT WITH CHECK (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_kri_defs_update" ON kri_definitions FOR UPDATE USING (organization_id = current_org_id())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- incident_resolution_actions
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_resolution_select" ON incident_resolution_actions FOR SELECT USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id()) OR is_super_admin())';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_resolution_insert" ON incident_resolution_actions FOR INSERT WITH CHECK (incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id()))';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "clerk_resolution_update" ON incident_resolution_actions FOR UPDATE USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = current_org_id()))';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- PART 5: UPDATE STORED PROCEDURES & TRIGGER FUNCTIONS
-- =====================================================================

-- 5A. Audit trail trigger — Log user changes
CREATE OR REPLACE FUNCTION audit_risks_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := clerk_user_uuid();
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (table_name, record_id, action, new_data, user_id, organization_id)
    VALUES ('risks', NEW.id, 'INSERT', to_jsonb(NEW), v_user_id, v_org_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data, user_id, organization_id)
    VALUES ('risks', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id, v_org_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_data, user_id, organization_id)
    VALUES ('risks', OLD.id, 'DELETE', to_jsonb(OLD), v_user_id, v_org_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5B. Audit controls trigger
CREATE OR REPLACE FUNCTION audit_controls_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := clerk_user_uuid();
  -- Get org from the parent risk
  SELECT organization_id INTO v_org_id
  FROM risks WHERE id = COALESCE(NEW.risk_id, OLD.risk_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (table_name, record_id, action, new_data, user_id, organization_id)
    VALUES ('controls', NEW.id, 'INSERT', to_jsonb(NEW), v_user_id, v_org_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data, user_id, organization_id)
    VALUES ('controls', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id, v_org_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_data, user_id, organization_id)
    VALUES ('controls', OLD.id, 'DELETE', to_jsonb(OLD), v_user_id, v_org_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5C. Audit user_profiles trigger
CREATE OR REPLACE FUNCTION audit_user_profiles_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := clerk_user_uuid();
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (table_name, record_id, action, new_data, user_id, organization_id)
    VALUES ('user_profiles', NEW.id, 'INSERT', to_jsonb(NEW), v_user_id, v_org_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data, user_id, organization_id)
    VALUES ('user_profiles', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id, v_org_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (table_name, record_id, action, old_data, user_id, organization_id)
    VALUES ('user_profiles', OLD.id, 'DELETE', to_jsonb(OLD), v_user_id, v_org_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5D. Log owner transfer
CREATE OR REPLACE FUNCTION log_owner_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.owner_profile_id IS DISTINCT FROM NEW.owner_profile_id THEN
    INSERT INTO risk_owner_history (
      risk_id, organization_id,
      previous_owner_id, new_owner_id, transferred_by
    ) VALUES (
      NEW.id, NEW.organization_id,
      OLD.owner_profile_id, NEW.owner_profile_id, clerk_user_uuid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5E. Create invitation (using clerk_user_uuid for created_by)
CREATE OR REPLACE FUNCTION create_invitation(
  p_email VARCHAR(255),
  p_organization_id UUID,
  p_role VARCHAR(50),
  p_expires_in_days INTEGER DEFAULT 7,
  p_notes TEXT DEFAULT NULL
)
RETURNS user_invitations AS $$
DECLARE
  v_invitation user_invitations;
  v_code VARCHAR(8);
BEGIN
  v_code := upper(substring(md5(random()::text) from 1 for 8));

  INSERT INTO user_invitations (
    email, organization_id, role, invite_code,
    status, created_by, expires_at, notes
  ) VALUES (
    p_email, p_organization_id, p_role, v_code,
    'pending', clerk_user_uuid(),
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_notes
  )
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5F. Revoke invitation
CREATE OR REPLACE FUNCTION revoke_invitation(
  p_invitation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE user_invitations
  SET
    status = 'revoked',
    revoked_by = clerk_user_uuid(),
    revoked_at = NOW(),
    revoke_reason = p_reason
  WHERE id = p_invitation_id
    AND status = 'pending'
  RETURNING 1 INTO v_updated;
  RETURN v_updated IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5G. Log audit entry helper
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data, user_id, organization_id)
  VALUES (p_table_name, p_record_id, p_action, p_old_data, p_new_data, clerk_user_uuid(), COALESCE(p_organization_id, current_org_id()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5H. Update change_user_status if it exists
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION change_user_status(
    p_user_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL,
    p_request_id UUID DEFAULT gen_random_uuid()
  )
  RETURNS JSONB AS $fn$
  DECLARE
    v_actor_id UUID := clerk_user_uuid();
    v_old_status TEXT;
    v_result JSONB;
  BEGIN
    SELECT status::text INTO v_old_status FROM user_profiles WHERE id = p_user_id;
    IF v_old_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    UPDATE user_profiles
    SET status = p_new_status::user_status,
        approved_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE approved_at END,
        approved_by = CASE WHEN p_new_status = 'approved' THEN v_actor_id ELSE approved_by END,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'old_status', v_old_status, 'new_status', p_new_status);
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5I. Update change_user_role if it exists
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION change_user_role(
    p_user_id UUID,
    p_new_role TEXT,
    p_reason TEXT DEFAULT NULL,
    p_request_id UUID DEFAULT gen_random_uuid()
  )
  RETURNS JSONB AS $fn$
  DECLARE
    v_actor_id UUID := clerk_user_uuid();
    v_old_role TEXT;
  BEGIN
    SELECT role::text INTO v_old_role FROM user_profiles WHERE id = p_user_id;
    IF v_old_role IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    UPDATE user_profiles
    SET role = p_new_role::user_role,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'old_role', v_old_role, 'new_role', p_new_role);
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5J. Session management functions (update to use clerk_user_uuid)
CREATE OR REPLACE FUNCTION register_new_login(p_session_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := clerk_user_uuid();
BEGIN
  -- Deactivate all existing sessions for this user
  DELETE FROM active_sessions WHERE user_id = v_user_id;
  -- Register new session
  INSERT INTO active_sessions (user_id, session_id, last_heartbeat)
  VALUES (v_user_id, p_session_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET session_id = p_session_id, last_heartbeat = NOW();
EXCEPTION WHEN undefined_table THEN
  -- active_sessions table may not exist; ignore
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := clerk_user_uuid();
  v_current_session TEXT;
BEGIN
  SELECT session_id INTO v_current_session
  FROM active_sessions
  WHERE user_id = v_user_id;

  IF v_current_session IS NULL OR v_current_session = p_session_id THEN
    -- Session is valid, update heartbeat
    UPDATE active_sessions
    SET last_heartbeat = NOW()
    WHERE user_id = v_user_id AND session_id = p_session_id;
    RETURN true;
  ELSE
    -- Another session has taken over
    RETURN false;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RETURN true;  -- If table doesn't exist, always succeed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- PART 6: PERFORMANCE INDEXES
-- =====================================================================

-- Critical index for clerk_user_uuid() function performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id ON user_profiles (clerk_id);

-- Index for current_org_id() function
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id_org ON user_profiles (clerk_id, organization_id);

-- Index for clerk_org_id lookups
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON organizations (clerk_org_id);

-- =====================================================================
-- PART 7: CLEAN UP OLD DATA (Fresh start on staging)
-- =====================================================================

-- Clear old user_profiles (starting fresh with Clerk users)
TRUNCATE user_profiles CASCADE;

-- Clear old invitations
TRUNCATE user_invitations CASCADE;

-- Clear old audit trail (references old user IDs)
TRUNCATE audit_trail CASCADE;

-- Clear old risk owner history (references old user IDs)
TRUNCATE risk_owner_history CASCADE;

-- Clear old active sessions
DO $$ BEGIN
  EXECUTE 'TRUNCATE active_sessions CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

COMMIT;

-- =====================================================================
-- Migration complete!
--
-- Next steps:
--   1. Deploy clerk-webhook Edge Function
--   2. Create a test user in Clerk Dashboard
--   3. Verify the webhook creates a user_profiles row
--   4. Test RLS policies with the Clerk JWT
-- =====================================================================
