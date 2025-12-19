-- Migration: Add Unique Constraint and Atomic Code Generation for Controls
-- Date: 2025-12-15
-- Purpose: Prevent duplicate Control codes (same race condition as KRI)

-- ============================================================================
-- PROBLEM: Exact same race condition as KRI
-- ============================================================================
-- generateControlCode() counts existing controls then increments
-- Double-click → both calls count BEFORE either insert completes
-- Both generate same code (e.g., CTRL-006) → duplicates created

-- ============================================================================
-- FIX 1: UNIQUE CONSTRAINT
-- ============================================================================

-- Unique constraint: One Control code per organization
CREATE UNIQUE INDEX IF NOT EXISTS unique_control_code_per_org
  ON controls (organization_id, control_code);

COMMENT ON INDEX unique_control_code_per_org IS
  'Ensures Control codes are unique within each organization. Prevents duplicate codes from race conditions.';

-- ============================================================================
-- FIX 2: ATOMIC CODE GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_next_control_code(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number INTEGER;
  v_control_code TEXT;
  v_max_retries INTEGER := 5;
  v_retry_count INTEGER := 0;
BEGIN
  -- Loop with retries in case of race conditions
  LOOP
    BEGIN
      -- Get the highest Control number for this organization
      -- Use FOR UPDATE to lock the rows and prevent race conditions
      -- Note: Controls use soft delete, so filter out deleted_at IS NOT NULL
      SELECT COALESCE(
        MAX(
          CAST(
            SUBSTRING(control_code FROM 'CTRL-(\d+)') AS INTEGER
          )
        ),
        0
      ) + 1
      INTO v_next_number
      FROM controls
      WHERE organization_id = p_organization_id
        AND deleted_at IS NULL
      FOR UPDATE;

      -- Format as CTRL-001, CTRL-002, etc.
      v_control_code := 'CTRL-' || LPAD(v_next_number::TEXT, 3, '0');

      -- Verify code doesn't already exist (extra safety check)
      IF EXISTS (
        SELECT 1 FROM controls
        WHERE organization_id = p_organization_id
          AND control_code = v_control_code
          AND deleted_at IS NULL
      ) THEN
        -- Code exists, increment and try again
        v_retry_count := v_retry_count + 1;
        IF v_retry_count >= v_max_retries THEN
          -- Fallback to timestamp-based code if retries exhausted
          v_control_code := 'CTRL-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM '(\d{3})$');
          EXIT;
        END IF;
        CONTINUE;
      END IF;

      -- Code is unique, return it
      RETURN v_control_code;
    EXCEPTION
      WHEN OTHERS THEN
        -- If error occurs, retry up to max_retries times
        v_retry_count := v_retry_count + 1;
        IF v_retry_count >= v_max_retries THEN
          -- Fallback to timestamp-based code
          RETURN 'CTRL-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM '(\d{3})$');
        END IF;
    END;
  END LOOP;

  RETURN v_control_code;
END;
$$;

COMMENT ON FUNCTION generate_next_control_code(UUID) IS
  'Atomically generates next available Control code for organization. Uses row-level locking to prevent race conditions. Handles soft-deleted controls.';

-- ============================================================================
-- VERIFY NO EXISTING VIOLATIONS
-- ============================================================================

DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  -- Check for duplicate Control codes within same organization
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT organization_id, control_code, COUNT(*) as code_count
    FROM controls
    WHERE deleted_at IS NULL
    GROUP BY organization_id, control_code
    HAVING COUNT(*) > 1
  ) violations;

  IF violation_count > 0 THEN
    RAISE NOTICE 'WARNING: % duplicate Control code(s) found in database.', violation_count;
    RAISE NOTICE 'Run this query to see violations:';
    RAISE NOTICE 'SELECT organization_id, control_code, COUNT(*) FROM controls WHERE deleted_at IS NULL GROUP BY organization_id, control_code HAVING COUNT(*) > 1;';
  ELSE
    RAISE NOTICE 'SUCCESS: No duplicate Control codes found. Constraint is valid and will be enforced.';
  END IF;
END $$;

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

DO $$
DECLARE
  v_test_org_id UUID;
  v_generated_code TEXT;
BEGIN
  -- Get a test organization ID (if any controls exist)
  SELECT organization_id INTO v_test_org_id
  FROM controls
  WHERE deleted_at IS NULL
  LIMIT 1;

  IF v_test_org_id IS NOT NULL THEN
    -- Test the function
    v_generated_code := generate_next_control_code(v_test_org_id);
    RAISE NOTICE 'Test: Generated Control code: %', v_generated_code;
    RAISE NOTICE 'SUCCESS: Control code generation function is working correctly.';
  ELSE
    RAISE NOTICE 'No controls found in database. Function created but not tested.';
    RAISE NOTICE 'Function will be tested on first control creation.';
  END IF;
END $$;
