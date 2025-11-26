/**
 * Create risk_configs Table
 *
 * This table stores organization-wide risk management configuration settings.
 * Each organization has exactly one risk_configs record.
 *
 * Date: 2025-11-21
 */

-- ============================================================================
-- Create risk_configs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Risk Matrix Configuration
  matrix_size INTEGER DEFAULT 5 CHECK (matrix_size IN (5, 6)),

  -- Risk Appetite & Tolerance (optional future use)
  risk_appetite_statement TEXT,
  risk_tolerance_level TEXT,

  -- Period Management
  active_period TEXT DEFAULT 'Q1 2025',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE risk_configs IS 'Organization-wide risk management configuration settings';
COMMENT ON COLUMN risk_configs.organization_id IS 'Each organization has exactly one risk config record';
COMMENT ON COLUMN risk_configs.matrix_size IS 'Risk matrix dimensions: 5×5 or 6×6';
COMMENT ON COLUMN risk_configs.active_period IS 'Current active period for risk register (e.g., Q1 2025, Q2 2025)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_risk_configs_org ON risk_configs(organization_id);

-- ============================================================================
-- Enable Row-Level Security
-- ============================================================================

ALTER TABLE risk_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's config
CREATE POLICY risk_configs_select_policy ON risk_configs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can update config
CREATE POLICY risk_configs_update_policy ON risk_configs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can insert config (automatic on org creation)
CREATE POLICY risk_configs_insert_policy ON risk_configs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_risk_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER risk_configs_updated_at
  BEFORE UPDATE ON risk_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_configs_updated_at();

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification query (run after migration)
-- SELECT * FROM risk_configs;
