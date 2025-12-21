-- ============================================================================
-- USER AUDIT SYSTEM - COMPREHENSIVE TESTING SCRIPT
-- ============================================================================
-- Date: 2025-12-21
-- Purpose: Verify all components of audit system work correctly
-- ============================================================================

DO $$
DECLARE
  v_user_record RECORD;
  v_backfill_count INTEGER := 0;
  v_test_user_id UUID;
  v_error_caught BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- ============================================================================
  -- STEP 1: Backfill Historical Data
  -- ============================================================================
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'USER AUDIT SYSTEM - COMPREHENSIVE TEST';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 1: Backfilling historical user data...';

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
    AND up.organization_id IS NOT NULL  -- Skip users without organization (system admins)
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
      NULL,
      v_user_record.status,
      'unknown',
      v_user_record.id,
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
      NULL,
      v_user_record.role,
      v_user_record.id,
      v_user_record.role,
      v_user_record.email,
      v_user_record.created_at,
      'Backfilled from legacy data - no historical audit trail available'
    );

    v_backfill_count := v_backfill_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Backfilled % users', v_backfill_count;

  -- ============================================================================
  -- STEP 2: Test Direct Update Protection
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🧪 STEP 2: Testing direct update protection...';

  SELECT id INTO v_test_user_id
  FROM user_profiles
  WHERE status = 'approved'
  LIMIT 1;

  IF v_test_user_id IS NOT NULL THEN
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
  ELSE
    RAISE NOTICE '⚠️  No approved users found - skipping test';
  END IF;

  -- ============================================================================
  -- STEP 3: Test Stored Procedure
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '🧪 STEP 3: Testing stored procedure...';

  BEGIN
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
  END;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'TEST COMPLETE - See query results below for detailed summary';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- STEP 4: Audit Trail Summary (Query Results)
-- ============================================================================

-- Status transitions by type
SELECT
  '📊 Status Transitions by Type' as report_section,
  transition_type,
  COUNT(*) as count
FROM user_status_transitions
GROUP BY transition_type
ORDER BY count DESC;

-- Last 5 status transitions
SELECT
  '📋 Last 5 Status Transitions' as report_section,
  ust.changed_at,
  COALESCE(au_target.email, 'Unknown') as target_user,
  COALESCE(ust.from_status, 'N/A') as from_status,
  ust.to_status,
  ust.transition_type,
  COALESCE(au_actor.email, 'Unknown') as changed_by,
  ust.reason
FROM user_status_transitions ust
LEFT JOIN auth.users au_target ON au_target.id = ust.user_id
LEFT JOIN auth.users au_actor ON au_actor.id = ust.actor_user_id
ORDER BY ust.changed_at DESC
LIMIT 5;

-- Last 5 role transitions
SELECT
  '📋 Last 5 Role Transitions' as report_section,
  urt.changed_at,
  COALESCE(au_target.email, 'Unknown') as target_user,
  COALESCE(urt.from_role, 'N/A') as from_role,
  urt.to_role,
  COALESCE(au_actor.email, 'Unknown') as changed_by,
  urt.reason
FROM user_role_transitions urt
LEFT JOIN auth.users au_target ON au_target.id = urt.user_id
LEFT JOIN auth.users au_actor ON au_actor.id = urt.actor_user_id
ORDER BY urt.changed_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: Schema Verification
-- ============================================================================

-- Check enums
SELECT
  '🔍 Schema: Enums' as report_section,
  t.typname as enum_name,
  COUNT(e.enumlabel) as value_count
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_status', 'transition_context', 'user_role')
GROUP BY t.typname
ORDER BY t.typname;

-- Check triggers
SELECT
  '🔍 Schema: Triggers' as report_section,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles'
  AND trigger_name IN ('enforce_status_change_audit', 'enforce_role_change_audit')
ORDER BY trigger_name;

-- Check functions
SELECT
  '🔍 Schema: Functions' as report_section,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name IN ('change_user_status', 'change_user_role', 'get_role_level',
                       'protect_user_status_updates', 'protect_user_role_updates')
ORDER BY routine_name;

-- ============================================================================
-- STEP 6: User Summary
-- ============================================================================

-- User count by status
SELECT
  '👥 User Summary by Status' as report_section,
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
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

-- User count by role
SELECT
  '👥 User Summary by Role' as report_section,
  role,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM user_profiles
GROUP BY role
ORDER BY
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'primary_admin' THEN 2
    WHEN 'secondary_admin' THEN 3
    WHEN 'user' THEN 4
    WHEN 'viewer' THEN 5
    ELSE 6
  END;

-- Total audit records
SELECT
  '📊 Audit Records Summary' as report_section,
  'Status Transitions' as audit_type,
  COUNT(*) as total_records
FROM user_status_transitions
UNION ALL
SELECT
  '📊 Audit Records Summary' as report_section,
  'Role Transitions' as audit_type,
  COUNT(*) as total_records
FROM user_role_transitions;
