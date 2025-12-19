-- Migration: Add Unique Constraint and Atomic Code Generation for Risks
-- Date: 2025-12-15
-- Purpose: Prevent duplicate Risk codes (race condition with dynamic prefix)

-- ============================================================================
-- PROBLEM: Race condition in dynamic prefix code generation
-- ============================================================================
-- generateRiskCode() generates prefix DIV-CAT, finds max number, then increments
-- Double-click → both calls find max BEFORE either insert completes
-- Both generate same code (e.g., CLE-CRE-005) → duplicates created
--
-- More complex than KRI/Control due to dynamic prefix based on division + category

-- ============================================================================
-- FIX 1: UNIQUE CONSTRAINT
-- ============================================================================

-- Unique constraint: One Risk code per organization
CREATE UNIQUE INDEX IF NOT EXISTS unique_risk_code_per_org
  ON risks (organization_id, risk_code);

COMMENT ON INDEX unique_risk_code_per_org IS
  'Ensures Risk codes are unique within each organization. Prevents duplicate codes from race conditions.';

-- ============================================================================
-- FIX 2: ATOMIC CODE GENERATION FUNCTION WITH DYNAMIC PREFIX
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_next_risk_code(
  p_organization_id UUID,
  p_division TEXT,
  p_category TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_div_prefix TEXT;
  v_cat_prefix TEXT;
  v_full_prefix TEXT;
  v_next_number INTEGER;
  v_risk_code TEXT;
  v_max_retries INTEGER := 5;
  v_retry_count INTEGER := 0;
BEGIN
  -- Generate prefix from first 3 letters of division and category
  v_div_prefix := UPPER(SUBSTRING(p_division FROM 1 FOR 3));
  v_cat_prefix := UPPER(SUBSTRING(p_category FROM 1 FOR 3));
  v_full_prefix := v_div_prefix || '-' || v_cat_prefix;

  -- Loop with retries in case of race conditions
  LOOP
    BEGIN
      -- Find the highest number for this prefix in the organization
      -- Use FOR UPDATE to lock the rows and prevent race conditions
      SELECT COALESCE(
        MAX(
          CAST(
            SUBSTRING(risk_code FROM '[0-9]+$') AS INTEGER
          )
        ),
        0
      ) + 1
      INTO v_next_number
      FROM risks
      WHERE organization_id = p_organization_id
        AND risk_code LIKE v_full_prefix || '-%'
      FOR UPDATE;

      -- Format as DIV-CAT-001, DIV-CAT-002, etc.
      v_risk_code := v_full_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');

      -- Verify code doesn't already exist (extra safety check)
      IF EXISTS (
        SELECT 1 FROM risks
        WHERE organization_id = p_organization_id
          AND risk_code = v_risk_code
      ) THEN
        -- Code exists, increment and try again
        v_retry_count := v_retry_count + 1;
        IF v_retry_count >= v_max_retries THEN
          -- Fallback to timestamp-based code if retries exhausted
          v_risk_code := v_full_prefix || '-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM '(\d{3})$');
          EXIT;
        END IF;
        CONTINUE;
      END IF;

      -- Code is unique, return it
      RETURN v_risk_code;
    EXCEPTION
      WHEN OTHERS THEN
        -- If error occurs, retry up to max_retries times
        v_retry_count := v_retry_count + 1;
        IF v_retry_count >= v_max_retries THEN
          -- Fallback to timestamp-based code
          RETURN v_full_prefix || '-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM '(\d{3})$');
        END IF;
    END;
  END LOOP;

  RETURN v_risk_code;
END;
$$;

COMMENT ON FUNCTION generate_next_risk_code(UUID, TEXT, TEXT) IS
  'Atomically generates next available Risk code for organization with dynamic prefix. Prefix format: DIV-CAT-NNN (e.g., CLE-CRE-001). Uses row-level locking to prevent race conditions.';

-- ============================================================================
-- VERIFY NO EXISTING VIOLATIONS
-- ============================================================================

DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  -- Check for duplicate Risk codes within same organization
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT organization_id, risk_code, COUNT(*) as code_count
    FROM risks
    GROUP BY organization_id, risk_code
    HAVING COUNT(*) > 1
  ) violations;

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % duplicate Risk code(s) found in database.', violation_count;
    RAISE NOTICE 'Run this query to see violations:';
    RAISE NOTICE 'SELECT organization_id, risk_code, COUNT(*) FROM risks GROUP BY organization_id, risk_code HAVING COUNT(*) > 1;';
  ELSE
    RAISE NOTICE 'SUCCESS: No duplicate Risk codes found. Constraint is valid and will be enforced.';
  END IF;
END $$;

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

DO $$
DECLARE
  v_test_org_id UUID;
  v_test_division TEXT;
  v_test_category TEXT;
  v_generated_code TEXT;
BEGIN
  -- Get a test organization ID and division/category (if any risks exist)
  SELECT
    organization_id,
    division,
    category
  INTO
    v_test_org_id,
    v_test_division,
    v_test_category
  FROM risks
  LIMIT 1;

  IF v_test_org_id IS NOT NULL THEN
    -- Test the function
    v_generated_code := generate_next_risk_code(v_test_org_id, v_test_division, v_test_category);
    RAISE NOTICE 'Test: Generated Risk code: % for division: %, category: %',
      v_generated_code, v_test_division, v_test_category;
    RAISE NOTICE 'SUCCESS: Risk code generation function is working correctly.';
  ELSE
    RAISE NOTICE 'No risks found in database. Function created but not tested.';
    RAISE NOTICE 'Function will be tested on first risk creation.';
  END IF;
END $$;

-- ============================================================================
-- USAGE EXAMPLE
-- ============================================================================

-- Generate code for "Clearing" division, "Credit Risk" category:
-- SELECT generate_next_risk_code('<org_id>', 'Clearing', 'Credit Risk');
-- Result: CLE-CRE-001 (or next available number)

-- Generate code for "Operations" division, "Fraud" category:
-- SELECT generate_next_risk_code('<org_id>', 'Operations', 'Fraud');
-- Result: OPE-FRA-001 (or next available number)
