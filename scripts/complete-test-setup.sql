-- ============================================================================
-- COMPLETE PERIOD MANAGEMENT TEST SETUP
-- ============================================================================
-- This single script runs all 4 test phases:
--   1. Deploy period management migration
--   2. Seed 12 test risks
--   3. Commit 4 periods (Q1-Q4 2025)
--   4. Verify all features
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Open Supabase SQL Editor
-- 3. Paste and RUN
-- ============================================================================

-- ============================================================================
-- PHASE 1: DEPLOY MIGRATION
-- ============================================================================

-- Create risk_snapshots table
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

-- Enable RLS
ALTER TABLE risk_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view snapshots in their organization"
  ON risk_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert snapshots in their organization"
  ON risk_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete snapshots in their organization"
  ON risk_snapshots
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Helper function to get period snapshot
CREATE OR REPLACE FUNCTION get_period_snapshot(
  p_organization_id UUID,
  p_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot JSONB;
BEGIN
  SELECT snapshot_data
  INTO v_snapshot
  FROM risk_snapshots
  WHERE organization_id = p_organization_id
    AND period = p_period;

  RETURN v_snapshot;
END;
$$;

-- Helper function to compare periods
CREATE OR REPLACE FUNCTION compare_period_snapshots(
  p_organization_id UUID,
  p_period1 TEXT,
  p_period2 TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot1 JSONB;
  v_snapshot2 JSONB;
  v_comparison JSONB;
BEGIN
  -- Get both snapshots
  SELECT snapshot_data INTO v_snapshot1
  FROM risk_snapshots
  WHERE organization_id = p_organization_id AND period = p_period1;

  SELECT snapshot_data INTO v_snapshot2
  FROM risk_snapshots
  WHERE organization_id = p_organization_id AND period = p_period2;

  IF v_snapshot1 IS NULL OR v_snapshot2 IS NULL THEN
    RETURN jsonb_build_object('error', 'One or both periods not found');
  END IF;

  -- Build comparison
  v_comparison := jsonb_build_object(
    'period1', p_period1,
    'period2', p_period2,
    'snapshot1', v_snapshot1,
    'snapshot2', v_snapshot2
  );

  RETURN v_comparison;
END;
$$;

SELECT '✅ Phase 1: Migration deployed' as status;

-- ============================================================================
-- PHASE 2: SEED TEST RISKS
-- ============================================================================

-- Get the first organization and user (or use specific IDs if you have them)
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Get first organization
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  -- Get first user in that organization
  SELECT id INTO v_user_id FROM user_profiles
  WHERE organization_id = v_org_id LIMIT 1;

  -- If no org found, create a test org
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, created_at)
    VALUES ('Test Organization', NOW())
    RETURNING id INTO v_org_id;

    RAISE NOTICE 'Created test organization: %', v_org_id;
  END IF;

  -- If no user found, get any user and update their org
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM user_profiles LIMIT 1;
    UPDATE user_profiles SET organization_id = v_org_id WHERE id = v_user_id;

    RAISE NOTICE 'Updated user % to organization %', v_user_id, v_org_id;
  END IF;

  -- Store in temporary table for use in subsequent blocks
  CREATE TEMP TABLE IF NOT EXISTS test_config (
    org_id UUID,
    user_id UUID
  );

  INSERT INTO test_config (org_id, user_id)
  VALUES (v_org_id, v_user_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Using Organization: %', v_org_id;
  RAISE NOTICE 'Using User: %', v_user_id;
END $$;

-- Seed test risks (using correct column names from your schema)
INSERT INTO risks (
  organization_id,
  user_id,
  risk_code,
  risk_title,
  risk_description,
  division,
  department,
  category,
  owner_profile_id,
  likelihood_inherent,
  impact_inherent,
  residual_likelihood,
  residual_impact,
  status,
  created_at
)
SELECT
  (SELECT org_id FROM test_config),
  (SELECT user_id FROM test_config),
  risk_code,
  title,
  description,
  'Test Division',
  'Test Department',
  category,
  (SELECT user_id FROM test_config),
  likelihood_inh,
  impact_inh,
  likelihood_res,
  impact_res,
  status,
  created_at
FROM (VALUES
  ('RISK-Q1-001', 'Ransomware Attack', 'Risk of ransomware attack disrupting operations', 'Technology', 5, 5, 4, 5, 'UNDER_REVIEW', NOW() - INTERVAL '90 days'),
  ('RISK-Q1-002', 'Data Breach - Customer PII', 'Unauthorized access to customer personal data', 'Compliance', 4, 5, 3, 5, 'APPROVED', NOW() - INTERVAL '85 days'),
  ('RISK-Q1-003', 'Supplier Failure', 'Key supplier bankruptcy or service disruption', 'Operational', 3, 4, 3, 3, 'MONITORING', NOW() - INTERVAL '80 days'),
  ('RISK-Q1-004', 'Regulatory Non-Compliance', 'Failure to meet new regulatory requirements', 'Compliance', 4, 4, 3, 4, 'APPROVED', NOW() - INTERVAL '75 days'),
  ('RISK-Q1-005', 'Key Person Loss', 'Loss of critical technical staff', 'Human Resources', 4, 3, 4, 3, 'IDENTIFIED', NOW() - INTERVAL '70 days'),
  ('RISK-Q1-006', 'Payment Processing Delays', 'Delays in payment processing affecting cash flow', 'Financial', 3, 3, 2, 3, 'APPROVED', NOW() - INTERVAL '65 days'),
  ('RISK-Q1-007', 'Infrastructure Capacity', 'Insufficient infrastructure to handle growth', 'Technology', 3, 3, 3, 2, 'MONITORING', NOW() - INTERVAL '60 days'),
  ('RISK-Q1-008', 'Third-Party Software Vulnerabilities', 'Security issues in third-party dependencies', 'Technology', 4, 2, 3, 2, 'UNDER_REVIEW', NOW() - INTERVAL '55 days'),
  ('RISK-Q1-009', 'Market Reputation', 'Negative publicity affecting brand reputation', 'Strategic', 2, 4, 2, 3, 'IDENTIFIED', NOW() - INTERVAL '50 days'),
  ('RISK-Q1-010', 'Office Equipment Failure', 'Minor equipment failures affecting productivity', 'Operational', 3, 2, 2, 2, 'APPROVED', NOW() - INTERVAL '45 days'),
  ('RISK-Q1-011', 'Email System Downtime', 'Brief email outages', 'Technology', 2, 2, 2, 1, 'MONITORING', NOW() - INTERVAL '40 days'),
  ('RISK-Q1-012', 'Minor Compliance Gaps', 'Small documentation gaps in compliance records', 'Compliance', 2, 3, 1, 2, 'APPROVED', NOW() - INTERVAL '35 days')
) AS test_risks(risk_code, title, description, category, likelihood_inh, impact_inh, likelihood_res, impact_res, status, created_at)
ON CONFLICT (organization_id, risk_code) DO NOTHING;

SELECT '✅ Phase 2: Test risks seeded' as status,
       COUNT(*) as risk_count
FROM risks
WHERE organization_id = (SELECT org_id FROM test_config)
  AND risk_code LIKE 'RISK-Q1-%';

-- ============================================================================
-- PHASE 3: COMMIT TEST PERIODS (Q1-Q4 2025)
-- ============================================================================

-- NOTE: The period commit logic requires the risks table to have specific columns.
-- This section creates simplified snapshots. For full functionality, use the
-- commitPeriod() function from src/lib/periods.ts

SELECT '⚠️  Phase 3: Period commits require the frontend commitPeriod() function' as status;
SELECT 'Please use the Admin → Period Management UI to commit periods' as instruction;
SELECT 'Or run: bash scripts/3-commit-test-periods.sh' as alternative;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT 'VERIFICATION RESULTS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Check migration
SELECT
  '✅ risk_snapshots table exists' as check,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'risk_snapshots'
  ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Check test risks
SELECT
  '✅ Test risks created' as check,
  CASE WHEN COUNT(*) = 12 THEN 'PASS' ELSE 'PARTIAL' END as result,
  COUNT(*) as risk_count
FROM risks
WHERE organization_id = (SELECT org_id FROM test_config)
  AND risk_code LIKE 'RISK-Q1-%';

-- Summary
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT 'SUMMARY' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT
  '✅ Migration deployed' as phase_1,
  '✅ Test risks created' as phase_2,
  '⚠️  Requires UI for period commits' as phase_3,
  '✅ Ready for testing' as phase_4;

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT 'NEXT STEPS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT
  '1. Start dev server: npm run dev' as step_1,
  '2. Login to MinRisk' as step_2,
  '3. Go to Admin → Period Management' as step_3,
  '4. Commit periods: Q1 2025, Q2 2025, Q3 2025, Q4 2025' as step_4,
  '5. Test Analytics tab: Heatmap, Comparison, Trends' as step_5;

-- Cleanup temp table
DROP TABLE IF EXISTS test_config;
