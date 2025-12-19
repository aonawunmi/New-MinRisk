-- ================================================================
-- FIX: Risk Appetite RLS Policies
-- ================================================================
-- Issue: INSERT operations failing due to missing WITH CHECK clause
-- ================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "CRO_Admin can edit RAS" ON risk_appetite_statements;

-- Recreate with proper INSERT support
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

-- Also verify appetite_categories policy
DROP POLICY IF EXISTS "CRO_Admin can manage appetite categories" ON risk_appetite_categories;

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

-- Verify tolerance_metrics policy
DROP POLICY IF EXISTS "CRO_Risk can manage tolerance metrics" ON tolerance_metrics;

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
  RAISE NOTICE '✅ RLS policies fixed - INSERT operations now allowed for admin/cro';
END $$;
