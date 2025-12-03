-- ============================================================
-- INCIDENT MODULE - PHASE 1: DATABASE SCHEMA MIGRATION
-- ============================================================
-- This migration transforms the incidents table and creates
-- supporting tables for the new incident management system.
--
-- Duration: ~45-60 minutes
-- Status: Ready to execute
-- ============================================================

-- =============================================================================
-- STEP 1: Check Current State
-- =============================================================================

DO $$
DECLARE
  v_incident_count INTEGER;
  v_has_severity_column BOOLEAN;
  v_severity_type TEXT;
BEGIN
  -- Check incident count
  SELECT COUNT(*) INTO v_incident_count FROM incidents;
  RAISE NOTICE 'Current incident count: %', v_incident_count;

  -- Check severity column type
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'severity'
  ) INTO v_has_severity_column;

  IF v_has_severity_column THEN
    SELECT data_type INTO v_severity_type
    FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'severity';
    RAISE NOTICE 'Severity column type: %', v_severity_type;
  ELSE
    RAISE NOTICE 'Severity column does not exist';
  END IF;
END $$;


-- =============================================================================
-- STEP 2: Severity Migration (INTEGER → TEXT)
-- =============================================================================

-- Step 2.1: Add temporary column
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS severity_text TEXT;

-- Step 2.2: Migrate data with explicit mapping
-- 1-2 → LOW, 3 → MEDIUM, 4 → HIGH, 5 → CRITICAL
-- Also handle if severity is already TEXT (from previous partial run)
UPDATE incidents SET severity_text = CASE
  -- If already text, keep it
  WHEN severity::text IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') THEN severity::text
  -- If numeric, convert
  WHEN severity = 1 THEN 'LOW'
  WHEN severity = 2 THEN 'LOW'
  WHEN severity = 3 THEN 'MEDIUM'
  WHEN severity = 4 THEN 'HIGH'
  WHEN severity = 5 THEN 'CRITICAL'
  ELSE 'MEDIUM' -- default for any unexpected values
END
WHERE severity_text IS NULL;

-- Step 2.3: Drop old column and rename
ALTER TABLE incidents DROP COLUMN IF EXISTS severity CASCADE;
ALTER TABLE incidents RENAME COLUMN severity_text TO severity;

-- Step 2.4: Add constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- Step 2.5: Set NOT NULL
ALTER TABLE incidents ALTER COLUMN severity SET NOT NULL;
ALTER TABLE incidents ALTER COLUMN severity SET DEFAULT 'MEDIUM';

COMMENT ON COLUMN incidents.severity IS
  'Text-based severity: LOW, MEDIUM, HIGH, CRITICAL. More semantically meaningful than numeric scale.';


-- =============================================================================
-- STEP 3: Status Migration
-- =============================================================================

-- Step 3.1: Drop existing constraint first
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;

-- Step 3.2: Update existing values to new model
UPDATE incidents SET status = CASE
  WHEN LOWER(status) IN ('reported', 'open') THEN 'OPEN'
  WHEN LOWER(status) LIKE '%invest%' OR LOWER(status) LIKE '%review%' THEN 'UNDER_REVIEW'
  WHEN LOWER(status) LIKE '%resolv%' THEN 'RESOLVED'
  WHEN LOWER(status) LIKE '%clos%' THEN 'CLOSED'
  ELSE 'OPEN'
END WHERE status NOT IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');

-- Step 3.3: Add constraint back
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED'));

-- Step 3.3: Set default
ALTER TABLE incidents ALTER COLUMN status SET DEFAULT 'OPEN';

COMMENT ON COLUMN incidents.status IS
  'Incident status workflow: OPEN → UNDER_REVIEW → RESOLVED → CLOSED. REJECTED for invalid submissions.';


-- =============================================================================
-- STEP 4: Rename incident_date → occurred_at
-- =============================================================================
-- Must handle existing database objects that reference incident_date:
-- 1. sync_incident_count_to_risk() function
-- 2. incidents_with_risk_details view

-- Step 4.1: Drop trigger that uses sync_incident_count_to_risk
DROP TRIGGER IF EXISTS trg_sync_incident_count ON incidents;

-- Step 4.2: Drop view that references incident_date
DROP VIEW IF EXISTS incidents_with_risk_details CASCADE;

-- Step 4.3: Rename the column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'incident_date'
  ) THEN
    ALTER TABLE incidents RENAME COLUMN incident_date TO occurred_at;
    RAISE NOTICE 'Renamed incident_date to occurred_at';
  ELSE
    RAISE NOTICE 'incident_date column does not exist (already renamed or never existed)';
  END IF;
END $$;

COMMENT ON COLUMN incidents.occurred_at IS
  'Timestamp when the incident actually occurred (reality timestamp). Distinct from reported_at (metadata timestamp).';

-- Step 4.4: Recreate sync_incident_count_to_risk function with occurred_at
CREATE OR REPLACE FUNCTION sync_incident_count_to_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_risk_code TEXT;
BEGIN
  -- Handle INSERT/UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Update counts for all linked risks
    IF NEW.linked_risk_codes IS NOT NULL THEN
      FOREACH v_risk_code IN ARRAY NEW.linked_risk_codes
      LOOP
        UPDATE risks SET
          linked_incident_count = (
            SELECT COUNT(*)
            FROM incidents
            WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
              AND organization_id = NEW.organization_id
          ),
          last_incident_date = (
            SELECT MAX(occurred_at)  -- UPDATED: was incident_date
            FROM incidents
            WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
              AND organization_id = NEW.organization_id
          )
        WHERE risks.risk_code = v_risk_code
          AND risks.organization_id = NEW.organization_id;
      END LOOP;
    END IF;
  END IF;

  -- Handle DELETE or UPDATE (old values)
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF OLD.linked_risk_codes IS NOT NULL THEN
      FOREACH v_risk_code IN ARRAY OLD.linked_risk_codes
      LOOP
        UPDATE risks SET
          linked_incident_count = (
            SELECT COUNT(*)
            FROM incidents
            WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
              AND organization_id = OLD.organization_id
          ),
          last_incident_date = (
            SELECT MAX(occurred_at)  -- UPDATED: was incident_date
            FROM incidents
            WHERE linked_risk_codes @> ARRAY[v_risk_code]::TEXT[]
              AND organization_id = OLD.organization_id
          )
        WHERE risks.risk_code = v_risk_code
          AND risks.organization_id = OLD.organization_id;
      END LOOP;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4.5: Recreate trigger
CREATE TRIGGER trg_sync_incident_count
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION sync_incident_count_to_risk();

-- Step 4.6: Note about incidents_with_risk_details view
-- The view has been dropped. If you need it, recreate manually with correct column names.
-- Original view referenced incident_date - update to occurred_at when recreating.
--
-- Example recreation (adjust column names to match your risks table):
-- CREATE OR REPLACE VIEW incidents_with_risk_details AS
-- SELECT i.*, r.risk_code, r.risk_title, ...
-- FROM incidents i
-- LEFT JOIN ... WHERE i.linked_risk_codes @> ARRAY[r.risk_code]::TEXT[];


-- =============================================================================
-- STEP 5: Add New Columns
-- =============================================================================

-- reported_at: When incident was reported to system
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill reported_at with created_at for existing records
UPDATE incidents SET reported_at = created_at WHERE reported_at IS NULL;

ALTER TABLE incidents ALTER COLUMN reported_at SET NOT NULL;

COMMENT ON COLUMN incidents.reported_at IS
  'Timestamp when incident was reported to the system (metadata timestamp). May differ from occurred_at.';


-- attachment_references: JSONB array of file references
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS attachment_references JSONB DEFAULT '[]'::jsonb;

-- Add constraint (drop first if exists)
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_attachment_references_is_array;
ALTER TABLE incidents ADD CONSTRAINT incidents_attachment_references_is_array
  CHECK (jsonb_typeof(attachment_references) = 'array');

COMMENT ON COLUMN incidents.attachment_references IS
  'JSON array of attachment metadata: [{ path: string, filename: string, mime_type: string, size_bytes: number, uploaded_at: ISO timestamp }]';


-- original_description: Immutable original incident text
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS original_description TEXT;

-- Backfill with current description
UPDATE incidents SET original_description = description WHERE original_description IS NULL;

ALTER TABLE incidents ALTER COLUMN original_description SET NOT NULL;

COMMENT ON COLUMN incidents.original_description IS
  'Immutable original incident description. Cannot be edited after creation. Used for audit trail and regulatory compliance.';


-- is_description_amended: Flag for amendment tracking
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_description_amended BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incidents.is_description_amended IS
  'TRUE if description has been edited after initial submission. Original text preserved in original_description.';


-- resolved_at: When incident was marked resolved
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN incidents.resolved_at IS
  'Timestamp when incident status changed to RESOLVED. Used for SLA tracking and metrics.';


-- closed_at: When incident was marked closed
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN incidents.closed_at IS
  'Timestamp when incident status changed to CLOSED (terminal state). Used for lifecycle tracking.';


-- =============================================================================
-- STEP 6: Create incident_amendments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS incident_amendments (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  amended_by UUID NOT NULL REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amendments_incident ON incident_amendments(incident_id);
CREATE INDEX IF NOT EXISTS idx_amendments_org ON incident_amendments(organization_id);
CREATE INDEX IF NOT EXISTS idx_amendments_created ON incident_amendments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_amendments_field ON incident_amendments(field_name);

COMMENT ON TABLE incident_amendments IS
  'Append-only audit log of all changes to incident fields after initial submission. Provides complete change history for regulatory compliance.';

COMMENT ON COLUMN incident_amendments.field_name IS
  'Name of field that was changed (e.g., description, severity, status)';

COMMENT ON COLUMN incident_amendments.old_value IS
  'Previous value before change (as text)';

COMMENT ON COLUMN incident_amendments.new_value IS
  'New value after change (as text)';


-- =============================================================================
-- STEP 7: Create incident_risk_mapping_history Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS incident_risk_mapping_history (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  modified_by UUID NOT NULL REFERENCES auth.users(id),
  old_risk_id UUID REFERENCES risks(id),
  new_risk_id UUID REFERENCES risks(id),
  mapping_source TEXT NOT NULL CHECK (mapping_source IN (
    'USER_MANUAL',
    'ADMIN_MANUAL',
    'AI_SUGGESTION_ACCEPTED',
    'USER_REJECTED_AI',
    'SYSTEM_RULE'
  )),
  reason TEXT,
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mapping_history_incident ON incident_risk_mapping_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_mapping_history_org ON incident_risk_mapping_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_mapping_history_created ON incident_risk_mapping_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mapping_history_source ON incident_risk_mapping_history(mapping_source);

COMMENT ON TABLE incident_risk_mapping_history IS
  'Complete provenance log of incident-to-risk mapping decisions. Tracks USER_MANUAL, ADMIN_MANUAL, AI_SUGGESTION_ACCEPTED, USER_REJECTED_AI, and SYSTEM_RULE actions.';

COMMENT ON COLUMN incident_risk_mapping_history.mapping_source IS
  'Source of mapping change: USER_MANUAL (user created link), ADMIN_MANUAL (admin override), AI_SUGGESTION_ACCEPTED (user accepted AI), USER_REJECTED_AI (user rejected AI), SYSTEM_RULE (automated rule)';

COMMENT ON COLUMN incident_risk_mapping_history.confidence_score IS
  'AI confidence score (0-100) when mapping_source is AI_SUGGESTION_ACCEPTED or USER_REJECTED_AI';


-- =============================================================================
-- STEP 8: Create incident_comments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS incident_comments (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_incident ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON incident_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_org ON incident_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_comments_internal ON incident_comments(is_internal);
CREATE INDEX IF NOT EXISTS idx_comments_created ON incident_comments(created_at DESC);

COMMENT ON TABLE incident_comments IS
  'Comments on incidents. Supports both public (visible to reporter) and internal (admin-only) comments for investigative dialogue.';

COMMENT ON COLUMN incident_comments.is_internal IS
  'If TRUE, only visible to ADMIN/RISK_MANAGER roles. Used for investigative, disciplinary, or regulatory-sensitive dialogue. Regular users cannot see internal comments.';


-- =============================================================================
-- STEP 9: Status Transition Validation Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_incident_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  v_is_admin := (v_user_role IN ('admin', 'super_admin'));

  -- Users cannot change status (beyond initial OPEN)
  IF NOT v_is_admin AND OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'Only administrators can change incident status';
  END IF;

  -- Validate allowed transitions (even for admins)
  IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
    -- OPEN → UNDER_REVIEW, RESOLVED, REJECTED
    IF OLD.status = 'OPEN' AND NEW.status NOT IN ('UNDER_REVIEW', 'RESOLVED', 'REJECTED') THEN
      RAISE EXCEPTION 'Invalid status transition from OPEN to %. Allowed: UNDER_REVIEW, RESOLVED, REJECTED', NEW.status;
    END IF;

    -- UNDER_REVIEW → RESOLVED, REJECTED
    IF OLD.status = 'UNDER_REVIEW' AND NEW.status NOT IN ('RESOLVED', 'REJECTED') THEN
      RAISE EXCEPTION 'Invalid status transition from UNDER_REVIEW to %. Allowed: RESOLVED, REJECTED', NEW.status;
    END IF;

    -- RESOLVED → CLOSED
    IF OLD.status = 'RESOLVED' AND NEW.status != 'CLOSED' THEN
      RAISE EXCEPTION 'Invalid status transition from RESOLVED to %. Allowed: CLOSED', NEW.status;
    END IF;

    -- CLOSED and REJECTED are terminal states
    IF OLD.status IN ('CLOSED', 'REJECTED') THEN
      RAISE EXCEPTION 'Cannot change status from terminal state %', OLD.status;
    END IF;

    -- Auto-set timestamps when status changes
    IF NEW.status = 'RESOLVED' AND OLD.status != 'RESOLVED' THEN
      NEW.resolved_at := NOW();
    END IF;

    IF NEW.status = 'CLOSED' AND OLD.status != 'CLOSED' THEN
      NEW.closed_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_incident_status ON incidents;
CREATE TRIGGER trg_validate_incident_status
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION validate_incident_status_transition();

COMMENT ON FUNCTION validate_incident_status_transition() IS
  'Enforces incident status state machine and access control. Prevents illegal transitions and restricts status changes to admins only. Auto-sets resolved_at and closed_at timestamps.';


-- =============================================================================
-- STEP 10: Update incident_summary View (Drop and Recreate)
-- =============================================================================

DROP VIEW IF EXISTS incident_summary CASCADE;

-- Create view with only columns we know exist
CREATE VIEW incident_summary AS
SELECT
  i.id,
  i.organization_id AS org_id,
  i.incident_code,
  i.title,
  i.description,
  i.original_description,
  i.is_description_amended,
  i.incident_type,
  i.severity,
  i.status,
  i.occurred_at,
  i.reported_at,
  i.reported_by,
  i.reporter_email,
  i.division,
  i.department,
  i.financial_impact,
  i.root_cause,
  i.corrective_actions,
  i.visibility_scope,
  i.attachment_references,
  i.created_at,
  i.updated_at,
  i.resolved_at,
  i.closed_at,
  i.linked_risk_codes,
  -- Linked risk info from new junction table
  irl.risk_id AS linked_risk_id,
  r.risk_code AS linked_risk_code,
  r.risk_title AS linked_risk_title
FROM incidents i
LEFT JOIN incident_risk_links irl ON i.id = irl.incident_id
LEFT JOIN risks r ON irl.risk_id = r.id;

COMMENT ON VIEW incident_summary IS
  'Comprehensive incident view with linked risk data. Used for UI display and reporting.';


-- =============================================================================
-- STEP 11: Enable RLS on New Tables
-- =============================================================================

ALTER TABLE incident_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_risk_mapping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 12: Verification Queries
-- =============================================================================

-- Verify severity migration
SELECT
  'Severity Migration' as check_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASSED: All severities migrated to text'
    ELSE '❌ FAILED: ' || COUNT(*) || ' rows still have invalid severity'
  END as status
FROM incidents
WHERE severity NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Verify status migration
SELECT
  'Status Migration' as check_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASSED: All statuses migrated to new model'
    ELSE '❌ FAILED: ' || COUNT(*) || ' rows have invalid status'
  END as status
FROM incidents
WHERE status NOT IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');

-- Verify occurred_at exists
SELECT
  'occurred_at Column' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASSED: occurred_at column exists'
    ELSE '❌ FAILED: occurred_at column missing'
  END as status
FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name = 'occurred_at';

-- Verify reported_at exists and has data
SELECT
  'reported_at Column' as check_name,
  CASE
    WHEN COUNT(*) > 0 AND COUNT(*) = (SELECT COUNT(*) FROM incidents)
    THEN '✅ PASSED: All incidents have reported_at'
    ELSE '❌ FAILED: Some incidents missing reported_at'
  END as status
FROM incidents
WHERE reported_at IS NOT NULL;

-- Verify new tables created
SELECT
  'New Tables' as check_name,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ PASSED: All 3 new tables exist'
    ELSE '❌ FAILED: Missing tables. Found: ' || COUNT(*) || ' of 3'
  END as status
FROM information_schema.tables
WHERE table_name IN ('incident_amendments', 'incident_risk_mapping_history', 'incident_comments');

-- Verify status transition trigger
SELECT
  'Status Transition Trigger' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASSED: Status validation trigger exists'
    ELSE '❌ FAILED: Status validation trigger missing'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trg_validate_incident_status';

-- Verify incident_summary view
SELECT
  'incident_summary View' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASSED: incident_summary view recreated'
    ELSE '❌ FAILED: incident_summary view missing'
  END as status
FROM information_schema.views
WHERE table_name = 'incident_summary';


-- =============================================================================
-- SUMMARY
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'PHASE 1 MIGRATION COMPLETE';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '✅ Severity migrated: INTEGER → TEXT (LOW/MEDIUM/HIGH/CRITICAL)';
  RAISE NOTICE '✅ Status migrated: New workflow (OPEN/UNDER_REVIEW/RESOLVED/CLOSED/REJECTED)';
  RAISE NOTICE '✅ incident_date renamed to occurred_at';
  RAISE NOTICE '✅ Added columns: reported_at, attachment_references, original_description, is_description_amended';
  RAISE NOTICE '✅ Created table: incident_amendments';
  RAISE NOTICE '✅ Created table: incident_risk_mapping_history';
  RAISE NOTICE '✅ Created table: incident_comments';
  RAISE NOTICE '✅ Status transition validation trigger active';
  RAISE NOTICE '✅ incident_summary view updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Review verification queries above (all should show ✅)';
  RAISE NOTICE '2. Proceed to Phase 2: RLS Policies';
  RAISE NOTICE '';
END $$;
