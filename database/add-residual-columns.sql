-- ============================================================================
-- Add Residual Risk Columns to Risks Table
-- ============================================================================
-- This migration adds columns to store pre-calculated residual risk values
-- for improved heatmap performance

BEGIN;

-- Add residual risk columns
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS residual_likelihood INTEGER CHECK (residual_likelihood >= 1 AND residual_likelihood <= 6),
ADD COLUMN IF NOT EXISTS residual_impact INTEGER CHECK (residual_impact >= 1 AND residual_impact <= 6),
ADD COLUMN IF NOT EXISTS residual_score INTEGER,
ADD COLUMN IF NOT EXISTS last_residual_calc TIMESTAMPTZ DEFAULT NOW();

-- Add index for faster heatmap queries
CREATE INDEX IF NOT EXISTS idx_risks_residual_position ON risks(residual_likelihood, residual_impact);
CREATE INDEX IF NOT EXISTS idx_risks_inherent_position ON risks(likelihood_inherent, impact_inherent);

-- ============================================================================
-- Create Function to Calculate Residual Risk
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_residual_for_risk(risk_id_param UUID)
RETURNS TABLE(
  residual_likelihood INTEGER,
  residual_impact INTEGER,
  residual_score INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_inherent_l INTEGER;
  v_inherent_i INTEGER;
  v_max_likelihood_eff NUMERIC := 0;
  v_max_impact_eff NUMERIC := 0;
  v_residual_l INTEGER;
  v_residual_i INTEGER;
BEGIN
  -- Get inherent values
  SELECT likelihood_inherent, impact_inherent
  INTO v_inherent_l, v_inherent_i
  FROM risks
  WHERE id = risk_id_param;

  -- Calculate max effectiveness for Likelihood controls
  SELECT COALESCE(MAX(
    CASE
      WHEN design_score = 0 OR implementation_score = 0 THEN 0
      ELSE (design_score + implementation_score + monitoring_score + evaluation_score) / 12.0
    END
  ), 0)
  INTO v_max_likelihood_eff
  FROM controls
  WHERE risk_id = risk_id_param
    AND target = 'Likelihood'
    AND design_score IS NOT NULL
    AND implementation_score IS NOT NULL
    AND monitoring_score IS NOT NULL
    AND evaluation_score IS NOT NULL
    AND deleted_at IS NULL;

  -- Calculate max effectiveness for Impact controls
  SELECT COALESCE(MAX(
    CASE
      WHEN design_score = 0 OR implementation_score = 0 THEN 0
      ELSE (design_score + implementation_score + monitoring_score + evaluation_score) / 12.0
    END
  ), 0)
  INTO v_max_impact_eff
  FROM controls
  WHERE risk_id = risk_id_param
    AND target = 'Impact'
    AND design_score IS NOT NULL
    AND implementation_score IS NOT NULL
    AND monitoring_score IS NOT NULL
    AND evaluation_score IS NOT NULL
    AND deleted_at IS NULL;

  -- Apply DIME formula: residual = GREATEST(1, inherent - ROUND((inherent - 1) * max_effectiveness))
  v_residual_l := GREATEST(1, v_inherent_l - ROUND((v_inherent_l - 1) * v_max_likelihood_eff)::INTEGER);
  v_residual_i := GREATEST(1, v_inherent_i - ROUND((v_inherent_i - 1) * v_max_impact_eff)::INTEGER);

  RETURN QUERY SELECT v_residual_l, v_residual_i, v_residual_l * v_residual_i;
END;
$$;

-- ============================================================================
-- Create Trigger Function to Auto-Update Residual
-- ============================================================================

CREATE OR REPLACE FUNCTION update_residual_risk()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_risk_id UUID;
  v_residual RECORD;
BEGIN
  -- Determine which risk_id to update
  IF TG_OP = 'DELETE' THEN
    v_risk_id := OLD.risk_id;
  ELSE
    v_risk_id := NEW.risk_id;
  END IF;

  -- Calculate new residual
  SELECT * INTO v_residual FROM calculate_residual_for_risk(v_risk_id);

  -- Update risks table
  UPDATE risks
  SET
    residual_likelihood = v_residual.residual_likelihood,
    residual_impact = v_residual.residual_impact,
    residual_score = v_residual.residual_score,
    last_residual_calc = NOW()
  WHERE id = v_risk_id;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Create Triggers on Controls Table
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_residual_on_control_change ON controls;

CREATE TRIGGER trigger_update_residual_on_control_change
AFTER INSERT OR UPDATE OR DELETE ON controls
FOR EACH ROW
EXECUTE FUNCTION update_residual_risk();

-- ============================================================================
-- Backfill Existing Risks with Residual Values
-- ============================================================================

DO $$
DECLARE
  risk_record RECORD;
  v_residual RECORD;
BEGIN
  FOR risk_record IN SELECT id FROM risks WHERE residual_likelihood IS NULL LOOP
    SELECT * INTO v_residual FROM calculate_residual_for_risk(risk_record.id);

    UPDATE risks
    SET
      residual_likelihood = v_residual.residual_likelihood,
      residual_impact = v_residual.residual_impact,
      residual_score = v_residual.residual_score,
      last_residual_calc = NOW()
    WHERE id = risk_record.id;
  END LOOP;
END;
$$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check column additions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'risks'
  AND column_name LIKE 'residual%'
ORDER BY ordinal_position;

-- Check sample data
SELECT
  risk_code,
  likelihood_inherent,
  impact_inherent,
  likelihood_inherent * impact_inherent AS inherent_score,
  residual_likelihood,
  residual_impact,
  residual_score,
  last_residual_calc
FROM risks
LIMIT 5;
