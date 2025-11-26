-- Migration: Create Risk Controls Junction Table
-- Description: Many-to-many relationship between risks and controls from control library
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create risk_controls junction table
CREATE TABLE IF NOT EXISTS risk_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),

  -- Optional override of DIME scores at risk level
  -- (allows same control to have different scores for different risks)
  design_score_override INTEGER CHECK (design_score_override >= 0 AND design_score_override <= 100),
  implementation_score_override INTEGER CHECK (implementation_score_override >= 0 AND implementation_score_override <= 100),
  monitoring_score_override INTEGER CHECK (monitoring_score_override >= 0 AND monitoring_score_override <= 100),
  evaluation_score_override INTEGER CHECK (evaluation_score_override >= 0 AND evaluation_score_override <= 100),

  -- Notes specific to this risk-control relationship
  notes TEXT,

  CONSTRAINT unique_risk_control UNIQUE(risk_id, control_id)
);

-- Create indexes for performance
CREATE INDEX idx_risk_controls_risk ON risk_controls(risk_id);
CREATE INDEX idx_risk_controls_control ON risk_controls(control_id);
CREATE INDEX idx_risk_controls_assigned_by ON risk_controls(assigned_by);

-- Create view to show risks with their controls (including effective DIME scores)
CREATE OR REPLACE VIEW risks_with_controls AS
SELECT
  r.id as risk_id,
  r.risk_code,
  r.risk_title,
  r.refined_risk_statement,
  rc.id as risk_control_id,
  c.id as control_id,
  c.control_code,
  c.control_name,
  c.control_description,
  c.control_type,
  c.control_effect,

  -- Effective DIME scores (use override if set, otherwise use library value)
  COALESCE(rc.design_score_override, c.design_score) as effective_design_score,
  COALESCE(rc.implementation_score_override, c.implementation_score) as effective_implementation_score,
  COALESCE(rc.monitoring_score_override, c.monitoring_score) as effective_monitoring_score,
  COALESCE(rc.evaluation_score_override, c.evaluation_score) as effective_evaluation_score,

  -- Calculate effective DIME average
  (
    COALESCE(rc.design_score_override, c.design_score) +
    COALESCE(rc.implementation_score_override, c.implementation_score) +
    COALESCE(rc.monitoring_score_override, c.monitoring_score) +
    COALESCE(rc.evaluation_score_override, c.evaluation_score)
  ) / 4 as effective_dime_average,

  rc.assigned_at,
  rc.assigned_by,
  rc.notes as risk_control_notes
FROM risks r
INNER JOIN risk_controls rc ON r.id = rc.risk_id
INNER JOIN control_library c ON rc.control_id = c.id
WHERE c.status = 'active';

-- Row Level Security (RLS)
ALTER TABLE risk_controls ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view risk-control assignments from their organization
CREATE POLICY risk_controls_view_policy ON risk_controls
  FOR SELECT
  USING (
    risk_id IN (
      SELECT id FROM risks WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can assign controls to risks in their organization
CREATE POLICY risk_controls_insert_policy ON risk_controls
  FOR INSERT
  WITH CHECK (
    risk_id IN (
      SELECT id FROM risks WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    AND assigned_by = auth.uid()
  );

-- Policy: Users can update risk-control assignments they created or admins can update any
CREATE POLICY risk_controls_update_policy ON risk_controls
  FOR UPDATE
  USING (
    risk_id IN (
      SELECT id FROM risks r WHERE r.organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND (assigned_by = auth.uid() OR role = 'admin')
      )
    )
  );

-- Policy: Users can delete risk-control assignments they created or admins can delete any
CREATE POLICY risk_controls_delete_policy ON risk_controls
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
COMMENT ON TABLE risk_controls IS 'Junction table for many-to-many relationship between risks and controls';
COMMENT ON COLUMN risk_controls.design_score_override IS 'Optional override of DIME Design score for this specific risk';
COMMENT ON COLUMN risk_controls.implementation_score_override IS 'Optional override of DIME Implementation score for this specific risk';
COMMENT ON COLUMN risk_controls.monitoring_score_override IS 'Optional override of DIME Monitoring score for this specific risk';
COMMENT ON COLUMN risk_controls.evaluation_score_override IS 'Optional override of DIME Evaluation score for this specific risk';
COMMENT ON COLUMN risk_controls.notes IS 'Notes specific to this risk-control relationship';
