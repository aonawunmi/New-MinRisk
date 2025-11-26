-- Migration: Create Root Cause Register
-- Description: Create table for curated root causes in Event + Root Cause + Impact model
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create root_cause_register table
CREATE TABLE IF NOT EXISTS root_cause_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cause_code VARCHAR(20) NOT NULL,
  cause_name VARCHAR(200) NOT NULL,
  cause_description TEXT,
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
  CONSTRAINT unique_org_cause_code UNIQUE(organization_id, cause_code)
);

-- Create indexes for performance
CREATE INDEX idx_root_cause_org ON root_cause_register(organization_id);
CREATE INDEX idx_root_cause_status ON root_cause_register(status);
CREATE INDEX idx_root_cause_category ON root_cause_register(category);
CREATE INDEX idx_root_cause_name ON root_cause_register(cause_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_root_cause_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER root_cause_updated_at
  BEFORE UPDATE ON root_cause_register
  FOR EACH ROW
  EXECUTE FUNCTION update_root_cause_timestamp();

-- Row Level Security (RLS)
ALTER TABLE root_cause_register ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view root causes from their organization
CREATE POLICY root_cause_view_policy ON root_cause_register
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can suggest new root causes (creates with 'pending' status)
CREATE POLICY root_cause_suggest_policy ON root_cause_register
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND status = 'pending'
    AND created_by = auth.uid()
  );

-- Policy: Only admins can approve/update root causes
CREATE POLICY root_cause_admin_update_policy ON root_cause_register
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete root causes (soft delete by marking deprecated)
CREATE POLICY root_cause_admin_delete_policy ON root_cause_register
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE root_cause_register IS 'Curated library of root causes for the Event + Root Cause + Impact risk model';
COMMENT ON COLUMN root_cause_register.cause_code IS 'Unique code for the root cause (e.g., RC-001)';
COMMENT ON COLUMN root_cause_register.cause_name IS 'Short name of the root cause (e.g., Poor capacity planning)';
COMMENT ON COLUMN root_cause_register.status IS 'Status: active (approved and in use), pending (awaiting admin approval), deprecated (no longer in use)';
COMMENT ON COLUMN root_cause_register.usage_count IS 'Number of risks currently using this root cause';
