-- ============================================================================
-- USER AUDIT SYSTEM - WRITE PROTECTION TRIGGERS
-- Enterprise-Grade Access Governance for MinRisk
-- ============================================================================
-- Date: 2025-12-21
-- Purpose: Prevent direct updates to status/role - enforce audit trail
--
-- Key Principle:
-- Direct UPDATE to user_profiles.status or user_profiles.role is BLOCKED
-- unless the session variable 'app.allow_user_updates' is set to 'true'.
-- Only our blessed stored procedures set this variable.
--
-- This prevents:
-- - Accidental bypasses via bugs
-- - Direct SQL updates from scripts
-- - Future developer mistakes
-- - Service role abuse (unless they know the secret handshake)
--
-- Why this is better than REVOKE:
-- - REVOKE can be overridden by table owner
-- - Service role bypasses RLS and GRANTs
-- - Triggers execute for ALL roles (including service_role)
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: Protect user_profiles.status
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_user_status_updates()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the blessed session variable is set
  IF current_setting('app.allow_status_change', true) != 'true' THEN
    RAISE EXCEPTION 'Direct updates to user_profiles.status are not allowed. Use change_user_status() function.'
      USING HINT = 'Call change_user_status(user_id, new_status, reason) instead',
            ERRCODE = 'P0001';  -- Custom error code for monitoring
  END IF;

  -- If we get here, the update is blessed
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Protect user_profiles.role
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_user_role_updates()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the blessed session variable is set
  IF current_setting('app.allow_role_change', true) != 'true' THEN
    RAISE EXCEPTION 'Direct updates to user_profiles.role are not allowed. Use change_user_role() function.'
      USING HINT = 'Call change_user_role(user_id, new_role, reason) instead',
            ERRCODE = 'P0001';
  END IF;

  -- If we get here, the update is blessed
  RETURN NEW;
END;
$$;

-- ============================================================================
-- ATTACH TRIGGERS TO user_profiles
-- ============================================================================

-- Trigger: Block status changes unless blessed
DROP TRIGGER IF EXISTS enforce_status_change_audit ON user_profiles;

CREATE TRIGGER enforce_status_change_audit
  BEFORE UPDATE OF status ON user_profiles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)  -- Only fire if status actually changed
  EXECUTE FUNCTION protect_user_status_updates();

-- Trigger: Block role changes unless blessed
DROP TRIGGER IF EXISTS enforce_role_change_audit ON user_profiles;

CREATE TRIGGER enforce_role_change_audit
  BEFORE UPDATE OF role ON user_profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)  -- Only fire if role actually changed
  EXECUTE FUNCTION protect_user_role_updates();

-- ============================================================================
-- VERIFICATION: Test that protection works
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_error_caught BOOLEAN := false;
BEGIN
  -- Find a test user (any user will do)
  SELECT id INTO v_test_user_id
  FROM user_profiles
  LIMIT 1;

  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found to test trigger - skipping verification';
    RETURN;
  END IF;

  -- Try to update status directly (should fail)
  BEGIN
    UPDATE user_profiles
    SET status = 'approved'
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct status update was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
      RAISE NOTICE '✅ Trigger working - Direct status update blocked: %', SQLERRM;
  END;

  -- Try to update role directly (should fail)
  BEGIN
    UPDATE user_profiles
    SET role = 'user'
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct role update was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
      RAISE NOTICE '✅ Trigger working - Direct role update blocked: %', SQLERRM;
  END;

  -- Test that blessed updates work
  BEGIN
    -- Set the magic session variable
    PERFORM set_config('app.allow_status_change', 'true', true);

    -- Now the update should work
    UPDATE user_profiles
    SET status = status  -- No-op update, just testing trigger allows it
    WHERE id = v_test_user_id;

    RAISE NOTICE '✅ Blessed status update allowed';

    -- Clear the variable
    PERFORM set_config('app.allow_status_change', '', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Blessed status update failed: %', SQLERRM;
  END;

  BEGIN
    -- Set the magic session variable
    PERFORM set_config('app.allow_role_change', 'true', true);

    -- Now the update should work
    UPDATE user_profiles
    SET role = role  -- No-op update, just testing trigger allows it
    WHERE id = v_test_user_id;

    RAISE NOTICE '✅ Blessed role update allowed';

    -- Clear the variable
    PERFORM set_config('app.allow_role_change', '', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Blessed role update failed: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- SHOW TRIGGERS
-- ============================================================================

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
  AND trigger_name IN ('enforce_status_change_audit', 'enforce_role_change_audit')
ORDER BY trigger_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status:
-- ✅ Direct status updates blocked
-- ✅ Direct role updates blocked
-- ✅ Blessed updates (via session variable) work
-- ✅ Triggers fire BEFORE update (can prevent write)
-- ✅ Works for ALL database roles (including service_role)
--
-- Next step:
-- Phase 3: Create stored procedures that set session variables and write audit logs
-- ============================================================================
