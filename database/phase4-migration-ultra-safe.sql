-- ============================================================================
-- MinRisk v2 - Phase 4 Migration (ULTRA SAFE VERSION)
-- Adds ALL missing columns to controls table one by one
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD NEW FIELDS TO RISKS TABLE
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'period') THEN
        ALTER TABLE risks ADD COLUMN period text;
        RAISE NOTICE '✓ Added period to risks';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_priority') THEN
        ALTER TABLE risks ADD COLUMN is_priority boolean DEFAULT false;
        RAISE NOTICE '✓ Added is_priority to risks';
    END IF;
END $$;

-- ============================================================================
-- PART 2: ADD MISSING COLUMNS TO CONTROLS TABLE
-- ============================================================================

DO $$
BEGIN
    -- Add organization_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'organization_id') THEN
        ALTER TABLE controls ADD COLUMN organization_id uuid;
        -- Populate from related risk
        UPDATE controls c SET organization_id = r.organization_id
        FROM risks r WHERE c.risk_id = r.id AND c.organization_id IS NULL;
        -- Make it NOT NULL after populating
        ALTER TABLE controls ALTER COLUMN organization_id SET NOT NULL;
        ALTER TABLE controls ADD CONSTRAINT controls_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added organization_id to controls';
    END IF;

    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'target') THEN
        ALTER TABLE controls ADD COLUMN target text CHECK (target IN ('likelihood', 'impact'));
        RAISE NOTICE '✓ Added target to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'design_score') THEN
        ALTER TABLE controls ADD COLUMN design_score int CHECK (design_score BETWEEN 0 AND 3);
        RAISE NOTICE '✓ Added design_score to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'implementation_score') THEN
        ALTER TABLE controls ADD COLUMN implementation_score int CHECK (implementation_score BETWEEN 0 AND 3);
        RAISE NOTICE '✓ Added implementation_score to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'monitoring_score') THEN
        ALTER TABLE controls ADD COLUMN monitoring_score int CHECK (monitoring_score BETWEEN 0 AND 3);
        RAISE NOTICE '✓ Added monitoring_score to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'evaluation_score') THEN
        ALTER TABLE controls ADD COLUMN evaluation_score int CHECK (evaluation_score BETWEEN 0 AND 3);
        RAISE NOTICE '✓ Added evaluation_score to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'name') THEN
        ALTER TABLE controls ADD COLUMN name text;
        RAISE NOTICE '✓ Added name to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'control_type') THEN
        ALTER TABLE controls ADD COLUMN control_type text;
        RAISE NOTICE '✓ Added control_type to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'owner_profile_id') THEN
        ALTER TABLE controls ADD COLUMN owner_profile_id uuid REFERENCES user_profiles(id);
        RAISE NOTICE '✓ Added owner_profile_id to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'created_by_profile_id') THEN
        ALTER TABLE controls ADD COLUMN created_by_profile_id uuid REFERENCES user_profiles(id);
        RAISE NOTICE '✓ Added created_by_profile_id to controls';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'deleted_at') THEN
        ALTER TABLE controls ADD COLUMN deleted_at timestamptz;
        RAISE NOTICE '✓ Added deleted_at to controls';
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

DROP POLICY IF EXISTS "org_users_select_controls" ON controls;
DROP POLICY IF EXISTS "org_users_insert_controls" ON controls;
DROP POLICY IF EXISTS "org_users_update_own_controls" ON controls;
DROP POLICY IF EXISTS "org_users_delete_own_controls" ON controls;
DROP POLICY IF EXISTS "admins_all_controls" ON controls;

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
    OR is_admin()
  )
)
WITH CHECK (
  organization_id = current_org_id()
);

CREATE POLICY "org_users_delete_own_controls"
ON controls FOR DELETE
USING (
  organization_id = current_org_id()
  AND (
    created_by_profile_id = current_profile_id()
    OR owner_profile_id = current_profile_id()
    OR is_admin()
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
  '✓ Migration completed!' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'controls') as control_columns,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'period') as has_period,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'risks' AND column_name = 'is_priority') as has_priority,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'target') as has_target,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'design_score') as has_dime;
