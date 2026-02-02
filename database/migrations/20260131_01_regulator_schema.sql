-- Migration: 20260131_01_regulator_schema.sql
-- Purpose: Create regulator schema for Supervisory Early Warning System
-- Date: 2026-01-31
-- Status: PENDING STAGING TEST

-- ==============================================
-- PART 1: REGULATORS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS regulators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9_-]+$'),
  name TEXT NOT NULL,
  jurisdiction TEXT,
  alert_thresholds JSONB DEFAULT '{"liquidity": 20, "market": 25, "operational": 15, "credit": 20, "legal": 20, "strategic": 20, "esg": 20}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_regulators_code ON regulators(code);

-- Insert default regulators for Nigeria
INSERT INTO regulators (code, name, jurisdiction, alert_thresholds) VALUES
  ('CBN', 'Central Bank of Nigeria', 'Banking & Finance', '{"liquidity": 20, "market": 25, "operational": 15, "credit": 20, "legal": 20, "strategic": 20, "esg": 20}'::jsonb),
  ('SEC', 'Securities and Exchange Commission', 'Capital Markets', '{"liquidity": 20, "market": 25, "operational": 15, "credit": 20, "legal": 20, "strategic": 20, "esg": 20}'::jsonb),
  ('PENCOM', 'National Pension Commission', 'Pension Funds', '{"liquidity": 20, "market": 25, "operational": 15, "credit": 20, "legal": 20, "strategic": 20, "esg": 20}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ==============================================
-- PART 2: EXTEND ORGANIZATIONS TABLE
-- ==============================================

-- Add regulator-related columns to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS institution_type TEXT,
  ADD COLUMN IF NOT EXISTS primary_regulator_id UUID REFERENCES regulators(id) ON DELETE SET NULL;

-- Index for regulator queries
CREATE INDEX IF NOT EXISTS idx_organizations_primary_regulator ON organizations(primary_regulator_id);

-- ==============================================
-- PART 3: ORGANIZATION-REGULATOR RELATIONSHIPS
-- ==============================================

CREATE TABLE IF NOT EXISTS organization_regulators (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, regulator_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_regulators_org ON organization_regulators(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_regulators_reg ON organization_regulators(regulator_id);
CREATE INDEX IF NOT EXISTS idx_org_regulators_primary ON organization_regulators(regulator_id, is_primary) WHERE is_primary = TRUE;

-- ==============================================
-- PART 4: ADD 'regulator' ROLE TO USER_PROFILES
-- ==============================================

-- Check if user_role type exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('super_admin', 'primary_admin', 'secondary_admin', 'user');
  END IF;
END $$;

-- Add 'regulator' to user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'regulator'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'regulator';
  END IF;
END $$;

-- ==============================================
-- PART 5: REGULATOR ACCESS TABLE
-- ==============================================

-- Track which regulators each regulator user can access
CREATE TABLE IF NOT EXISTS regulator_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  regulator_id UUID NOT NULL REFERENCES regulators(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, regulator_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_regulator_access_user ON regulator_access(user_id);
CREATE INDEX IF NOT EXISTS idx_regulator_access_regulator ON regulator_access(regulator_id);

-- ==============================================
-- PART 6: REGULATOR RISK SUMMARY VIEW
-- ==============================================

-- Drop existing view/materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS regulator_risk_summary CASCADE;
DROP VIEW IF EXISTS regulator_risk_summary CASCADE;

-- Create materialized view for regulator dashboard (performance optimization)
CREATE MATERIALIZED VIEW regulator_risk_summary AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.institution_type,
  r.category AS risk_category,
  COUNT(r.id) AS risk_count,
  AVG(r.likelihood_inherent * r.impact_inherent) AS avg_inherent_score,
  AVG(r.residual_score) AS avg_residual_score,
  SUM(CASE WHEN r.residual_score >= 16 THEN 1 ELSE 0 END) AS critical_risks,
  SUM(CASE WHEN r.residual_score >= 12 AND r.residual_score < 16 THEN 1 ELSE 0 END) AS high_risks,
  SUM(CASE WHEN r.residual_score >= 6 AND r.residual_score < 12 THEN 1 ELSE 0 END) AS medium_risks,
  SUM(CASE WHEN r.residual_score < 6 THEN 1 ELSE 0 END) AS low_risks,
  NOW() AS last_updated
FROM risks r
JOIN organizations o ON r.organization_id = o.id
WHERE r.status IN ('OPEN')
GROUP BY o.id, o.name, o.institution_type, r.category;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_risk_summary_unique
  ON regulator_risk_summary(organization_id, COALESCE(risk_category, ''));

-- Indexes on materialized view for performance
CREATE INDEX IF NOT EXISTS idx_reg_risk_summary_org ON regulator_risk_summary(organization_id);
CREATE INDEX IF NOT EXISTS idx_reg_risk_summary_category ON regulator_risk_summary(risk_category);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_regulator_risk_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY regulator_risk_summary;
END;
$$;

-- ==============================================
-- PART 7: RLS POLICIES FOR REGULATORS
-- ==============================================

-- Enable RLS on regulators table
ALTER TABLE regulators ENABLE ROW LEVEL SECURITY;

-- Regulators: Super admins can manage, regulators can view their own
DROP POLICY IF EXISTS regulators_super_admin_all ON regulators;
CREATE POLICY regulators_super_admin_all ON regulators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS regulators_view_own ON regulators;
CREATE POLICY regulators_view_own ON regulators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid() AND ra.regulator_id = regulators.id
    )
  );

-- Enable RLS on regulator_access table
ALTER TABLE regulator_access ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all access
DROP POLICY IF EXISTS regulator_access_super_admin ON regulator_access;
CREATE POLICY regulator_access_super_admin ON regulator_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Regulators can view their own access
DROP POLICY IF EXISTS regulator_access_view_own ON regulator_access;
CREATE POLICY regulator_access_view_own ON regulator_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Enable RLS on organization_regulators table
ALTER TABLE organization_regulators ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all
DROP POLICY IF EXISTS org_regulators_super_admin ON organization_regulators;
CREATE POLICY org_regulators_super_admin ON organization_regulators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Regulators can view organizations they're assigned to
DROP POLICY IF EXISTS org_regulators_view_assigned ON organization_regulators;
CREATE POLICY org_regulators_view_assigned ON organization_regulators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM regulator_access ra
      WHERE ra.user_id = auth.uid() AND ra.regulator_id = organization_regulators.regulator_id
    )
  );

-- Primary admins can view their organization's regulators
DROP POLICY IF EXISTS org_regulators_view_own_org ON organization_regulators;
CREATE POLICY org_regulators_view_own_org ON organization_regulators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.organization_id = organization_regulators.organization_id
        AND up.role IN ('primary_admin', 'secondary_admin')
    )
  );

-- ==============================================
-- PART 8: HELPER FUNCTIONS
-- ==============================================

-- Function to get organizations for a regulator user
CREATE OR REPLACE FUNCTION get_regulator_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  institution_type TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    o.id,
    o.name,
    o.institution_type,
    oreg.is_primary
  FROM organizations o
  JOIN organization_regulators oreg ON o.id = oreg.organization_id
  JOIN regulator_access ra ON oreg.regulator_id = ra.regulator_id
  WHERE ra.user_id = p_user_id;
END;
$$;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- Add migration tracking
INSERT INTO _migrations (name, executed_at)
VALUES ('20260131_01_regulator_schema', NOW())
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE regulators IS 'Regulatory bodies overseeing financial institutions';
COMMENT ON TABLE organization_regulators IS 'Many-to-many relationship between organizations and their regulators';
COMMENT ON TABLE regulator_access IS 'Tracks which regulator users can access which regulatory bodies';
COMMENT ON MATERIALIZED VIEW regulator_risk_summary IS 'Pre-aggregated risk data for regulator dashboards (refreshed hourly)';
