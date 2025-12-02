-- ============================================================================
-- FIX: Period Commits RLS Policy
-- ============================================================================
-- Issue: Original policy only allowed role = 'admin', but should allow
--        'primary_admin' and 'admin' roles to commit periods.
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert period commits" ON period_commits;
DROP POLICY IF EXISTS "Admins can update their org active period" ON active_period;
DROP POLICY IF EXISTS "Admins can insert their org active period" ON active_period;

-- ============================================================================
-- PERIOD_COMMITS: Allow primary_admin and admin to insert
-- ============================================================================

CREATE POLICY "Admins can insert period commits"
  ON period_commits FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('primary_admin', 'admin')
  ));

-- ============================================================================
-- ACTIVE_PERIOD: Allow primary_admin and admin to update/insert
-- ============================================================================

CREATE POLICY "Admins can update their org active period"
  ON active_period FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('primary_admin', 'admin')
  ));

CREATE POLICY "Admins can insert their org active period"
  ON active_period FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('primary_admin', 'admin')
  ));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed for period_commits and active_period';
  RAISE NOTICE 'Allowed roles: primary_admin, admin';
END $$;
