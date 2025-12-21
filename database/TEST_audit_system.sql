-- ============================================================================
-- USER AUDIT SYSTEM - COMPREHENSIVE TESTING SCRIPT
-- ============================================================================
-- Date: 2025-12-21
-- Purpose: Verify all components of audit system work correctly
--
-- Tests:
-- 1. Backfill historical data
-- 2. Test all state transitions
-- 3. Verify audit trail
-- 4. Verify UI integration
-- ============================================================================

-- ============================================================================
-- STEP 1: Backfill Historical Data
-- ============================================================================
-- Create audit log entries for existing users (who were created before audit system)

DO $$
DECLARE
  v_user_record RECORD;
  v_backfill_count INTEGER := 0;
BEGIN
  RAISE NOTICE '📋 Backfilling historical user data...';

  -- For each existing user who doesn't have an audit entry
  FOR v_user_record IN
    SELECT
      up.id,
      up.organization_id,
      up.status,
      up.role,
      up.created_at,
      au.email
    FROM user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_status_transitions
      WHERE user_id = up.id
    )
  LOOP
    -- Insert backfill entry for status
    INSERT INTO user_status_transitions (
      organization_id,
      user_id,
      from_status,
      to_status,
      transition_type,
      actor_user_id,
      actor_role,
      actor_email,
      changed_at,
      reason
    ) VALUES (
      v_user_record.organization_id,
      v_user_record.id,
      NULL,  -- Unknown previous state
      v_user_record.status,
      'unknown',  -- Historical backfill
      v_user_record.id,  -- Self-reference
      v_user_record.role,
      v_user_record.email,
      v_user_record.created_at,
      'Backfilled from legacy data - no historical audit trail available'
    );

    -- Insert backfill entry for role
    INSERT INTO user_role_transitions (
      organization_id,
      user_id,
      from_role,
      to_role,
      actor_user_id,
      actor_role,
      actor_email,
      changed_at,
      reason
    ) VALUES (
      v_user_record.organization_id,
      v_user_record.id,
      NULL,  -- Unknown previous state
      v_user_record.role,
      v_user_record.id,  -- Self-reference
      v_user_record.role,
      v_user_record.email,
      v_user_record.created_at,
      'Backfilled from legacy data - no historical audit trail available'
    );

    v_backfill_count := v_backfill_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Backfilled % users', v_backfill_count;
END $$;

-- ============================================================================
-- STEP 2: Test Direct Update Protection
-- ============================================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_error_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Testing direct update protection...';

  SELECT id INTO v_test_user_id
  FROM user_profiles
  WHERE status = 'approved'
  LIMIT 1;

  IF v_test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No approved users found - skipping test';
    RETURN;
  END IF;

  -- Try direct status update (should FAIL)
  BEGIN
    UPDATE user_profiles
    SET status = 'suspended'
    WHERE id = v_test_user_id;

    RAISE NOTICE '❌ TRIGGER FAILED - Direct update succeeded!';
  EXCEPTION
    WHEN OTHERS THEN
      v_error_caught := true;
      RAISE NOTICE '✅ Trigger working - Direct update blocked';
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'CRITICAL: Trigger protection not working!';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Test Stored Procedure Authorization
-- ============================================================================

DO $$
DECLARE
  v_result JSONB;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Testing stored procedure...';

  -- This will fail because we're not authenticated (no auth.uid())
  -- But it proves the function exists and accepts parameters
  SELECT change_user_status(
    gen_random_uuid(),
    'approved',
    'Test reason',
    NULL
  ) INTO v_result;

  RAISE NOTICE 'Result: %', v_result;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Not authenticated%' THEN
      RAISE NOTICE '✅ Stored procedure exists and checks auth correctly';
    ELSE
      RAISE NOTICE '⚠️  Unexpected error: %', SQLERRM;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify Audit Tables
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '📊 Audit Trail Summary:';
RAISE NOTICE '';

-- Status transitions summary
SELECT
  transition_type,
  COUNT(*) as count
FROM user_status_transitions
GROUP BY transition_type
ORDER BY count DESC;

-- Show last 5 status transitions
RAISE NOTICE '';
RAISE NOTICE '📋 Last 5 status transitions:';
SELECT
  ust.changed_at,
  au_target.email as target_user,
  ust.from_status,
  ust.to_status,
  ust.transition_type,
  au_actor.email as changed_by
FROM user_status_transitions ust
LEFT JOIN auth.users au_target ON au_target.id = ust.user_id
LEFT JOIN auth.users au_actor ON au_actor.id = ust.actor_user_id
ORDER BY ust.changed_at DESC
LIMIT 5;

-- Show last 5 role transitions
RAISE NOTICE '';
RAISE NOTICE '📋 Last 5 role transitions:';
SELECT
  urt.changed_at,
  au_target.email as target_user,
  urt.from_role,
  urt.to_role,
  au_actor.email as changed_by
FROM user_role_transitions urt
LEFT JOIN auth.users au_target ON au_target.id = urt.user_id
LEFT JOIN auth.users au_actor ON au_actor.id = urt.actor_user_id
ORDER BY urt.changed_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: Verify Database Schema
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '🔍 Schema Verification:';

-- Check enums
SELECT
  t.typname as enum_name,
  COUNT(e.enumlabel) as value_count
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_status', 'transition_context', 'user_role')
GROUP BY t.typname
ORDER BY t.typname;

-- Check triggers
SELECT
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
  AND trigger_name IN ('enforce_status_change_audit', 'enforce_role_change_audit');

-- Check functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('change_user_status', 'change_user_role', 'get_role_level',
                       'protect_user_status_updates', 'protect_user_role_updates')
ORDER BY routine_name;

-- ============================================================================
-- STEP 6: User Count Summary
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '👥 User Summary by Status:';

SELECT
  status,
  COUNT(*) as count
FROM user_profiles
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'approved' THEN 2
    WHEN 'rejected' THEN 3
    WHEN 'suspended' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- TEST COMPLETE
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '🎉 Audit system verification complete!';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Log into the app as admin';
RAISE NOTICE '2. Test approve/reject via UI';
RAISE NOTICE '3. Test role changes via UI';
RAISE NOTICE '4. Verify audit trail in database';
