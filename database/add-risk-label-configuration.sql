-- ============================================================================
-- MinRisk: Risk Label Configuration Migration
-- ============================================================================
-- PURPOSE: Update app_configs to support numeric-to-label mapping
--
-- CHANGES:
-- 1. Convert likelihood_labels from array to object (1-6 mapping)
-- 2. Convert impact_labels from array to object (1-6 mapping)
-- 3. Set proper defaults for 5x5 and 6x6 matrices
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Update existing app_configs with proper label structure
-- ============================================================================

-- For 5x5 matrix organizations
UPDATE app_configs
SET
  likelihood_labels = jsonb_build_object(
    '1', 'Rare',
    '2', 'Unlikely',
    '3', 'Possible',
    '4', 'Likely',
    '5', 'Almost Certain'
  ),
  impact_labels = jsonb_build_object(
    '1', 'Minimal',
    '2', 'Low',
    '3', 'Moderate',
    '4', 'High',
    '5', 'Severe'
  )
WHERE matrix_size = 5;

-- For 6x6 matrix organizations
UPDATE app_configs
SET
  likelihood_labels = jsonb_build_object(
    '1', 'Very Rare',
    '2', 'Rare',
    '3', 'Unlikely',
    '4', 'Possible',
    '5', 'Likely',
    '6', 'Almost Certain'
  ),
  impact_labels = jsonb_build_object(
    '1', 'Insignificant',
    '2', 'Minimal',
    '3', 'Low',
    '4', 'Moderate',
    '5', 'High',
    '6', 'Severe'
  )
WHERE matrix_size = 6;

-- ============================================================================
-- STEP 2: Update default values for new organizations
-- ============================================================================

-- Change column defaults to use object structure
ALTER TABLE app_configs
  ALTER COLUMN likelihood_labels SET DEFAULT jsonb_build_object(
    '1', 'Rare',
    '2', 'Unlikely',
    '3', 'Possible',
    '4', 'Likely',
    '5', 'Almost Certain'
  ),
  ALTER COLUMN impact_labels SET DEFAULT jsonb_build_object(
    '1', 'Minimal',
    '2', 'Low',
    '3', 'Moderate',
    '4', 'High',
    '5', 'Severe'
  );

-- ============================================================================
-- STEP 3: Add helper function to get label for numeric value
-- ============================================================================

CREATE OR REPLACE FUNCTION get_risk_label(
  org_id UUID,
  label_type TEXT, -- 'likelihood' or 'impact'
  numeric_value INTEGER
) RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  label_obj JSONB;
  result TEXT;
BEGIN
  -- Get the label object from app_configs
  IF label_type = 'likelihood' THEN
    SELECT likelihood_labels INTO label_obj
    FROM app_configs
    WHERE organization_id = org_id
    LIMIT 1;
  ELSIF label_type = 'impact' THEN
    SELECT impact_labels INTO label_obj
    FROM app_configs
    WHERE organization_id = org_id
    LIMIT 1;
  ELSE
    RETURN NULL;
  END IF;

  -- Extract the label for the numeric value
  result := label_obj->>numeric_value::TEXT;

  RETURN result;
END;
$$;

-- ============================================================================
-- STEP 4: Create view for risks with labels
-- ============================================================================

CREATE OR REPLACE VIEW risks_with_labels AS
SELECT
  r.*,
  get_risk_label(r.organization_id, 'likelihood', r.likelihood_inherent) as likelihood_inherent_label,
  get_risk_label(r.organization_id, 'impact', r.impact_inherent) as impact_inherent_label
FROM risks r;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that labels are properly structured
SELECT
  organization_id,
  matrix_size,
  likelihood_labels,
  impact_labels
FROM app_configs;

-- Test the helper function
SELECT
  risk_code,
  likelihood_inherent,
  get_risk_label(organization_id, 'likelihood', likelihood_inherent) as likelihood_label,
  impact_inherent,
  get_risk_label(organization_id, 'impact', impact_inherent) as impact_label
FROM risks
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RISK LABEL CONFIGURATION COMPLETED';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What Changed:';
  RAISE NOTICE '  1. likelihood_labels now maps 1-6 to custom text';
  RAISE NOTICE '  2. impact_labels now maps 1-6 to custom text';
  RAISE NOTICE '  3. Created get_risk_label() helper function';
  RAISE NOTICE '  4. Created risks_with_labels view';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next Steps:';
  RAISE NOTICE '  1. Update Organization Settings UI to configure labels';
  RAISE NOTICE '  2. Update Risk Form to show labels in dropdowns';
  RAISE NOTICE '  3. Update Heatmap axes to use custom labels';
END $$;
