-- Migration: Residual Risk Calculation
-- Description: Automated residual risk calculation based on control effectiveness (DIME scores)
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #6 (Important)

-- ============================================================================
-- ADD COLUMNS FOR RESIDUAL RISK TRACKING
-- ============================================================================

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_impact INTEGER CHECK (residual_impact BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_score INTEGER,
  ADD COLUMN IF NOT EXISTS control_effectiveness_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS residual_last_calculated TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_risks_residual_score ON risks(residual_score);
CREATE INDEX IF NOT EXISTS idx_risks_control_effectiveness ON risks(control_effectiveness_percentage);

-- ============================================================================
-- FUNCTION: Calculate Control Effectiveness
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_control_effectiveness(p_risk_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_effectiveness NUMERIC := 0;
  v_combined_residual NUMERIC := 1.0;
  v_individual_effectiveness NUMERIC;
  v_control_count INTEGER := 0;
BEGIN
  -- Get all active controls for this risk and calculate combined effectiveness
  FOR v_individual_effectiveness IN
    SELECT
      ((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0) / 100.0 AS effectiveness
    FROM risk_controls rc
    JOIN control_library c ON rc.control_id = c.id
    WHERE rc.risk_id = p_risk_id
      AND rc.status = 'active'
      AND c.status = 'active'
  LOOP
    v_control_count := v_control_count + 1;

    -- Combined effectiveness formula: 1 - PRODUCT(1 - individual_effectiveness)
    -- This accounts for diminishing returns when stacking controls
    v_combined_residual := v_combined_residual * (1.0 - v_individual_effectiveness);
  END LOOP;

  -- If no controls, effectiveness is 0%
  IF v_control_count = 0 THEN
    RETURN 0;
  END IF;

  -- Combined effectiveness = 1 - (product of all residuals)
  v_total_effectiveness := (1.0 - v_combined_residual) * 100.0;

  -- Cap at 95% (controls can never eliminate risk completely)
  IF v_total_effectiveness > 95 THEN
    v_total_effectiveness := 95;
  END IF;

  RETURN ROUND(v_total_effectiveness, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Calculate Residual Risk
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_residual_risk(
  p_inherent_likelihood INTEGER,
  p_inherent_impact INTEGER,
  p_risk_id UUID
)
RETURNS TABLE(
  residual_likelihood INTEGER,
  residual_impact INTEGER,
  residual_score INTEGER,
  control_effectiveness NUMERIC
) AS $$
DECLARE
  v_control_effectiveness NUMERIC;
  v_residual_likelihood INTEGER;
  v_residual_impact INTEGER;
  v_residual_score INTEGER;
BEGIN
  -- Calculate control effectiveness
  v_control_effectiveness := calculate_control_effectiveness(p_risk_id);

  -- Calculate residual likelihood (controls primarily reduce likelihood)
  -- Formula: Residual = Inherent * (1 - Effectiveness/100)
  -- Minimum residual likelihood is 1 (risk can never be zero)
  v_residual_likelihood := GREATEST(
    1,
    ROUND(p_inherent_likelihood * (1.0 - v_control_effectiveness / 100.0))
  );

  -- Calculate residual impact (controls can also reduce impact, but less effectively)
  -- Use 50% of control effectiveness for impact reduction
  -- Rationale: Likelihood-reducing controls (preventive) are most common
  v_residual_impact := GREATEST(
    1,
    ROUND(p_inherent_impact * (1.0 - (v_control_effectiveness * 0.5) / 100.0))
  );

  -- Calculate residual score (Likelihood × Impact)
  v_residual_score := v_residual_likelihood * v_residual_impact;

  -- Return results
  RETURN QUERY SELECT
    v_residual_likelihood,
    v_residual_impact,
    v_residual_score,
    v_control_effectiveness;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update Risk Residual Values
-- ============================================================================

CREATE OR REPLACE FUNCTION update_risk_residual()
RETURNS TRIGGER AS $$
DECLARE
  v_risk RECORD;
  v_residual RECORD;
BEGIN
  -- Determine which risk_id to update based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_risk := (SELECT * FROM risks WHERE id = OLD.risk_id);
  ELSE
    v_risk := (SELECT * FROM risks WHERE id = NEW.risk_id);
  END IF;

  -- Skip if risk doesn't exist (shouldn't happen due to foreign key, but be safe)
  IF v_risk IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate residual risk
  SELECT * INTO v_residual
  FROM calculate_residual_risk(
    v_risk.inherent_likelihood,
    v_risk.inherent_impact,
    v_risk.id
  );

  -- Update risk record with residual values
  UPDATE risks
  SET
    residual_likelihood = v_residual.residual_likelihood,
    residual_impact = v_residual.residual_impact,
    residual_score = v_residual.residual_score,
    control_effectiveness_percentage = v_residual.control_effectiveness,
    residual_last_calculated = NOW(),
    updated_at = NOW()
  WHERE id = v_risk.id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC RESIDUAL RISK UPDATES
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_residual_on_control_add ON risk_controls;
DROP TRIGGER IF EXISTS trigger_update_residual_on_control_update ON risk_controls;
DROP TRIGGER IF EXISTS trigger_update_residual_on_control_delete ON risk_controls;

-- Trigger: When control is added to a risk
CREATE TRIGGER trigger_update_residual_on_control_add
  AFTER INSERT ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

-- Trigger: When control status changes
CREATE TRIGGER trigger_update_residual_on_control_update
  AFTER UPDATE OF status ON risk_controls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_risk_residual();

-- Trigger: When control is removed from a risk
CREATE TRIGGER trigger_update_residual_on_control_delete
  AFTER DELETE ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

-- ============================================================================
-- FUNCTION: Recalculate All Residual Risks (Utility)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_residual_risks(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(
  risk_id UUID,
  risk_title TEXT,
  inherent_score INTEGER,
  residual_score INTEGER,
  risk_reduction_percentage NUMERIC
) AS $$
DECLARE
  v_risk RECORD;
  v_residual RECORD;
  v_updated_count INTEGER := 0;
BEGIN
  -- Loop through all risks (optionally filtered by organization)
  FOR v_risk IN
    SELECT id, title, inherent_likelihood, inherent_impact, (inherent_likelihood * inherent_impact) as inherent_score
    FROM risks
    WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
      AND inherent_likelihood IS NOT NULL
      AND inherent_impact IS NOT NULL
  LOOP
    -- Calculate residual risk
    SELECT * INTO v_residual
    FROM calculate_residual_risk(
      v_risk.inherent_likelihood,
      v_risk.inherent_impact,
      v_risk.id
    );

    -- Update risk record
    UPDATE risks
    SET
      residual_likelihood = v_residual.residual_likelihood,
      residual_impact = v_residual.residual_impact,
      residual_score = v_residual.residual_score,
      control_effectiveness_percentage = v_residual.control_effectiveness,
      residual_last_calculated = NOW(),
      updated_at = NOW()
    WHERE id = v_risk.id;

    v_updated_count := v_updated_count + 1;

    -- Return result row
    RETURN QUERY SELECT
      v_risk.id,
      v_risk.title,
      v_risk.inherent_score,
      v_residual.residual_score,
      ROUND(((v_risk.inherent_score - v_residual.residual_score)::NUMERIC / v_risk.inherent_score * 100), 1) AS reduction_pct;
  END LOOP;

  RAISE NOTICE 'Recalculated residual risk for % risks', v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE ANALYSIS VIEWS
-- ============================================================================

-- View: Risk Treatment Effectiveness
CREATE OR REPLACE VIEW risk_treatment_effectiveness_view AS
SELECT
  r.id,
  r.organization_id,
  r.title,
  r.inherent_likelihood,
  r.inherent_impact,
  (r.inherent_likelihood * r.inherent_impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  r.control_effectiveness_percentage,
  (r.inherent_likelihood * r.inherent_impact) - COALESCE(r.residual_score, r.inherent_likelihood * r.inherent_impact) as risk_reduction,
  ROUND(
    (((r.inherent_likelihood * r.inherent_impact) - COALESCE(r.residual_score, r.inherent_likelihood * r.inherent_impact))::NUMERIC /
    (r.inherent_likelihood * r.inherent_impact) * 100),
    1
  ) as risk_reduction_percentage,
  COUNT(rc.id) as control_count,
  r.residual_last_calculated
FROM risks r
LEFT JOIN risk_controls rc ON r.id = rc.risk_id
WHERE r.inherent_likelihood IS NOT NULL AND r.inherent_impact IS NOT NULL
GROUP BY r.id, r.title, r.organization_id, r.inherent_likelihood, r.inherent_impact,
         r.residual_likelihood, r.residual_impact, r.residual_score,
         r.control_effectiveness_percentage, r.residual_last_calculated
ORDER BY risk_reduction_percentage DESC NULLS LAST;

-- View: Under-Controlled Risks (Residual > 12 and <50% reduction)
CREATE OR REPLACE VIEW under_controlled_risks_view AS
SELECT
  id,
  organization_id,
  title,
  inherent_score,
  residual_score,
  control_count,
  control_effectiveness_percentage,
  risk_reduction_percentage,
  CASE
    WHEN control_count = 0 THEN 'No controls assigned'
    WHEN control_effectiveness_percentage < 30 THEN 'Low control effectiveness'
    WHEN risk_reduction_percentage < 25 THEN 'Insufficient risk reduction'
    ELSE 'High residual risk'
  END as issue_type
FROM risk_treatment_effectiveness_view
WHERE residual_score > 12 OR risk_reduction_percentage < 50
ORDER BY residual_score DESC, risk_reduction_percentage ASC;

-- View: Well-Controlled Risks (>75% reduction or residual <6)
CREATE OR REPLACE VIEW well_controlled_risks_view AS
SELECT
  id,
  organization_id,
  title,
  inherent_score,
  residual_score,
  control_count,
  control_effectiveness_percentage,
  risk_reduction_percentage
FROM risk_treatment_effectiveness_view
WHERE risk_reduction_percentage >= 75 OR residual_score <= 6
ORDER BY risk_reduction_percentage DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN risks.residual_likelihood IS 'Calculated likelihood after controls applied (1-5 scale)';
COMMENT ON COLUMN risks.residual_impact IS 'Calculated impact after controls applied (1-5 scale)';
COMMENT ON COLUMN risks.residual_score IS 'Calculated residual risk score (likelihood × impact)';
COMMENT ON COLUMN risks.control_effectiveness_percentage IS 'Combined effectiveness of all controls (0-95%)';
COMMENT ON COLUMN risks.residual_last_calculated IS 'Timestamp of last residual risk calculation';

COMMENT ON FUNCTION calculate_control_effectiveness IS 'Calculates combined effectiveness of all active controls for a risk using diminishing returns formula';
COMMENT ON FUNCTION calculate_residual_risk IS 'Calculates residual likelihood, impact, and score based on inherent risk and control effectiveness';
COMMENT ON FUNCTION update_risk_residual IS 'Trigger function to automatically update residual risk when controls change';
COMMENT ON FUNCTION recalculate_all_residual_risks IS 'Utility function to recalculate residual risk for all risks (or filtered by organization)';

COMMENT ON VIEW risk_treatment_effectiveness_view IS 'Analysis of risk treatment effectiveness showing inherent vs residual risk and % reduction';
COMMENT ON VIEW under_controlled_risks_view IS 'Identifies risks with high residual risk or insufficient control effectiveness';
COMMENT ON VIEW well_controlled_risks_view IS 'Identifies risks with excellent control coverage and low residual risk';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

-- Example 1: Manual calculation for a specific risk
-- SELECT * FROM calculate_residual_risk(4, 5, 'risk-uuid-here');

-- Example 2: Recalculate all residual risks for an organization
-- SELECT * FROM recalculate_all_residual_risks('org-uuid-here');

-- Example 3: View under-controlled risks
-- SELECT * FROM under_controlled_risks_view WHERE organization_id = 'org-uuid-here';

-- Example 4: Check treatment effectiveness
-- SELECT * FROM risk_treatment_effectiveness_view WHERE organization_id = 'org-uuid-here' ORDER BY risk_reduction_percentage DESC;

-- ============================================================================
-- INITIAL CALCULATION (Run after migration)
-- ============================================================================

-- Uncomment to run initial calculation for all existing risks:
-- SELECT * FROM recalculate_all_residual_risks('YOUR_ORG_ID');
