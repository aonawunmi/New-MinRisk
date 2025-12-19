-- ================================================================
-- FIX: Risk Appetite RLS Policies (SAFE - drops all policies first)
-- ================================================================
-- Issue: INSERT operations failing due to missing WITH CHECK clause
-- ================================================================

-- Drop ALL existing policies on these tables (safe - will recreate them)
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on risk_appetite_statements
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'risk_appetite_statements'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON risk_appetite_statements', pol.policyname);
    END LOOP;

    -- Drop all policies on risk_appetite_categories
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'risk_appetite_categories'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON risk_appetite_categories', pol.policyname);
    END LOOP;

    -- Drop all policies on tolerance_metrics
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'tolerance_metrics'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tolerance_metrics', pol.policyname);
    END LOOP;
END $$;

-- Now create the correct policies with both USING and WITH CHECK

-- 1. risk_appetite_statements policies
CREATE POLICY "Users can read org RAS"
ON risk_appetite_statements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Admin can manage RAS"
ON risk_appetite_statements FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

-- 2. risk_appetite_categories policies
CREATE POLICY "Users can read org appetite categories"
ON risk_appetite_categories FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Admin can manage appetite categories"
ON risk_appetite_categories FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

-- 3. tolerance_metrics policies
CREATE POLICY "Users can read org tolerance metrics"
ON tolerance_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "CRO_Admin can manage tolerance metrics"
ON tolerance_metrics FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cro')
  )
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies recreated successfully';
  RAISE NOTICE '   - All users can read their org data';
  RAISE NOTICE '   - Admin/CRO can create/update/delete';
END $$;
