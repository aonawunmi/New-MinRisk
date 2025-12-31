-- ================================================================
-- FIX: Risk Appetite RLS Policies (CORRECT ROLES)
-- ================================================================
-- Valid roles: super_admin, primary_admin, secondary_admin, user
-- ================================================================

-- Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'risk_appetite_statements'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON risk_appetite_statements', pol.policyname);
    END LOOP;

    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'risk_appetite_categories'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON risk_appetite_categories', pol.policyname);
    END LOOP;

    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tolerance_metrics'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tolerance_metrics', pol.policyname);
    END LOOP;
END $$;

-- Create policies with CORRECT ROLES

-- 1. risk_appetite_statements
CREATE POLICY "Users can read org RAS"
ON risk_appetite_statements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage RAS"
ON risk_appetite_statements FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
  )
);

-- 2. risk_appetite_categories
CREATE POLICY "Users can read org appetite categories"
ON risk_appetite_categories FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage appetite categories"
ON risk_appetite_categories FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
  )
);

-- 3. tolerance_metrics
CREATE POLICY "Users can read org tolerance metrics"
ON tolerance_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage tolerance metrics"
ON tolerance_metrics FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
  )
);

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed with CORRECT roles';
  RAISE NOTICE '   - Allowed: super_admin, primary_admin, secondary_admin';
END $$;
