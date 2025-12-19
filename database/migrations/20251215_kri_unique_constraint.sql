-- Migration: Add Unique Constraint to KRI Definitions
-- Date: 2025-12-15
-- Purpose: Prevent duplicate KRI codes within same organization (fixes race condition bug)

-- ============================================================================
-- PROBLEM ANALYSIS
-- ============================================================================
-- Race Condition in generateKRICode():
-- 1. User double-clicks "Create KRI"
-- 2. Both calls count existing KRIs BEFORE either insert completes
-- 3. Both generate same code (e.g., KRI-006)
-- 4. Both insert successfully → duplicate KRIs created
--
-- Solution: Unique constraint at database level prevents duplicates even during race conditions

-- ============================================================================
-- ADD UNIQUE CONSTRAINT
-- ============================================================================

-- Unique constraint: One KRI code per organization
-- Allows different orgs to have same codes (KRI-001, KRI-002, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS unique_kri_code_per_org
  ON kri_definitions (organization_id, kri_code);

COMMENT ON INDEX unique_kri_code_per_org IS
  'Ensures KRI codes are unique within each organization. Prevents duplicate codes from race conditions during rapid creation.';

-- ============================================================================
-- VERIFY NO EXISTING VIOLATIONS
-- ============================================================================

DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  -- Check for duplicate KRI codes within same organization
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT organization_id, kri_code, COUNT(*) as code_count
    FROM kri_definitions
    GROUP BY organization_id, kri_code
    HAVING COUNT(*) > 1
  ) violations;

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % duplicate KRI code(s) found in database.', violation_count;
    RAISE NOTICE 'Run this query to see violations:';
    RAISE NOTICE 'SELECT organization_id, kri_code, COUNT(*) as count FROM kri_definitions GROUP BY organization_id, kri_code HAVING COUNT(*) > 1;';
    RAISE NOTICE '';
    RAISE NOTICE 'Fix violations before constraint will apply. Example fix:';
    RAISE NOTICE 'UPDATE kri_definitions SET kri_code = ''KRI-999'' WHERE id = ''<duplicate-kri-id>'';';
  ELSE
    RAISE NOTICE 'SUCCESS: No duplicate KRI codes found. Constraint is valid and will be enforced.';
  END IF;
END $$;

-- ============================================================================
-- OPTIONAL: Add KRI name uniqueness (commented out - may not be desired)
-- ============================================================================
--
-- Some organizations may want KRI names to be unique within the org
-- Uncomment if desired:
--
-- CREATE UNIQUE INDEX IF NOT EXISTS unique_kri_name_per_org
--   ON kri_definitions (organization_id, LOWER(kri_name));
--
-- COMMENT ON INDEX unique_kri_name_per_org IS
--   'Ensures KRI names are unique within each organization (case-insensitive).';
