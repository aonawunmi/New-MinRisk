-- ============================================================================
-- MinRisk v2 - Phase 4 Migration
-- Controls, Period Tracking, and Priority Management
-- ============================================================================
-- This migration adds:
-- 1. Controls table with DIME framework
-- 2. Period field to risks
-- 3. Priority field to risks
-- 4. Residual risk calculation support
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD NEW FIELDS TO RISKS TABLE
-- ============================================================================

-- Add period field for time tracking (Q1 2025, FY2025, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'period'
    ) THEN
        ALTER TABLE risks ADD COLUMN period text;
        COMMENT ON COLUMN risks.period IS 'Time period for risk (Q1 2025, FY2025, etc.)';
    END IF;
END $$;

-- Add priority flag for focused risk tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'is_priority'
    ) THEN
        ALTER TABLE risks ADD COLUMN is_priority boolean DEFAULT false;
        COMMENT ON COLUMN risks.is_priority IS 'Flag for priority risks shown in heatmap/control register';
    END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE CONTROLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS controls (
  -- Primary identification
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy and relationships
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_id               uuid NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  owner_profile_id      uuid REFERENCES user_profiles(id),

  -- Control details
  name                  text NOT NULL,
  description           text,
  control_type          text CHECK (control_type IN ('preventive', 'detective', 'corrective', NULL)),

  -- Target: which dimension does this control reduce?
  target                text CHECK (target IN ('likelihood', 'impact')) NOT NULL,

  -- DIME Framework scores (0-3 scale as per original implementation)
  design_score          int CHECK (design_score BETWEEN 0 AND 3),
  implementation_score  int CHECK (implementation_score BETWEEN 0 AND 3),
  monitoring_score      int CHECK (monitoring_score BETWEEN 0 AND 3),
  evaluation_score      int CHECK (evaluation_score BETWEEN 0 AND 3),

  -- Audit fields
  created_by_profile_id uuid REFERENCES user_profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

-- Add table comment
COMMENT ON TABLE controls IS 'Risk control measures with DIME framework scoring';

-- Add column comments
COMMENT ON COLUMN controls.target IS 'Which risk dimension this control reduces: likelihood or impact';
COMMENT ON COLUMN controls.design_score IS 'DIME: How well the control is designed (0-3)';
COMMENT ON COLUMN controls.implementation_score IS 'DIME: How well implemented (0-3)';
COMMENT ON COLUMN controls.monitoring_score IS 'DIME: How well monitored (0-3)';
COMMENT ON COLUMN controls.evaluation_score IS 'DIME: Overall effectiveness evaluation (0-3)';

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_controls_org ON controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_controls_risk ON controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_controls_owner ON controls(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_controls_deleted ON controls(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risks_period ON risks(period);
CREATE INDEX IF NOT EXISTS idx_risks_priority ON risks(is_priority) WHERE is_priority = true;

-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY ON CONTROLS
-- ============================================================================

ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "org_users_select_controls" ON controls;
DROP POLICY IF EXISTS "org_users_insert_controls" ON controls;
DROP POLICY IF EXISTS "org_users_update_own_controls" ON controls;
DROP POLICY IF EXISTS "org_users_delete_own_controls" ON controls;
DROP POLICY IF EXISTS "admins_all_controls" ON controls;

-- Policy 1: All org users can view controls in their organization
CREATE POLICY "org_users_select_controls"
ON controls FOR SELECT
USING (organization_id = current_org_id());

-- Policy 2: Users can insert controls for risks in their organization
CREATE POLICY "org_users_insert_controls"
ON controls FOR INSERT
WITH CHECK (
  organization_id = current_org_id()
  AND EXISTS (
    SELECT 1 FROM risks
    WHERE risks.id = controls.risk_id
    AND risks.organization_id = current_org_id()
  )
);

-- Policy 3: Users can update controls they created or own
CREATE POLICY "org_users_update_own_controls"
ON controls FOR UPDATE
USING (
  organization_id = current_org_id()
  AND (
    created_by_profile_id = current_profile_id()
    OR owner_profile_id = current_profile_id()
  )
)
WITH CHECK (
  organization_id = current_org_id()
  AND (
    created_by_profile_id = current_profile_id()
    OR owner_profile_id = current_profile_id()
  )
);

-- Policy 4: Users can delete controls they created or own
CREATE POLICY "org_users_delete_own_controls"
ON controls FOR DELETE
USING (
  organization_id = current_org_id()
  AND (
    created_by_profile_id = current_profile_id()
    OR owner_profile_id = current_profile_id()
  )
);

-- Policy 5: Admins have full access to all org controls
CREATE POLICY "admins_all_controls"
ON controls FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id() AND is_admin());

-- ============================================================================
-- PART 5: CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create or replace the update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to controls table
DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
CREATE TRIGGER update_controls_updated_at
BEFORE UPDATE ON controls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 6: CREATE HELPER FUNCTION FOR RESIDUAL RISK CALCULATION
-- ============================================================================

-- Function to calculate average DIME score for a control
CREATE OR REPLACE FUNCTION calculate_control_effectiveness(
  p_design int,
  p_implementation int,
  p_monitoring int,
  p_evaluation int
)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(
    (p_design + p_implementation + p_monitoring + p_evaluation) / 4.0,
    0
  );
$$;

COMMENT ON FUNCTION calculate_control_effectiveness IS
'Calculates average DIME score for control effectiveness';

-- Function to calculate residual risk for a specific risk
-- Based on USER-MANUAL.md formula:
--   If control targets Likelihood: Residual L = Inherent L - (Avg DIME / 2)
--   If control targets Impact: Residual I = Inherent I - (Avg DIME / 2)
CREATE OR REPLACE FUNCTION calculate_residual_risk(risk_id uuid)
RETURNS TABLE (
  residual_likelihood numeric,
  residual_impact numeric,
  residual_score numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_inherent_l int;
  v_inherent_i int;
  v_residual_l numeric;
  v_residual_i numeric;
  v_control RECORD;
  v_control_effect numeric;
BEGIN
  -- Get inherent scores
  SELECT likelihood_inherent, impact_inherent
  INTO v_inherent_l, v_inherent_i
  FROM risks WHERE id = risk_id;

  -- Start with inherent values
  v_residual_l := v_inherent_l;
  v_residual_i := v_inherent_i;

  -- Apply each control's effect
  FOR v_control IN
    SELECT
      target,
      design_score,
      implementation_score,
      monitoring_score,
      evaluation_score
    FROM controls
    WHERE controls.risk_id = calculate_residual_risk.risk_id
      AND deleted_at IS NULL
      AND design_score IS NOT NULL
      AND implementation_score IS NOT NULL
      AND monitoring_score IS NOT NULL
      AND evaluation_score IS NOT NULL
  LOOP
    -- Calculate control effectiveness (average DIME)
    v_control_effect := calculate_control_effectiveness(
      v_control.design_score,
      v_control.implementation_score,
      v_control.monitoring_score,
      v_control.evaluation_score
    );

    -- Apply control based on target
    IF v_control.target = 'likelihood' THEN
      v_residual_l := GREATEST(1, v_residual_l - (v_control_effect / 2.0));
    ELSIF v_control.target = 'impact' THEN
      v_residual_i := GREATEST(1, v_residual_i - (v_control_effect / 2.0));
    END IF;
  END LOOP;

  -- Return residual values
  RETURN QUERY SELECT
    v_residual_l,
    v_residual_i,
    v_residual_l * v_residual_i;
END;
$$;

COMMENT ON FUNCTION calculate_residual_risk IS
'Calculates residual risk scores after applying control effectiveness';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify controls table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'controls') THEN
    RAISE NOTICE '✓ Controls table created successfully';
  ELSE
    RAISE EXCEPTION '✗ Controls table creation failed';
  END IF;
END $$;

-- Verify risks table has new fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'period') THEN
    RAISE NOTICE '✓ Period field added to risks table';
  ELSE
    RAISE EXCEPTION '✗ Period field not added to risks table';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_priority') THEN
    RAISE NOTICE '✓ is_priority field added to risks table';
  ELSE
    RAISE EXCEPTION '✗ is_priority field not added to risks table';
  END IF;
END $$;

-- Verify RLS policies
DO $$
DECLARE
  v_policy_count int;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'controls';

  IF v_policy_count >= 5 THEN
    RAISE NOTICE '✓ RLS policies created for controls (% policies)', v_policy_count;
  ELSE
    RAISE WARNING '⚠ Expected at least 5 RLS policies, found %', v_policy_count;
  END IF;
END $$;

-- Verify functions exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_control_effectiveness') THEN
    RAISE NOTICE '✓ calculate_control_effectiveness function created';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_residual_risk') THEN
    RAISE NOTICE '✓ calculate_residual_risk function created';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Phase 4 database migration completed successfully!
--
-- Next steps:
-- 1. Create src/types/control.ts TypeScript types
-- 2. Build src/lib/controls.ts CRUD operations
-- 3. Update RiskForm component to include controls
-- 4. Update RiskRegister to show residual scores
-- 5. Add period and priority UI elements
-- ============================================================================
