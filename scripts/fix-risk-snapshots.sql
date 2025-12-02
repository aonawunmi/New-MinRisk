-- Fix risk_snapshots table
-- Drop the old version and recreate with correct structure

-- Drop existing table and all dependencies
DROP TABLE IF EXISTS risk_snapshots CASCADE;

-- Recreate with correct structure
CREATE TABLE risk_snapshots (
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

-- Create indexes
CREATE INDEX idx_risk_snapshots_org ON risk_snapshots(organization_id);
CREATE INDEX idx_risk_snapshots_period ON risk_snapshots(period);
CREATE INDEX idx_risk_snapshots_date ON risk_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE risk_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view snapshots in their org"
  ON risk_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can commit period snapshots"
  ON risk_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete snapshots"
  ON risk_snapshots
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Helper functions
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

CREATE OR REPLACE FUNCTION generate_period_options()
RETURNS TABLE(period TEXT, label TEXT) AS $$
BEGIN
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

SELECT '✅ risk_snapshots table fixed and ready!' as status;
