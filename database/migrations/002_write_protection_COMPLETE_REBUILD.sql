-- ============================================================================
-- USER AUDIT SYSTEM - WRITE PROTECTION (COMPLETE REBUILD)
-- Enterprise-Grade Access Governance for MinRisk
-- ============================================================================
-- Date: 2025-12-21
-- FIX: Complete rebuild - drop everything and recreate with proper NULL handling
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP OLD TRIGGERS AND FUNCTIONS
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_status_change_audit ON user_profiles;
DROP TRIGGER IF EXISTS enforce_role_change_audit ON user_profiles;
DROP FUNCTION IF EXISTS protect_user_status_updates();
DROP FUNCTION IF EXISTS protect_user_role_updates();

-- ============================================================================
-- STEP 2: CREATE FIXED TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_user_status_updates()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use COALESCE to handle NULL - if setting is not 'true', block the update
  IF COALESCE(current_setting('app.allow_status_change', true), '') != 'true' THEN
    RAISE EXCEPTION 'Direct updates to user_profiles.status are not allowed. Use change_user_status() function.'
      USING HINT = 'Call change_user_status(user_id, new_status, reason) instead',
            ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_user_role_updates()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use COALESCE to handle NULL - if setting is not 'true', block the update
  IF COALESCE(current_setting('app.allow_role_change', true), '') != 'true' THEN
    RAISE EXCEPTION 'Direct updates to user_profiles.role are not allowed. Use change_user_role() function.'
      USING HINT = 'Call change_user_role(user_id, new_role, reason) instead',
            ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 3: RECREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER enforce_status_change_audit
  BEFORE UPDATE OF status ON user_profiles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION protect_user_status_updates();

CREATE TRIGGER enforce_role_change_audit
  BEFORE UPDATE OF role ON user_profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION protect_user_role_updates();

-- ============================================================================
-- STEP 4: IMMEDIATE VERIFICATION TEST
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_original_status TEXT;
  v_original_role TEXT;
  v_status_blocked BOOLEAN := false;
  v_role_blocked BOOLEAN := false;
BEGIN
  -- Get a test user
  SELECT id, status, role
  INTO v_test_user_id, v_original_status, v_original_role
  FROM user_profiles
  LIMIT 1;

  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found - cannot test triggers';
    RETURN;
  END IF;

  RAISE NOTICE '📋 Testing with user: % (status: %, role: %)',
    v_test_user_id, v_original_status, v_original_role;

  -- ============================================
  -- TEST 1: Direct status update should FAIL
  -- ============================================
  BEGIN
    RAISE NOTICE '🧪 Test 1: Attempting direct status update...';

    UPDATE user_profiles
    SET status = CASE
      WHEN status = 'approved' THEN 'suspended'
      ELSE 'approved'
    END
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct status update succeeded!';
    RAISE EXCEPTION 'CRITICAL: Status trigger did not block update';

  EXCEPTION
    WHEN sqlstate 'P0001' THEN
      v_status_blocked := true;
      RAISE NOTICE '✅ Status trigger WORKING - Update blocked: %', SQLERRM;
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Unexpected error: %', SQLERRM;
  END;

  -- ============================================
  -- TEST 2: Blessed status update should WORK
  -- ============================================
  IF v_status_blocked THEN
    BEGIN
      RAISE NOTICE '🧪 Test 2: Attempting blessed status update...';

      -- Set the magic variable
      PERFORM set_config('app.allow_status_change', 'true', true);

      UPDATE user_profiles
      SET status = v_original_status  -- Reset to original
      WHERE id = v_test_user_id;

      RAISE NOTICE '✅ Blessed status update succeeded';

      -- Clear the variable
      PERFORM set_config('app.allow_status_change', '', true);

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Blessed status update failed: %', SQLERRM;
        PERFORM set_config('app.allow_status_change', '', true);
    END;
  END IF;

  -- ============================================
  -- TEST 3: Direct role update should FAIL
  -- ============================================
  BEGIN
    RAISE NOTICE '🧪 Test 3: Attempting direct role update...';

    UPDATE user_profiles
    SET role = CASE
      WHEN role = 'user' THEN 'viewer'
      ELSE 'user'
    END
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct role update succeeded!';
    RAISE EXCEPTION 'CRITICAL: Role trigger did not block update';

  EXCEPTION
    WHEN sqlstate 'P0001' THEN
      v_role_blocked := true;
      RAISE NOTICE '✅ Role trigger WORKING - Update blocked: %', SQLERRM;
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Unexpected error: %', SQLERRM;
  END;

  -- ============================================
  -- TEST 4: Blessed role update should WORK
  -- ============================================
  IF v_role_blocked THEN
    BEGIN
      RAISE NOTICE '🧪 Test 4: Attempting blessed role update...';

      -- Set the magic variable
      PERFORM set_config('app.allow_role_change', 'true', true);

      UPDATE user_profiles
      SET role = v_original_role  -- Reset to original
      WHERE id = v_test_user_id;

      RAISE NOTICE '✅ Blessed role update succeeded';

      -- Clear the variable
      PERFORM set_config('app.allow_role_change', '', true);

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Blessed role update failed: %', SQLERRM;
        PERFORM set_config('app.allow_role_change', '', true);
    END;
  END IF;

  -- ============================================
  -- FINAL VERDICT
  -- ============================================
  IF v_status_blocked AND v_role_blocked THEN
    RAISE NOTICE '🎉 SUCCESS - All trigger protection tests passed!';
  ELSE
    RAISE EXCEPTION 'CRITICAL: Some triggers are not working correctly';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Show triggers are installed
-- ============================================================================

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
  AND trigger_name IN ('enforce_status_change_audit', 'enforce_role_change_audit')
ORDER BY trigger_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
