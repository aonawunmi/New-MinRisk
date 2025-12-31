-- Migration: Create Control Mapping Tables
-- Description: Create tables for Root Cause → Control and Impact → Control mappings
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create root_cause_control_mapping table
CREATE TABLE IF NOT EXISTS root_cause_control_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL REFERENCES root_cause_register(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- 1 = primary control, 2 = secondary, 3 = tertiary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_root_cause_control UNIQUE(root_cause_id, control_id)
);

-- Create impact_control_mapping table
CREATE TABLE IF NOT EXISTS impact_control_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL REFERENCES impact_register(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- 1 = primary control, 2 = secondary, 3 = tertiary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_impact_control UNIQUE(impact_id, control_id)
);

-- Create indexes for performance
CREATE INDEX idx_root_cause_mapping_org ON root_cause_control_mapping(organization_id);
CREATE INDEX idx_root_cause_mapping_cause ON root_cause_control_mapping(root_cause_id);
CREATE INDEX idx_root_cause_mapping_control ON root_cause_control_mapping(control_id);
CREATE INDEX idx_root_cause_mapping_priority ON root_cause_control_mapping(priority);

CREATE INDEX idx_impact_mapping_org ON impact_control_mapping(organization_id);
CREATE INDEX idx_impact_mapping_impact ON impact_control_mapping(impact_id);
CREATE INDEX idx_impact_mapping_control ON impact_control_mapping(control_id);
CREATE INDEX idx_impact_mapping_priority ON impact_control_mapping(priority);

-- Create view to show root causes with their recommended controls
CREATE OR REPLACE VIEW root_cause_controls_view AS
SELECT
  rc.id as root_cause_id,
  rc.cause_code,
  rc.cause_name,
  rcm.priority,
  c.id as control_id,
  c.control_code,
  c.control_name,
  c.control_type,
  c.control_effect,
  c.cost,
  c.timeline,
  c.complexity,
  c.dime_average
FROM root_cause_register rc
INNER JOIN root_cause_control_mapping rcm ON rc.id = rcm.root_cause_id
INNER JOIN control_library c ON rcm.control_id = c.id
WHERE rc.status = 'active' AND c.status = 'active'
ORDER BY rc.cause_code, rcm.priority;

-- Create view to show impacts with their recommended controls
CREATE OR REPLACE VIEW impact_controls_view AS
SELECT
  i.id as impact_id,
  i.impact_code,
  i.impact_name,
  icm.priority,
  c.id as control_id,
  c.control_code,
  c.control_name,
  c.control_type,
  c.control_effect,
  c.cost,
  c.timeline,
  c.complexity,
  c.dime_average
FROM impact_register i
INNER JOIN impact_control_mapping icm ON i.id = icm.impact_id
INNER JOIN control_library c ON icm.control_id = c.id
WHERE i.status = 'active' AND c.status = 'active'
ORDER BY i.impact_code, icm.priority;

-- Row Level Security (RLS)
ALTER TABLE root_cause_control_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_control_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view mappings from their organization
CREATE POLICY root_cause_mapping_view_policy ON root_cause_control_mapping
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY impact_mapping_view_policy ON impact_control_mapping
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can modify mappings
CREATE POLICY root_cause_mapping_admin_policy ON root_cause_control_mapping
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  );

CREATE POLICY impact_mapping_admin_policy ON impact_control_mapping
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE root_cause_control_mapping IS 'Pre-mapped relationships between root causes and likelihood-reducing controls';
COMMENT ON TABLE impact_control_mapping IS 'Pre-mapped relationships between impacts and impact-reducing controls';
COMMENT ON COLUMN root_cause_control_mapping.priority IS 'Control priority: 1 = primary (most effective), 2 = secondary, 3 = tertiary';
COMMENT ON COLUMN impact_control_mapping.priority IS 'Control priority: 1 = primary (most effective), 2 = secondary, 3 = tertiary';
COMMENT ON VIEW root_cause_controls_view IS 'Shows all active root causes with their recommended controls ordered by priority';
COMMENT ON VIEW impact_controls_view IS 'Shows all active impacts with their recommended controls ordered by priority';
