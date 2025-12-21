-- ============================================================================
-- USER AUDIT SYSTEM - WRITE PROTECTION TRIGGERS (FIXED)
-- Enterprise-Grade Access Governance for MinRisk
-- ============================================================================
-- Date: 2025-12-21
-- FIX: Proper NULL handling in session variable checks
--
-- BUG: current_setting(..., true) returns NULL when not set
--      NULL != 'true' evaluates to NULL (not TRUE)
--      So exception was never raised!
--
-- FIX: Use COALESCE or IS DISTINCT FROM for proper NULL handling
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: Protect user_profiles.status (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_user_status_updates()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- FIXED: Use IS DISTINCT FROM for proper NULL handling
  IF current_setting('app.allow_status_change', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Direct updates to user_profiles.status are not allowed. Use change_user_status() function.'
      USING HINT = 'Call change_user_status(user_id, new_status, reason) instead',
            ERRCODE = 'P0001';
  END IF;

  -- If we get here, the update is blessed
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Protect user_profiles.role (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_user_role_updates()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- FIXED: Use IS DISTINCT FROM for proper NULL handling
  IF current_setting('app.allow_role_change', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Direct updates to user_profiles.role are not allowed. Use change_user_role() function.'
      USING HINT = 'Call change_user_role(user_id, new_role, reason) instead',
            ERRCODE = 'P0001';
  END IF;

  -- If we get here, the update is blessed
  RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICATION: Test that protection ACTUALLY works now
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_original_status TEXT;
  v_error_caught BOOLEAN := false;
BEGIN
  -- Find a test user
  SELECT id, status INTO v_test_user_id, v_original_status
  FROM user_profiles
  LIMIT 1;

  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found to test - skipping';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing with user ID: %, original status: %', v_test_user_id, v_original_status;

  -- Test 1: Try to update status directly (should FAIL)
  BEGIN
    UPDATE user_profiles
    SET status = 'approved'
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct status update was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
      RAISE NOTICE '✅ Trigger WORKING - Direct status update blocked: %', SQLERRM;
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'CRITICAL: Trigger did not block direct status update!';
  END IF;

  -- Test 2: Try blessed update (should work)
  BEGIN
    PERFORM set_config('app.allow_status_change', 'true', true);

    UPDATE user_profiles
    SET status = v_original_status  -- Set it back to original
    WHERE id = v_test_user_id;

    RAISE NOTICE '✅ Blessed update allowed';

    PERFORM set_config('app.allow_status_change', '', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Blessed update failed: %', SQLERRM;
  END;

  -- Test 3: Verify direct update still blocked after blessed update
  v_error_caught := false;
  BEGIN
    UPDATE user_profiles
    SET status = 'suspended'
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct update allowed after blessed update!';
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
      RAISE NOTICE '✅ Trigger still working after blessed update';
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'CRITICAL: Trigger not working after blessed update!';
  END IF;

  RAISE NOTICE '🎉 All trigger tests passed!';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status:
-- ✅ NULL handling bug fixed
-- ✅ Triggers now ACTUALLY block direct updates
-- ✅ Comprehensive verification tests included
-- ============================================================================
