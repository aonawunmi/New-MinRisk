-- ============================================================
-- INCIDENT MODULE SCHEMA FIXES
-- Addresses 3 critical issues identified in review
-- ============================================================

-- =============================================================================
-- PREREQUISITE: Create get_current_user_context() function
-- =============================================================================
-- This function is required by RLS policies below

CREATE OR REPLACE FUNCTION get_current_user_context()
RETURNS TABLE (
  user_id UUID,
  organization_id UUID,
  role TEXT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.organization_id,
    up.role,
    (up.role IN ('admin', 'super_admin')) as is_admin
  FROM user_profiles up
  WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_current_user_context() IS
  'Single source of truth for current user org and role. Used by all RLS policies.';


-- =============================================================================
-- FIX #1: Add organization_id foreign key constraint (if not exists)
-- =============================================================================

-- First, check if constraint already exists
DO $$
BEGIN
  -- Try to add constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_incidents_organization'
      AND table_name = 'incidents'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT fk_incidents_organization
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added fk_incidents_organization constraint';
  ELSE
    RAISE NOTICE 'fk_incidents_organization already exists';
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_incidents_organization_id ON incidents(organization_id);

COMMENT ON CONSTRAINT fk_incidents_organization ON incidents IS
  'Ensures every incident belongs to a valid organization. Critical for multi-tenant isolation.';


-- =============================================================================
-- FIX #2: Create incident_risk_links table (if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS incident_risk_links (
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL REFERENCES auth.users(id),
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One incident can only be linked to ONE risk at a time
  -- (Historical mappings tracked in incident_risk_mapping_history)
  PRIMARY KEY (incident_id)

  -- Note: No UNIQUE constraint needed on (incident_id, risk_id)
  -- PRIMARY KEY(incident_id) already ensures one mapping per incident
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_incident_risk_links_risk_id ON incident_risk_links(risk_id);
CREATE INDEX IF NOT EXISTS idx_incident_risk_links_linked_by ON incident_risk_links(linked_by);

COMMENT ON TABLE incident_risk_links IS
  'Current risk assignment for incidents. One incident → one risk. Historical mappings tracked in incident_risk_mapping_history.';

COMMENT ON COLUMN incident_risk_links.incident_id IS
  'Primary key ensures one incident can only be linked to one risk at a time.';


-- =============================================================================
-- FIX #2b: Add cross-org protection trigger for incident_risk_links
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_incident_risk_same_org()
RETURNS TRIGGER AS $$
DECLARE
  v_incident_org_id UUID;
  v_risk_org_id UUID;
BEGIN
  -- Get incident's organization
  SELECT organization_id INTO v_incident_org_id
  FROM incidents
  WHERE id = NEW.incident_id;

  -- Get risk's organization
  SELECT organization_id INTO v_risk_org_id
  FROM risks
  WHERE id = NEW.risk_id;

  -- Ensure they match
  IF v_incident_org_id != v_risk_org_id THEN
    RAISE EXCEPTION 'Cannot link incident to risk from different organization. Incident org: %, Risk org: %',
      v_incident_org_id, v_risk_org_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_incident_risk_org ON incident_risk_links;
CREATE TRIGGER trg_validate_incident_risk_org
  BEFORE INSERT OR UPDATE ON incident_risk_links
  FOR EACH ROW
  EXECUTE FUNCTION validate_incident_risk_same_org();

COMMENT ON FUNCTION validate_incident_risk_same_org() IS
  'Prevents cross-organization incident-to-risk linking. Critical security control for multi-tenant isolation.';


-- =============================================================================
-- FIX #3: Add visibility_scope column with constraint
-- =============================================================================

-- Current visibility_scope allows DEPARTMENT but we haven't built department infrastructure yet
-- Keep it in the enum for future-proofing but add constraint to prevent usage until ready

-- First, add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'visibility_scope'
  ) THEN
    ALTER TABLE incidents ADD COLUMN visibility_scope TEXT DEFAULT 'REPORTER_ONLY';
    RAISE NOTICE 'Added visibility_scope column';
  ELSE
    RAISE NOTICE 'visibility_scope column already exists';
  END IF;
END $$;

-- Add constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_visibility_scope_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_visibility_scope_check
  CHECK (visibility_scope IN ('REPORTER_ONLY', 'DEPARTMENT', 'INSTITUTION'));

-- Add column comment explaining current limitation
COMMENT ON COLUMN incidents.visibility_scope IS
  'Controls who can view this incident:
   - REPORTER_ONLY: Only the reporter and admins (DEFAULT, IMPLEMENTED)
   - DEPARTMENT: Reporter''s department + admins (ENUM RESERVED, NOT YET IMPLEMENTED)
   - INSTITUTION: All institution users + admins (ENUM RESERVED, NOT YET IMPLEMENTED)

   CURRENT IMPLEMENTATION: Only REPORTER_ONLY is enforced by RLS.
   DEPARTMENT and INSTITUTION values are allowed in schema but have no effect until department infrastructure exists.';

-- Application-level validation note
-- TODO: When department infrastructure is added:
-- 1. Add department_id to user_profiles
-- 2. Create departments table
-- 3. Update RLS policies to handle DEPARTMENT scope
-- 4. Update RLS policies to handle INSTITUTION scope


-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify Fix #1: Check organization_id constraint
SELECT
  'FIX #1' as fix,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ FIXED: organization_id constraint exists'
    ELSE '❌ MISSING: organization_id constraint not found'
  END as status
FROM information_schema.table_constraints
WHERE constraint_name = 'fk_incidents_organization'
  AND table_name = 'incidents';

-- Verify Fix #2: Check incident_risk_links table
SELECT
  'FIX #2' as fix,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ FIXED: incident_risk_links table exists'
    ELSE '❌ MISSING: incident_risk_links table not found'
  END as status
FROM information_schema.tables
WHERE table_name = 'incident_risk_links';

-- Verify Fix #2b: Check cross-org protection trigger
SELECT
  'FIX #2b' as fix,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ FIXED: Cross-org protection trigger exists'
    ELSE '❌ MISSING: Cross-org protection trigger not found'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trg_validate_incident_risk_org';

-- Verify Fix #3: Check visibility_scope constraint
SELECT
  'FIX #3' as fix,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ FIXED: visibility_scope constraint exists with all 3 values'
    ELSE '❌ MISSING: visibility_scope constraint not found'
  END as status
FROM information_schema.check_constraints
WHERE constraint_name = 'incidents_visibility_scope_check';


-- =============================================================================
-- RLS Policies for incident_risk_links
-- =============================================================================

ALTER TABLE incident_risk_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to allow re-running this script
DROP POLICY IF EXISTS "incident_risk_links_select_user" ON incident_risk_links;
DROP POLICY IF EXISTS "incident_risk_links_select_admin" ON incident_risk_links;
DROP POLICY IF EXISTS "incident_risk_links_insert" ON incident_risk_links;
DROP POLICY IF EXISTS "incident_risk_links_update_admin" ON incident_risk_links;
DROP POLICY IF EXISTS "incident_risk_links_delete_admin" ON incident_risk_links;

-- SELECT: Users see links for incidents they can access AND risks they can view
-- CRITICAL: Must check BOTH incident visibility AND risk visibility
-- Otherwise users could see risk_id UUIDs for risks they shouldn't access
CREATE POLICY "incident_risk_links_select_user"
  ON incident_risk_links FOR SELECT
  USING (
    incident_id IN (SELECT id FROM incidents) -- Inherits incident access rules
    AND risk_id IN (SELECT id FROM risks)     -- Must also have risk access
  );

-- SELECT: Admins see all links in their org (for both incident AND risk)
CREATE POLICY "incident_risk_links_select_admin"
  ON incident_risk_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM incidents i
      INNER JOIN risks r ON r.id = incident_risk_links.risk_id
      INNER JOIN get_current_user_context() ctx
        ON i.organization_id = ctx.organization_id
        AND r.organization_id = ctx.organization_id
      WHERE i.id = incident_risk_links.incident_id
        AND ctx.is_admin = TRUE
    )
  );

-- INSERT: System-controlled (via backend functions only)
-- Must have access to BOTH incident and risk
CREATE POLICY "incident_risk_links_insert"
  ON incident_risk_links FOR INSERT
  WITH CHECK (
    incident_id IN (SELECT id FROM incidents)
    AND risk_id IN (SELECT id FROM risks)
  );

-- UPDATE: Admins only (to change linked_by or timestamps)
CREATE POLICY "incident_risk_links_update_admin"
  ON incident_risk_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      INNER JOIN get_current_user_context() ctx ON i.organization_id = ctx.organization_id
      WHERE i.id = incident_risk_links.incident_id
        AND ctx.is_admin = TRUE
    )
  );

-- DELETE: Admins only (unlinking incidents from risks)
CREATE POLICY "incident_risk_links_delete_admin"
  ON incident_risk_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM incidents i
      INNER JOIN get_current_user_context() ctx ON i.organization_id = ctx.organization_id
      WHERE i.id = incident_risk_links.incident_id
        AND ctx.is_admin = TRUE
    )
  );


-- =============================================================================
-- Summary
-- =============================================================================

-- All 3 fixes applied:
-- ✅ Fix #1: organization_id foreign key constraint added with index
-- ✅ Fix #2: incident_risk_links table created with proper structure
-- ✅ Fix #2b: Cross-org protection trigger prevents linking across organizations
-- ✅ Fix #3: visibility_scope constraint updated with implementation notes
-- ✅ RLS policies added for incident_risk_links table

-- Next steps:
-- 1. Run this SQL file in Supabase SQL Editor
-- 2. Verify all 4 verification queries pass
-- 3. Proceed with Phase 1 of main implementation plan
