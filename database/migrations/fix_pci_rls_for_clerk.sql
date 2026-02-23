-- ============================================================================
-- FIX PCI RLS POLICIES FOR CLERK AUTH (Staging)
-- Date: 2026-02-23
-- Problem: All PCI table RLS policies use auth.uid() which doesn't work with
--          Clerk Third-Party Auth. Must use clerk_user_uuid(), current_org_id(),
--          is_admin(), is_super_admin() helper functions instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Recreate helper functions (ensure they also use Clerk)
-- ============================================================================

-- get_org_from_risk: Returns organization_id from a risk_id
-- This is SECURITY DEFINER so it bypasses RLS — no auth.uid() needed
CREATE OR REPLACE FUNCTION get_org_from_risk(p_risk_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id FROM risks WHERE id = p_risk_id;
$$;

-- get_org_from_pci: Returns organization_id from a pci_instance_id
CREATE OR REPLACE FUNCTION get_org_from_pci(p_pci_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id FROM pci_instances WHERE id = p_pci_id;
$$;

-- ============================================================================
-- STEP 2: DROP ALL OLD POLICIES (auth.uid() based)
-- ============================================================================

-- risk_responses
DROP POLICY IF EXISTS "Users can view org risk_responses" ON risk_responses;
DROP POLICY IF EXISTS "Admins can manage risk_responses" ON risk_responses;

-- pci_templates
DROP POLICY IF EXISTS "All users can view pci_templates" ON pci_templates;
DROP POLICY IF EXISTS "Super admin can manage pci_templates" ON pci_templates;

-- secondary_control_templates
DROP POLICY IF EXISTS "All users can view sc_templates" ON secondary_control_templates;
DROP POLICY IF EXISTS "Super admin can manage sc_templates" ON secondary_control_templates;

-- pci_instances
DROP POLICY IF EXISTS "Users can view org pci_instances" ON pci_instances;
DROP POLICY IF EXISTS "Admins can manage pci_instances" ON pci_instances;

-- secondary_control_instances
DROP POLICY IF EXISTS "Users can view org sc_instances" ON secondary_control_instances;
DROP POLICY IF EXISTS "Users can manage sc_instances" ON secondary_control_instances;

-- derived_dime_scores
DROP POLICY IF EXISTS "Users can view org dime_scores" ON derived_dime_scores;

-- confidence_scores
DROP POLICY IF EXISTS "Users can view org confidence_scores" ON confidence_scores;

-- evidence_requests
DROP POLICY IF EXISTS "Users can view org evidence_requests" ON evidence_requests;
DROP POLICY IF EXISTS "Users can create evidence_requests" ON evidence_requests;
DROP POLICY IF EXISTS "Users can update own evidence_requests" ON evidence_requests;

-- evidence_submissions
DROP POLICY IF EXISTS "Users can view org evidence_submissions" ON evidence_submissions;
DROP POLICY IF EXISTS "Users can create evidence_submissions" ON evidence_submissions;
DROP POLICY IF EXISTS "Admins can review evidence_submissions" ON evidence_submissions;

-- Also drop any Clerk policies if re-running this script
DROP POLICY IF EXISTS "clerk_risk_responses_select" ON risk_responses;
DROP POLICY IF EXISTS "clerk_risk_responses_manage" ON risk_responses;
DROP POLICY IF EXISTS "clerk_risk_responses_super" ON risk_responses;
DROP POLICY IF EXISTS "clerk_pci_templates_select" ON pci_templates;
DROP POLICY IF EXISTS "clerk_pci_templates_manage" ON pci_templates;
DROP POLICY IF EXISTS "clerk_sc_templates_select" ON secondary_control_templates;
DROP POLICY IF EXISTS "clerk_sc_templates_manage" ON secondary_control_templates;
DROP POLICY IF EXISTS "clerk_pci_instances_select" ON pci_instances;
DROP POLICY IF EXISTS "clerk_pci_instances_manage" ON pci_instances;
DROP POLICY IF EXISTS "clerk_pci_instances_super" ON pci_instances;
DROP POLICY IF EXISTS "clerk_sc_instances_select" ON secondary_control_instances;
DROP POLICY IF EXISTS "clerk_sc_instances_manage" ON secondary_control_instances;
DROP POLICY IF EXISTS "clerk_dime_scores_select" ON derived_dime_scores;
DROP POLICY IF EXISTS "clerk_dime_scores_system_write" ON derived_dime_scores;
DROP POLICY IF EXISTS "clerk_confidence_scores_select" ON confidence_scores;
DROP POLICY IF EXISTS "clerk_confidence_scores_system_write" ON confidence_scores;
DROP POLICY IF EXISTS "clerk_evidence_requests_select" ON evidence_requests;
DROP POLICY IF EXISTS "clerk_evidence_requests_insert" ON evidence_requests;
DROP POLICY IF EXISTS "clerk_evidence_requests_update" ON evidence_requests;
DROP POLICY IF EXISTS "clerk_evidence_requests_super" ON evidence_requests;
DROP POLICY IF EXISTS "clerk_evidence_submissions_select" ON evidence_submissions;
DROP POLICY IF EXISTS "clerk_evidence_submissions_insert" ON evidence_submissions;
DROP POLICY IF EXISTS "clerk_evidence_submissions_update" ON evidence_submissions;

-- ============================================================================
-- STEP 3: Ensure RLS is ENABLED on all tables
-- ============================================================================

ALTER TABLE risk_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pci_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_control_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pci_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_control_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE derived_dime_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE NEW CLERK-COMPATIBLE POLICIES
-- ============================================================================

-- --------------------------------------------------------------------------
-- risk_responses: org-scoped via risk_id → risks.organization_id
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_risk_responses_select"
  ON risk_responses FOR SELECT
  USING (
    get_org_from_risk(risk_id) = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_risk_responses_manage"
  ON risk_responses FOR ALL
  USING (
    get_org_from_risk(risk_id) = current_org_id()
  );

-- --------------------------------------------------------------------------
-- pci_templates: global read (seed library), super_admin write
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_pci_templates_select"
  ON pci_templates FOR SELECT
  USING (true);

CREATE POLICY "clerk_pci_templates_manage"
  ON pci_templates FOR ALL
  USING (is_super_admin());

-- --------------------------------------------------------------------------
-- secondary_control_templates: global read, super_admin write
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_sc_templates_select"
  ON secondary_control_templates FOR SELECT
  USING (true);

CREATE POLICY "clerk_sc_templates_manage"
  ON secondary_control_templates FOR ALL
  USING (is_super_admin());

-- --------------------------------------------------------------------------
-- pci_instances: org-scoped (has organization_id column)
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_pci_instances_select"
  ON pci_instances FOR SELECT
  USING (
    organization_id = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_pci_instances_manage"
  ON pci_instances FOR ALL
  USING (
    organization_id = current_org_id()
  );

-- --------------------------------------------------------------------------
-- secondary_control_instances: via pci_instance org
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_sc_instances_select"
  ON secondary_control_instances FOR SELECT
  USING (
    get_org_from_pci(pci_instance_id) = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_sc_instances_manage"
  ON secondary_control_instances FOR ALL
  USING (
    get_org_from_pci(pci_instance_id) = current_org_id()
  );

-- --------------------------------------------------------------------------
-- derived_dime_scores: via pci_instance org (read-only for users)
-- System writes via SECURITY DEFINER triggers bypass RLS
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_dime_scores_select"
  ON derived_dime_scores FOR SELECT
  USING (
    get_org_from_pci(pci_instance_id) = current_org_id()
    OR is_super_admin()
  );

-- Allow system/trigger writes (triggers run as SECURITY DEFINER)
CREATE POLICY "clerk_dime_scores_system_write"
  ON derived_dime_scores FOR ALL
  USING (
    get_org_from_pci(pci_instance_id) = current_org_id()
    OR is_super_admin()
  );

-- --------------------------------------------------------------------------
-- confidence_scores: via pci_instance org (read-only for users)
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_confidence_scores_select"
  ON confidence_scores FOR SELECT
  USING (
    get_org_from_pci(pci_instance_id) = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_confidence_scores_system_write"
  ON confidence_scores FOR ALL
  USING (
    get_org_from_pci(pci_instance_id) = current_org_id()
    OR is_super_admin()
  );

-- --------------------------------------------------------------------------
-- evidence_requests: org-scoped (has organization_id column)
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_evidence_requests_select"
  ON evidence_requests FOR SELECT
  USING (
    organization_id = current_org_id()
    OR is_super_admin()
  );

CREATE POLICY "clerk_evidence_requests_insert"
  ON evidence_requests FOR INSERT
  WITH CHECK (
    organization_id = current_org_id()
  );

CREATE POLICY "clerk_evidence_requests_update"
  ON evidence_requests FOR UPDATE
  USING (
    (requested_by = clerk_user_uuid() OR is_admin())
    AND organization_id = current_org_id()
  );

CREATE POLICY "clerk_evidence_requests_super"
  ON evidence_requests FOR ALL
  USING (is_super_admin());

-- --------------------------------------------------------------------------
-- evidence_submissions: via evidence_request org
-- --------------------------------------------------------------------------
CREATE POLICY "clerk_evidence_submissions_select"
  ON evidence_submissions FOR SELECT
  USING (
    evidence_request_id IN (
      SELECT id FROM evidence_requests WHERE organization_id = current_org_id()
    )
    OR is_super_admin()
  );

CREATE POLICY "clerk_evidence_submissions_insert"
  ON evidence_submissions FOR INSERT
  WITH CHECK (
    evidence_request_id IN (
      SELECT id FROM evidence_requests WHERE organization_id = current_org_id()
    )
  );

CREATE POLICY "clerk_evidence_submissions_update"
  ON evidence_submissions FOR UPDATE
  USING (
    is_admin() AND evidence_request_id IN (
      SELECT id FROM evidence_requests WHERE organization_id = current_org_id()
    )
  );

COMMIT;

-- ============================================================================
-- STEP 5: CHECK SEED DATA
-- ============================================================================

-- Run this AFTER the above to see if templates exist:
SELECT 'pci_templates count: ' || COUNT(*) FROM pci_templates;
SELECT 'secondary_control_templates count: ' || COUNT(*) FROM secondary_control_templates;

-- Expected: 16 PCI templates, 160 secondary control templates
-- If counts are 0, you need to run the seed data script:
-- database/migrations/20260203_02_pci_seed_data.sql
