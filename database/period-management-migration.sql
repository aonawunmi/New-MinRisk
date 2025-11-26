/**
 * Period Management Migration
 *
 * Adds period management functionality to MinRisk:
 * - Active period tracking in risk_configs
 * - Period history snapshots table
 *
 * Date: 2025-11-21
 */

-- ============================================================================
-- STEP 1: Add active_period to risk_configs
-- ============================================================================

-- Add active_period column to risk_configs table
ALTER TABLE risk_configs
ADD COLUMN IF NOT EXISTS active_period TEXT DEFAULT 'Q1 2025';

COMMENT ON COLUMN risk_configs.active_period IS 'Current active period for risk register (e.g., Q1 2025, Q2 2025, Q3 2025, Q4 2025, FY 2025)';

-- ============================================================================
-- STEP 2: Create risk_snapshots table for period commits
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_by_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  risk_count INTEGER NOT NULL DEFAULT 0,
  snapshot_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_period_snapshot UNIQUE(organization_id, period)
);

COMMENT ON TABLE risk_snapshots IS 'Historical snapshots of risk register at period commit time';
COMMENT ON COLUMN risk_snapshots.period IS 'Period identifier (e.g., Q1 2025)';
COMMENT ON COLUMN risk_snapshots.snapshot_data IS 'Complete JSON snapshot of all risks and controls at commit time';
COMMENT ON COLUMN risk_snapshots.risk_count IS 'Total number of risks in this snapshot';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_org ON risk_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_period ON risk_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_date ON risk_snapshots(snapshot_date);

-- ============================================================================
-- STEP 3: Enable Row-Level Security on risk_snapshots
-- ============================================================================

ALTER TABLE risk_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see snapshots from their organization
CREATE POLICY risk_snapshots_select_policy ON risk_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can insert snapshots (commit periods)
CREATE POLICY risk_snapshots_insert_policy ON risk_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: No updates to committed snapshots (immutable)
-- Intentionally no UPDATE policy

-- Policy: Only admins can delete snapshots
CREATE POLICY risk_snapshots_delete_policy ON risk_snapshots
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 4: Add helper function to get active period
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_period(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  active_period_value TEXT;
BEGIN
  SELECT active_period INTO active_period_value
  FROM risk_configs
  WHERE organization_id = org_id;

  RETURN COALESCE(active_period_value, 'Q1 2025');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_period IS 'Returns the active period for an organization';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification queries (run after migration)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'risk_configs' AND column_name = 'active_period';
-- SELECT COUNT(*) FROM risk_snapshots;
