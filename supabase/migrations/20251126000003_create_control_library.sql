-- Migration: Create Control Library
-- Description: Create table for control library with DIME scoring
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create control_library table
CREATE TABLE IF NOT EXISTS control_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_code VARCHAR(20) NOT NULL,
  control_name VARCHAR(200) NOT NULL,
  control_description TEXT,
  control_type VARCHAR(50) CHECK (control_type IN ('preventive', 'detective', 'corrective')),
  control_effect VARCHAR(50) CHECK (control_effect IN ('likelihood_reducing', 'impact_reducing')),

  -- DIME Scoring (Design, Implementation, Monitoring, Evaluation)
  design_score INTEGER DEFAULT 0 CHECK (design_score >= 0 AND design_score <= 100),
  implementation_score INTEGER DEFAULT 0 CHECK (implementation_score >= 0 AND implementation_score <= 100),
  monitoring_score INTEGER DEFAULT 0 CHECK (monitoring_score >= 0 AND monitoring_score <= 100),
  evaluation_score INTEGER DEFAULT 0 CHECK (evaluation_score >= 0 AND evaluation_score <= 100),
  dime_average INTEGER GENERATED ALWAYS AS ((design_score + implementation_score + monitoring_score + evaluation_score) / 4) STORED,

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'pending')),
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_control_code UNIQUE(organization_id, control_code)
);

-- Create indexes for performance
CREATE INDEX idx_control_org ON control_library(organization_id);
CREATE INDEX idx_control_status ON control_library(status);
CREATE INDEX idx_control_type ON control_library(control_type);
CREATE INDEX idx_control_effect ON control_library(control_effect);
CREATE INDEX idx_control_dime_avg ON control_library(dime_average);
CREATE INDEX idx_control_name ON control_library(control_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_control_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER control_updated_at
  BEFORE UPDATE ON control_library
  FOR EACH ROW
  EXECUTE FUNCTION update_control_timestamp();

-- Row Level Security (RLS)
ALTER TABLE control_library ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view controls from their organization
CREATE POLICY control_view_policy ON control_library
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can suggest new controls (creates with 'pending' status)
CREATE POLICY control_suggest_policy ON control_library
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND status = 'pending'
    AND created_by = auth.uid()
  );

-- Policy: Only admins can approve/update controls
CREATE POLICY control_admin_update_policy ON control_library
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete controls
CREATE POLICY control_admin_delete_policy ON control_library
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE control_library IS 'Curated library of controls with DIME scoring for risk mitigation';
COMMENT ON COLUMN control_library.control_code IS 'Unique code for the control (e.g., CTL-001)';
COMMENT ON COLUMN control_library.control_name IS 'Short name of the control (e.g., Capacity monitoring and alerting)';
COMMENT ON COLUMN control_library.control_type IS 'Type: preventive (prevents risk), detective (detects occurrence), corrective (fixes after occurrence)';
COMMENT ON COLUMN control_library.control_effect IS 'Effect: likelihood_reducing (reduces chance of event) or impact_reducing (reduces consequences)';
COMMENT ON COLUMN control_library.design_score IS 'DIME Score - Design: How well is the control designed? (0-100)';
COMMENT ON COLUMN control_library.implementation_score IS 'DIME Score - Implementation: How well is it implemented? (0-100)';
COMMENT ON COLUMN control_library.monitoring_score IS 'DIME Score - Monitoring: How effectively is it monitored? (0-100)';
COMMENT ON COLUMN control_library.evaluation_score IS 'DIME Score - Evaluation: How regularly is it evaluated? (0-100)';
COMMENT ON COLUMN control_library.dime_average IS 'Average of all DIME scores (computed automatically)';
COMMENT ON COLUMN control_library.usage_count IS 'Number of risks currently using this control';
