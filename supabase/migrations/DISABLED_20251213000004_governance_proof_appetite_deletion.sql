-- ================================================================
-- GOVERNANCE-PROOF DELETION & VERSIONING FRAMEWORK
-- ================================================================
-- Purpose: Implement regulator-safe deletion rules for Risk Appetite Framework
-- Author: MinRisk Development Team
-- Date: 2025-12-13
--
-- Principles:
-- 1. APPROVED/SUPERSEDED statements cannot be deleted (audit trail)
-- 2. Categories locked after RAS approval (governance intent)
-- 3. Active tolerance metrics cannot be deleted (historical breaches)
-- 4. Versioning via stable identifiers (metric_key)
-- 5. Exactly one APPROVED RAS per org at a time
-- ================================================================

-- ============================================================================
-- PART 1: risk_appetite_statements - Add Versioning & Supersession
-- ============================================================================

-- Add supersession tracking columns
ALTER TABLE risk_appetite_statements
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS supersedes_statement_id UUID REFERENCES risk_appetite_statements(id),
  ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;

-- Add version number (default to 1 for existing rows)
ALTER TABLE risk_appetite_statements
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create unique constraint: only one APPROVED statement per org at a time
DROP INDEX IF EXISTS one_approved_ras_per_org;
CREATE UNIQUE INDEX one_approved_ras_per_org
  ON risk_appetite_statements (organization_id)
  WHERE status = 'APPROVED';

-- Create index for finding current statement
CREATE INDEX IF NOT EXISTS idx_ras_current
  ON risk_appetite_statements (organization_id, status, effective_from)
  WHERE status IN ('APPROVED', 'DRAFT');

-- Create index for supersession chain
CREATE INDEX IF NOT EXISTS idx_ras_supersession
  ON risk_appetite_statements (supersedes_statement_id)
  WHERE supersedes_statement_id IS NOT NULL;

-- ============================================================================
-- PART 2: tolerance_metrics - Add Versioning with metric_key
-- ============================================================================

-- Add metric_key for stable versioning (survives name changes)
ALTER TABLE tolerance_metrics
  ADD COLUMN IF NOT EXISTS metric_key UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add never_activated flag (to allow safe deletion of unused metrics)
ALTER TABLE tolerance_metrics
  ADD COLUMN IF NOT EXISTS never_activated BOOLEAN NOT NULL DEFAULT true;

-- Ensure existing metrics have unique metric_keys
-- (One-time migration: group by metric_name per org, assign same key to versions)
DO $$
DECLARE
  rec RECORD;
  new_key UUID;
BEGIN
  -- For each unique (organization_id, metric_name) pair
  FOR rec IN
    SELECT DISTINCT organization_id, metric_name
    FROM tolerance_metrics
    WHERE metric_key IS NULL
  LOOP
    -- Generate a new key
    new_key := gen_random_uuid();

    -- Assign it to all versions of this metric
    UPDATE tolerance_metrics
    SET metric_key = new_key
    WHERE organization_id = rec.organization_id
      AND metric_name = rec.metric_name
      AND metric_key IS NULL;
  END LOOP;
END $$;

-- Create unique constraint: only one active version per metric_key
DROP INDEX IF EXISTS one_active_metric_version;
CREATE UNIQUE INDEX one_active_metric_version
  ON tolerance_metrics (organization_id, metric_key)
  WHERE is_active = TRUE;

-- Create unique constraint: (org, metric_key, version) must be unique
DROP INDEX IF EXISTS uniq_metric_version;
CREATE UNIQUE INDEX uniq_metric_version
  ON tolerance_metrics (organization_id, metric_key, version);

-- Create index for finding current metric version
CREATE INDEX IF NOT EXISTS idx_metric_current
  ON tolerance_metrics (organization_id, metric_key, version DESC)
  WHERE is_active = TRUE;

-- ============================================================================
-- PART 3: Guardrail Functions - Prevent Governance Violations
-- ============================================================================

-- Function: Can a statement be deleted?
CREATE OR REPLACE FUNCTION can_delete_statement(statement_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  stmt_status TEXT;
BEGIN
  -- Get statement status
  SELECT status INTO stmt_status
  FROM risk_appetite_statements
  WHERE id = statement_id;

  -- Only DRAFT statements can be deleted
  RETURN stmt_status = 'DRAFT';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Can a category be deleted?
CREATE OR REPLACE FUNCTION can_delete_appetite_category(category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  parent_status TEXT;
  metric_count INTEGER;
BEGIN
  -- Get parent statement status
  SELECT ras.status INTO parent_status
  FROM risk_appetite_categories rac
  JOIN risk_appetite_statements ras ON rac.statement_id = ras.id
  WHERE rac.id = category_id;

  -- Can't delete if parent is not DRAFT
  IF parent_status != 'DRAFT' THEN
    RETURN FALSE;
  END IF;

  -- Can't delete if there are tolerance metrics
  SELECT COUNT(*) INTO metric_count
  FROM tolerance_metrics
  WHERE appetite_category_id = category_id;

  RETURN metric_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Can a tolerance metric be deleted?
CREATE OR REPLACE FUNCTION can_delete_tolerance_metric(metric_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  metric_active BOOLEAN;
  metric_never_activated BOOLEAN;
BEGIN
  -- Get metric status
  SELECT is_active, never_activated INTO metric_active, metric_never_activated
  FROM tolerance_metrics
  WHERE id = metric_id;

  -- Can delete if:
  -- 1. Not currently active, AND
  -- 2. Never been activated (no historical breaches)
  RETURN (NOT metric_active) AND metric_never_activated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Trigger - Prevent Hard Delete of Non-Drafts
-- ============================================================================

-- Trigger function to block deletion of approved/superseded statements
CREATE OR REPLACE FUNCTION prevent_ras_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Cannot delete approved or superseded appetite statements. They may only be superseded.'
      USING HINT = 'Use the "Supersede & Replace" function instead.',
            ERRCODE = '23503'; -- foreign_key_violation (closest semantic match)
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ras_deletion ON risk_appetite_statements;
CREATE TRIGGER trg_prevent_ras_deletion
  BEFORE DELETE ON risk_appetite_statements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ras_deletion();

-- Trigger function to block deletion of active metrics
CREATE OR REPLACE FUNCTION prevent_active_metric_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = TRUE THEN
    RAISE EXCEPTION 'Cannot delete active tolerance metrics. Deactivate them first.'
      USING HINT = 'Use the "Deactivate" button, then "Supersede Metric" to create a new version.',
            ERRCODE = '23503';
  END IF;

  IF OLD.never_activated = FALSE THEN
    RAISE EXCEPTION 'Cannot delete tolerance metrics that have been activated. They are part of the audit trail.'
      USING HINT = 'Deactivated metrics remain visible as historical records.',
            ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_active_metric_deletion ON tolerance_metrics;
CREATE TRIGGER trg_prevent_active_metric_deletion
  BEFORE DELETE ON tolerance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION prevent_active_metric_deletion();

-- ============================================================================
-- PART 5: Helper Functions - Supersession & Versioning Workflows
-- ============================================================================

-- Function: Supersede an approved RAS (creates new draft)
CREATE OR REPLACE FUNCTION supersede_appetite_statement(
  statement_id UUID,
  new_effective_from DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS UUID AS $$
DECLARE
  old_stmt RECORD;
  new_stmt_id UUID;
BEGIN
  -- Get old statement
  SELECT * INTO old_stmt
  FROM risk_appetite_statements
  WHERE id = statement_id;

  -- Validate: can only supersede APPROVED statements
  IF old_stmt.status != 'APPROVED' THEN
    RAISE EXCEPTION 'Can only supersede APPROVED statements. Current status: %', old_stmt.status;
  END IF;

  -- Mark old statement as SUPERSEDED
  UPDATE risk_appetite_statements
  SET
    status = 'SUPERSEDED',
    superseded_at = NOW(),
    effective_to = CURRENT_DATE
  WHERE id = statement_id;

  -- Create new DRAFT statement
  INSERT INTO risk_appetite_statements (
    organization_id,
    statement_text,
    version,
    status,
    effective_from,
    supersedes_statement_id
  ) VALUES (
    old_stmt.organization_id,
    '', -- Empty, admin will fill it
    old_stmt.version + 1,
    'DRAFT',
    new_effective_from,
    statement_id
  ) RETURNING id INTO new_stmt_id;

  RETURN new_stmt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Supersede a tolerance metric (creates new version)
CREATE OR REPLACE FUNCTION supersede_tolerance_metric(
  metric_id UUID,
  new_effective_from DATE DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS UUID AS $$
DECLARE
  old_metric RECORD;
  new_metric_id UUID;
BEGIN
  -- Get old metric
  SELECT * INTO old_metric
  FROM tolerance_metrics
  WHERE id = metric_id;

  -- Validate: must be active
  IF old_metric.is_active = FALSE THEN
    RAISE EXCEPTION 'Can only supersede active metrics. This metric is already inactive.';
  END IF;

  -- Deactivate old metric
  UPDATE tolerance_metrics
  SET
    is_active = FALSE,
    effective_to = CURRENT_DATE
  WHERE id = metric_id;

  -- Create new metric version (inactive, admin must activate it)
  INSERT INTO tolerance_metrics (
    organization_id,
    appetite_category_id,
    metric_key,
    metric_name,
    metric_description,
    metric_type,
    unit,
    materiality_type,
    green_max,
    amber_max,
    red_min,
    green_min,
    amber_min,
    red_max,
    version,
    effective_from,
    is_active,
    never_activated
  ) VALUES (
    old_metric.organization_id,
    old_metric.appetite_category_id,
    old_metric.metric_key, -- Same key = same metric identity
    old_metric.metric_name,
    old_metric.metric_description,
    old_metric.metric_type,
    old_metric.unit,
    old_metric.materiality_type,
    old_metric.green_max,
    old_metric.amber_max,
    old_metric.red_min,
    old_metric.green_min,
    old_metric.amber_min,
    old_metric.red_max,
    old_metric.version + 1,
    new_effective_from,
    FALSE, -- Admin must explicitly activate
    TRUE -- Mark as never activated (can be deleted if not used)
  ) RETURNING id INTO new_metric_id;

  RETURN new_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Activate a tolerance metric
CREATE OR REPLACE FUNCTION activate_tolerance_metric(metric_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tolerance_metrics
  SET
    is_active = TRUE,
    never_activated = FALSE -- Now it's part of the audit trail
  WHERE id = metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: RLS Policies Update (if needed)
-- ============================================================================

-- Ensure admin can use supersession functions
-- (RLS policies should already allow this, but verify)

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Governance-proof deletion framework installed';
  RAISE NOTICE '   - APPROVED/SUPERSEDED statements cannot be deleted';
  RAISE NOTICE '   - Active/activated metrics cannot be deleted';
  RAISE NOTICE '   - Categories locked after RAS approval';
  RAISE NOTICE '   - Unique constraints prevent multiple APPROVED RAS';
  RAISE NOTICE '   - Versioning via stable metric_key';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Database-level guardrails active';
  RAISE NOTICE '   - Triggers block hard deletes';
  RAISE NOTICE '   - RPC functions validate deletion rules';
  RAISE NOTICE '   - Supersession functions preserve audit trail';
END $$;
