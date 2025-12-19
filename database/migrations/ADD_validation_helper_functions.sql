-- ================================================================
-- ADD VALIDATION HELPER FUNCTIONS
-- ================================================================
-- Adds RPC functions used by appetite validation logic
-- ================================================================

-- Helper function: Get risk categories without appetite definition
CREATE OR REPLACE FUNCTION get_risk_categories_without_appetite(org_id UUID)
RETURNS TABLE (category TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT r.category::TEXT
  FROM risks r
  WHERE r.organization_id = org_id
    AND r.is_active = true
    AND r.category IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM risk_appetite_categories rac
      WHERE rac.organization_id = org_id
        AND rac.risk_category = r.category
    );
END;
$$;

COMMENT ON FUNCTION get_risk_categories_without_appetite IS
'Returns list of risk categories that exist in the risk register but have no appetite level defined';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Validation helper functions created successfully';
END $$;
