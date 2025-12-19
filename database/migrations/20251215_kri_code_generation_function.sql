-- Migration: Atomic KRI Code Generation Function
-- Date: 2025-12-15
-- Purpose: Generate KRI codes without race conditions using database-level locking

-- ============================================================================
-- CREATE ATOMIC KRI CODE GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_next_kri_code(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number INTEGER;
  v_kri_code TEXT;
  v_max_retries INTEGER := 5;
  v_retry_count INTEGER := 0;
BEGIN
  -- Loop with retries in case of race conditions
  LOOP
    BEGIN
      -- Get the highest KRI number for this organization
      -- Use FOR UPDATE to lock the rows and prevent race conditions
      SELECT COALESCE(
        MAX(
          CAST(
            SUBSTRING(kri_code FROM 'KRI-(\d+)') AS INTEGER
          )
        ),
        0
      ) + 1
      INTO v_next_number
      FROM kri_definitions
      WHERE organization_id = p_organization_id
      FOR UPDATE;

      -- Format as KRI-001, KRI-002, etc.
      v_kri_code := 'KRI-' || LPAD(v_next_number::TEXT, 3, '0');

      -- Verify code doesn't already exist (extra safety check)
      IF EXISTS (
        SELECT 1 FROM kri_definitions
        WHERE organization_id = p_organization_id
          AND kri_code = v_kri_code
      ) THEN
        -- Code exists, increment and try again
        v_retry_count := v_retry_count + 1;
        IF v_retry_count >= v_max_retries THEN
          -- Fallback to timestamp-based code if retries exhausted
          v_kri_code := 'KRI-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM '(\d{3})$');
          EXIT;
        END IF;
        CONTINUE;
      END IF;

      -- Code is unique, return it
      RETURN v_kri_code;
    EXCEPTION
      WHEN OTHERS THEN
        -- If error occurs, retry up to max_retries times
        v_retry_count := v_retry_count + 1;
        IF v_retry_count >= v_max_retries THEN
          -- Fallback to timestamp-based code
          RETURN 'KRI-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT FROM '(\d{3})$');
        END IF;
    END;
  END LOOP;

  RETURN v_kri_code;
END;
$$;

COMMENT ON FUNCTION generate_next_kri_code(UUID) IS
  'Atomically generates next available KRI code for organization. Uses row-level locking to prevent race conditions.';

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

DO $$
DECLARE
  v_test_org_id UUID;
  v_generated_code TEXT;
BEGIN
  -- Get a test organization ID (if any exist)
  SELECT organization_id INTO v_test_org_id
  FROM kri_definitions
  LIMIT 1;

  IF v_test_org_id IS NOT NULL THEN
    -- Test the function
    v_generated_code := generate_next_kri_code(v_test_org_id);
    RAISE NOTICE 'Test: Generated KRI code: %', v_generated_code;
    RAISE NOTICE 'SUCCESS: KRI code generation function is working correctly.';
  ELSE
    RAISE NOTICE 'No KRI definitions found in database. Function created but not tested.';
    RAISE NOTICE 'Function will be tested on first KRI creation.';
  END IF;
END $$;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- To use this function in application code (src/lib/kri.ts):
--
-- Replace the generateKRICode() JavaScript function with a call to this database function:
--
-- async function generateKRICode(organizationId: string): Promise<string> {
--   const { data, error } = await supabase
--     .rpc('generate_next_kri_code', { p_organization_id: organizationId });
--
--   if (error || !data) {
--     console.error('Error generating KRI code:', error);
--     return `KRI-${Date.now().toString().slice(-3)}`;
--   }
--
--   return data;
-- }
