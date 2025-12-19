-- Verification: Check Incident Code Generation Safety
-- Date: 2025-12-15
-- Purpose: Verify if incident code generation has race condition protection

-- ============================================================================
-- CHECK 1: Does the RPC function exist?
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_incident_bypass_cache'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ RPC function create_incident_bypass_cache EXISTS';
    RAISE NOTICE 'Incident creation uses database function - likely safe from race conditions';
  ELSE
    RAISE NOTICE '❌ RPC function create_incident_bypass_cache DOES NOT EXIST';
    RAISE NOTICE 'This is unexpected - incident creation may be vulnerable';
  END IF;
END $$;

-- ============================================================================
-- CHECK 2: Is there a unique constraint on incident codes?
-- ============================================================================

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'incidents'
      AND (indexname LIKE '%incident_code%' OR indexname LIKE '%unique%')
  ) INTO v_constraint_exists;

  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Unique index found on incidents table';

    -- Show the actual index
    RAISE NOTICE 'Indexes on incidents table:';
    FOR v_indexname, v_indexdef IN
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'incidents'
        AND (indexname LIKE '%incident_code%' OR indexname LIKE '%unique%')
    LOOP
      RAISE NOTICE '  - %: %', v_indexname, v_indexdef;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️  No unique index found on incident_code';
    RAISE NOTICE 'RECOMMENDATION: Add unique constraint to prevent duplicates';
  END IF;
END $$;

-- ============================================================================
-- CHECK 3: Are there any duplicate incident codes currently?
-- ============================================================================

DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT organization_id, incident_code, COUNT(*) as code_count
    FROM incidents
    WHERE incident_status = 'ACTIVE'
    GROUP BY organization_id, incident_code
    HAVING COUNT(*) > 1
  ) violations;

  IF v_duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % duplicate incident code(s) found!', v_duplicate_count;
    RAISE NOTICE 'Run this query to see them:';
    RAISE NOTICE 'SELECT organization_id, incident_code, COUNT(*) FROM incidents WHERE incident_status = ''ACTIVE'' GROUP BY organization_id, incident_code HAVING COUNT(*) > 1;';
  ELSE
    RAISE NOTICE '✅ No duplicate incident codes found';
  END IF;
END $$;

-- ============================================================================
-- CHECK 4: Examine the RPC function source code
-- ============================================================================

DO $$
DECLARE
  v_function_source TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_function_source
  FROM pg_proc
  WHERE proname = 'create_incident_bypass_cache';

  IF v_function_source IS NOT NULL THEN
    RAISE NOTICE '📋 RPC Function Source Code:';
    RAISE NOTICE '%', v_function_source;

    -- Check if it uses locking
    IF v_function_source LIKE '%FOR UPDATE%' THEN
      RAISE NOTICE '✅ Function uses FOR UPDATE locking - SAFE from race conditions';
    ELSIF v_function_source LIKE '%SERIALIZABLE%' THEN
      RAISE NOTICE '✅ Function uses SERIALIZABLE isolation - SAFE from race conditions';
    ELSE
      RAISE NOTICE '⚠️  Function does NOT appear to use explicit locking';
      RAISE NOTICE 'Check if code generation logic is atomic or if unique constraint prevents duplicates';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- RECOMMENDATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'RECOMMENDATION:';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If RPC function does NOT use FOR UPDATE or SERIALIZABLE isolation:';
  RAISE NOTICE '  1. Add unique constraint on (organization_id, incident_code)';
  RAISE NOTICE '  2. Consider creating atomic incident code generation function';
  RAISE NOTICE '     similar to generate_next_kri_code() / generate_next_control_code()';
  RAISE NOTICE '';
  RAISE NOTICE 'If incident codes follow pattern INC-001, INC-002:';
  RAISE NOTICE '  - Copy the KRI/Control fix pattern (simplest)';
  RAISE NOTICE '  - Create: generate_next_incident_code(p_organization_id)';
  RAISE NOTICE '';
END $$;
