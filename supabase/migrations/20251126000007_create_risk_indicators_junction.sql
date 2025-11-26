-- Migration: Create Risk Indicators Junction Table
-- Description: Many-to-many relationship between risks and KRIs/KCIs
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create risk_indicators junction table
CREATE TABLE IF NOT EXISTS risk_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),

  -- Optional override of thresholds at risk level
  -- (allows same indicator to have different thresholds for different risks)
  threshold_warning_override NUMERIC,
  threshold_critical_override NUMERIC,

  -- Current value tracking
  current_value NUMERIC,
  last_measured_at TIMESTAMPTZ,
  breach_status VARCHAR(20) CHECK (breach_status IN ('normal', 'warning', 'critical')),

  -- Notes specific to this risk-indicator relationship
  notes TEXT,

  CONSTRAINT unique_risk_indicator UNIQUE(risk_id, indicator_id)
);

-- Create indexes for performance
CREATE INDEX idx_risk_indicators_risk ON risk_indicators(risk_id);
CREATE INDEX idx_risk_indicators_indicator ON risk_indicators(indicator_id);
CREATE INDEX idx_risk_indicators_breach ON risk_indicators(breach_status);
CREATE INDEX idx_risk_indicators_assigned_by ON risk_indicators(assigned_by);

-- Create function to update breach status based on current value
CREATE OR REPLACE FUNCTION update_indicator_breach_status()
RETURNS TRIGGER AS $$
DECLARE
  v_warning_threshold NUMERIC;
  v_critical_threshold NUMERIC;
BEGIN
  -- Get effective thresholds (use override if set, otherwise use library value)
  SELECT
    COALESCE(NEW.threshold_warning_override, k.threshold_warning),
    COALESCE(NEW.threshold_critical_override, k.threshold_critical)
  INTO v_warning_threshold, v_critical_threshold
  FROM kri_kci_library k
  WHERE k.id = NEW.indicator_id;

  -- Update breach status based on current value
  IF NEW.current_value IS NOT NULL THEN
    IF v_critical_threshold IS NOT NULL AND NEW.current_value >= v_critical_threshold THEN
      NEW.breach_status := 'critical';
    ELSIF v_warning_threshold IS NOT NULL AND NEW.current_value >= v_warning_threshold THEN
      NEW.breach_status := 'warning';
    ELSE
      NEW.breach_status := 'normal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update breach status
DROP TRIGGER IF EXISTS risk_indicators_update_breach_status ON risk_indicators;
CREATE TRIGGER risk_indicators_update_breach_status
  BEFORE INSERT OR UPDATE OF current_value, threshold_warning_override, threshold_critical_override ON risk_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_indicator_breach_status();

-- Create view to show risks with their indicators (including effective thresholds)
CREATE OR REPLACE VIEW risks_with_indicators AS
SELECT
  r.id as risk_id,
  r.risk_code,
  r.risk_title,
  r.refined_risk_statement,
  ri.id as risk_indicator_id,
  k.id as indicator_id,
  k.indicator_code,
  k.indicator_type,
  k.indicator_name,
  k.indicator_description,
  k.measurement_unit,
  k.measurement_frequency,

  -- Effective thresholds (use override if set, otherwise use library value)
  COALESCE(ri.threshold_warning_override, k.threshold_warning) as effective_threshold_warning,
  COALESCE(ri.threshold_critical_override, k.threshold_critical) as effective_threshold_critical,

  ri.current_value,
  ri.last_measured_at,
  ri.breach_status,
  ri.assigned_at,
  ri.assigned_by,
  ri.notes as risk_indicator_notes
FROM risks r
INNER JOIN risk_indicators ri ON r.id = ri.risk_id
INNER JOIN kri_kci_library k ON ri.indicator_id = k.id
WHERE k.status = 'active';

-- Create view to show risk indicator breaches
CREATE OR REPLACE VIEW risk_indicator_breaches AS
SELECT
  r.id as risk_id,
  r.risk_code,
  r.risk_title,
  r.organization_id,
  k.indicator_code,
  k.indicator_name,
  k.indicator_type,
  ri.current_value,
  COALESCE(ri.threshold_warning_override, k.threshold_warning) as threshold_warning,
  COALESCE(ri.threshold_critical_override, k.threshold_critical) as threshold_critical,
  ri.breach_status,
  ri.last_measured_at,
  r.status as risk_status
FROM risks r
INNER JOIN risk_indicators ri ON r.id = ri.risk_id
INNER JOIN kri_kci_library k ON ri.indicator_id = k.id
WHERE ri.breach_status IN ('warning', 'critical')
  AND r.status IN ('OPEN', 'MONITORING')
  AND k.status = 'active'
ORDER BY
  CASE ri.breach_status
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  ri.last_measured_at DESC;

-- Row Level Security (RLS)
ALTER TABLE risk_indicators ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view risk-indicator assignments from their organization
CREATE POLICY risk_indicators_view_policy ON risk_indicators
  FOR SELECT
  USING (
    risk_id IN (
      SELECT id FROM risks WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can assign indicators to risks in their organization
CREATE POLICY risk_indicators_insert_policy ON risk_indicators
  FOR INSERT
  WITH CHECK (
    risk_id IN (
      SELECT id FROM risks WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    AND assigned_by = auth.uid()
  );

-- Policy: Users can update risk-indicator assignments they created or admins can update any
CREATE POLICY risk_indicators_update_policy ON risk_indicators
  FOR UPDATE
  USING (
    risk_id IN (
      SELECT id FROM risks r WHERE r.organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND (assigned_by = auth.uid() OR role = 'admin')
      )
    )
  );

-- Policy: Users can delete risk-indicator assignments they created or admins can delete any
CREATE POLICY risk_indicators_delete_policy ON risk_indicators
  FOR DELETE
  USING (
    risk_id IN (
      SELECT id FROM risks r WHERE r.organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND (assigned_by = auth.uid() OR role = 'admin')
      )
    )
  );

-- Comments for documentation
COMMENT ON TABLE risk_indicators IS 'Junction table for many-to-many relationship between risks and KRIs/KCIs';
COMMENT ON COLUMN risk_indicators.threshold_warning_override IS 'Optional override of warning threshold for this specific risk';
COMMENT ON COLUMN risk_indicators.threshold_critical_override IS 'Optional override of critical threshold for this specific risk';
COMMENT ON COLUMN risk_indicators.current_value IS 'Current measured value of the indicator';
COMMENT ON COLUMN risk_indicators.last_measured_at IS 'When the current value was last measured';
COMMENT ON COLUMN risk_indicators.breach_status IS 'Current breach status: normal, warning, or critical';
COMMENT ON COLUMN risk_indicators.notes IS 'Notes specific to this risk-indicator relationship';

COMMENT ON VIEW risk_indicator_breaches IS 'Shows all active KRI/KCI breaches (warning or critical) for active risks';
