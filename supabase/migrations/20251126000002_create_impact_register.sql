-- Migration: Create Impact Register
-- Description: Create table for curated impacts in Event + Root Cause + Impact model
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create impact_register table
CREATE TABLE IF NOT EXISTS impact_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impact_code VARCHAR(20) NOT NULL,
  impact_name VARCHAR(200) NOT NULL,
  impact_description TEXT,
  impact_type VARCHAR(50) CHECK (impact_type IN ('financial', 'reputational', 'operational', 'regulatory', 'safety', 'environmental', 'strategic')),
  category VARCHAR(50), -- Auto-assigned category hint
  subcategory VARCHAR(100), -- Auto-assigned subcategory hint
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'pending')),
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_impact_code UNIQUE(organization_id, impact_code)
);

-- Create indexes for performance
CREATE INDEX idx_impact_org ON impact_register(organization_id);
CREATE INDEX idx_impact_status ON impact_register(status);
CREATE INDEX idx_impact_type ON impact_register(impact_type);
CREATE INDEX idx_impact_category ON impact_register(category);
CREATE INDEX idx_impact_name ON impact_register(impact_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_impact_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER impact_updated_at
  BEFORE UPDATE ON impact_register
  FOR EACH ROW
  EXECUTE FUNCTION update_impact_timestamp();

-- Row Level Security (RLS)
ALTER TABLE impact_register ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view impacts from their organization
CREATE POLICY impact_view_policy ON impact_register
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can suggest new impacts (creates with 'pending' status)
CREATE POLICY impact_suggest_policy ON impact_register
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND status = 'pending'
    AND created_by = auth.uid()
  );

-- Policy: Only admins can approve/update impacts
CREATE POLICY impact_admin_update_policy ON impact_register
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  );

-- Policy: Only admins can delete impacts
CREATE POLICY impact_admin_delete_policy ON impact_register
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE impact_register IS 'Curated library of impacts for the Event + Root Cause + Impact risk model';
COMMENT ON COLUMN impact_register.impact_code IS 'Unique code for the impact (e.g., IMP-001)';
COMMENT ON COLUMN impact_register.impact_name IS 'Short name of the impact (e.g., Customer dissatisfaction)';
COMMENT ON COLUMN impact_register.impact_type IS 'Type of impact: financial, reputational, operational, regulatory, safety, environmental, or strategic';
COMMENT ON COLUMN impact_register.status IS 'Status: active (approved and in use), pending (awaiting admin approval), deprecated (no longer in use)';
COMMENT ON COLUMN impact_register.usage_count IS 'Number of risks currently using this impact';
