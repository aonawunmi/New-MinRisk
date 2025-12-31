/**
 * Period Management Migration
 *
 * Adds period history snapshots functionality to MinRisk.
 * This enables organizations to commit end-of-period snapshots
 * and view historical risk data for trend analysis.
 *
 * Date: 2025-12-01
 */

-- ============================================================================
-- STEP 1: Create risk_snapshots table for period commits
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  risk_count INTEGER NOT NULL DEFAULT 0,
  snapshot_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_period_snapshot UNIQUE(organization_id, period)
);

COMMENT ON TABLE risk_snapshots IS 'Historical snapshots of risk register at period commit time';
COMMENT ON COLUMN risk_snapshots.period IS 'Period identifier (e.g., Q1 2025, Q2 2025)';
COMMENT ON COLUMN risk_snapshots.snapshot_data IS 'Complete JSON snapshot of all risks and controls at commit time';
COMMENT ON COLUMN risk_snapshots.risk_count IS 'Total number of risks in this snapshot';
COMMENT ON COLUMN risk_snapshots.committed_by IS 'User who committed the period';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_org ON risk_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_period ON risk_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_date ON risk_snapshots(snapshot_date DESC);

-- ============================================================================
-- STEP 2: Enable Row-Level Security on risk_snapshots
-- ============================================================================

ALTER TABLE risk_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see snapshots from their organization
CREATE POLICY "Users can view snapshots in their org" ON risk_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can insert snapshots (commit periods)
CREATE POLICY "Admins can commit period snapshots" ON risk_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  );

-- Policy: No updates to committed snapshots (immutable)
-- Intentionally no UPDATE policy - snapshots are immutable

-- Policy: Only admins can delete snapshots
CREATE POLICY "Admins can delete snapshots" ON risk_snapshots
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  );

-- ============================================================================
-- STEP 3: Add helper function to get active period
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
-- STEP 4: Add function to generate period options
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_period_options()
RETURNS TABLE(period TEXT, label TEXT) AS $$
BEGIN
  -- Generate quarters for current and next year
  RETURN QUERY
  SELECT
    'Q' || q.quarter || ' ' || y.year AS period,
    'Q' || q.quarter || ' ' || y.year AS label
  FROM
    (SELECT generate_series(1, 4) AS quarter) q,
    (SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - 1,
                            EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1) AS year) y
  ORDER BY y.year DESC, q.quarter DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_period_options IS 'Generates period dropdown options (Q1-Q4 for current ±1 years)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification queries (optional - for testing after deployment)
-- SELECT COUNT(*) FROM risk_snapshots;
-- SELECT get_active_period((SELECT id FROM organizations LIMIT 1));
-- SELECT * FROM generate_period_options();
