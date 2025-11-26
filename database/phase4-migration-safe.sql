-- ============================================================================
-- MinRisk v2 - Phase 4 Migration (SAFE VERSION)
-- Handles existing controls table gracefully
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD NEW FIELDS TO RISKS TABLE
-- ============================================================================

-- Add period field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'period'
    ) THEN
        ALTER TABLE risks ADD COLUMN period text;
        RAISE NOTICE '✓ Added period field to risks table';
    ELSE
        RAISE NOTICE '- Period field already exists in risks table';
    END IF;
END $$;

-- Add priority flag
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'is_priority'
    ) THEN
        ALTER TABLE risks ADD COLUMN is_priority boolean DEFAULT false;
        RAISE NOTICE '✓ Added is_priority field to risks table';
    ELSE
        RAISE NOTICE '- is_priority field already exists in risks table';
    END IF;
END $$;

-- ============================================================================
-- PART 2: UPDATE/CREATE CONTROLS TABLE
-- ============================================================================

-- Check if controls table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'controls') THEN
        -- Create fresh controls table
        CREATE TABLE controls (
          id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          risk_id               uuid NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
          owner_profile_id      uuid REFERENCES user_profiles(id),
          name                  text NOT NULL,
          description           text,
          control_type          text CHECK (control_type IN ('preventive', 'detective', 'corrective', NULL)),
          target                text CHECK (target IN ('likelihood', 'impact')) NOT NULL,
          design_score          int CHECK (design_score BETWEEN 0 AND 3),
          implementation_score  int CHECK (implementation_score BETWEEN 0 AND 3),
          monitoring_score      int CHECK (monitoring_score BETWEEN 0 AND 3),
          evaluation_score      int CHECK (evaluation_score BETWEEN 0 AND 3),
          created_by_profile_id uuid REFERENCES user_profiles(id),
          created_at            timestamptz NOT NULL DEFAULT now(),
          updated_at            timestamptz NOT NULL DEFAULT now(),
          deleted_at            timestamptz
        );

        RAISE NOTICE '✓ Created controls table';
    ELSE
        RAISE NOTICE '- Controls table already exists, updating columns...';

        -- Add missing columns one by one
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'target') THEN
            ALTER TABLE controls ADD COLUMN target text CHECK (target IN ('likelihood', 'impact'));
            RAISE NOTICE '  ✓ Added target column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'design_score') THEN
            ALTER TABLE controls ADD COLUMN design_score int CHECK (design_score BETWEEN 0 AND 3);
            RAISE NOTICE '  ✓ Added design_score column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'implementation_score') THEN
            ALTER TABLE controls ADD COLUMN implementation_score int CHECK (implementation_score BETWEEN 0 AND 3);
            RAISE NOTICE '  ✓ Added implementation_score column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'monitoring_score') THEN
            ALTER TABLE controls ADD COLUMN monitoring_score int CHECK (monitoring_score BETWEEN 0 AND 3);
            RAISE NOTICE '  ✓ Added monitoring_score column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'evaluation_score') THEN
            ALTER TABLE controls ADD COLUMN evaluation_score int CHECK (evaluation_score BETWEEN 0 AND 3);
            RAISE NOTICE '  ✓ Added evaluation_score column';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_controls_org ON controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_controls_risk ON controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_controls_owner ON controls(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_controls_deleted ON controls(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risks_period ON risks(period);
CREATE INDEX IF NOT EXISTS idx_risks_priority ON risks(is_priority) WHERE is_priority = true;

-- ============================================================================
-- PART 4: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "org_users_select_controls" ON controls;
DROP POLICY IF EXISTS "org_users_insert_controls" ON controls;
DROP POLICY IF EXISTS "org_users_update_own_controls" ON controls;
DROP POLICY IF EXISTS "org_users_delete_own_controls" ON controls;
DROP POLICY IF EXISTS "admins_all_controls" ON controls;

-- Create policies
CREATE POLICY "org_users_select_controls"
ON controls FOR SELECT
USING (organization_id = current_org_id());

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

CREATE POLICY "org_users_delete_own_controls"
ON controls FOR DELETE
USING (
  organization_id = current_org_id()
  AND (
    created_by_profile_id = current_profile_id()
    OR owner_profile_id = current_profile_id()
  )
);

CREATE POLICY "admins_all_controls"
ON controls FOR ALL
USING (organization_id = current_org_id() AND is_admin())
WITH CHECK (organization_id = current_org_id() AND is_admin());

-- ============================================================================
-- PART 5: CREATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
CREATE TRIGGER update_controls_updated_at
BEFORE UPDATE ON controls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 6: CREATE HELPER FUNCTIONS
-- ============================================================================

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
  SELECT likelihood_inherent, impact_inherent
  INTO v_inherent_l, v_inherent_i
  FROM risks WHERE id = risk_id;

  v_residual_l := v_inherent_l;
  v_residual_i := v_inherent_i;

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
      AND target IS NOT NULL
      AND design_score IS NOT NULL
      AND implementation_score IS NOT NULL
      AND monitoring_score IS NOT NULL
      AND evaluation_score IS NOT NULL
  LOOP
    v_control_effect := calculate_control_effectiveness(
      v_control.design_score,
      v_control.implementation_score,
      v_control.monitoring_score,
      v_control.evaluation_score
    );

    IF v_control.target = 'likelihood' THEN
      v_residual_l := GREATEST(1, v_residual_l - (v_control_effect / 2.0));
    ELSIF v_control.target = 'impact' THEN
      v_residual_i := GREATEST(1, v_residual_i - (v_control_effect / 2.0));
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_residual_l,
    v_residual_i,
    v_residual_l * v_residual_i;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  '✓ Migration completed successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'controls') as control_columns,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'period') as has_period,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_priority') as has_priority;
