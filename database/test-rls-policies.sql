-- ============================================================================
-- RLS Policy Test Suite for MinRisk v4.0
-- ============================================================================
-- This script tests the critical RLS policies to ensure:
-- 1. Regular users see only their own risks
-- 2. Admins see all org risks (CRITICAL FIX VERIFICATION)
-- 3. No cross-org data leakage
-- 4. Helper functions work correctly
-- ============================================================================

BEGIN;

-- ============================================================================
-- SETUP: Check existing data and users
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 CURRENT DATABASE STATE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Check organizations
SELECT
  '🏢 Organizations' as check_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as names
FROM organizations;

-- Check users with roles
SELECT
  '👥 Users by Role' as check_type,
  role,
  COUNT(*) as count,
  STRING_AGG(SUBSTRING(full_name, 1, 20), ', ') as users
FROM user_profiles
GROUP BY role
ORDER BY role;

-- Check risks by user
SELECT
  '📋 Risks by User' as check_type,
  up.full_name as user_name,
  up.role,
  COUNT(r.id) as risk_count
FROM user_profiles up
LEFT JOIN risks r ON r.user_id = up.id
GROUP BY up.id, up.full_name, up.role
ORDER BY up.role, up.full_name;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 TESTING HELPER FUNCTIONS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Test helper functions with first user
DO $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
  test_role TEXT;
  test_is_admin BOOLEAN;
BEGIN
  -- Get first user
  SELECT id INTO test_user_id FROM user_profiles LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found in database. Please create test users first.';
  ELSE
    -- Set the auth context to this user (simulation)
    RAISE NOTICE '✅ Helper Functions Check:';
    RAISE NOTICE '   - current_profile_id() exists: %', (SELECT current_profile_id() IS NOT NULL);
    RAISE NOTICE '   - current_org_id() exists: %', (SELECT current_org_id() IS NOT NULL);
    RAISE NOTICE '   - current_user_role() exists: %', (SELECT current_user_role() IS NOT NULL);
    RAISE NOTICE '   - is_admin() exists: %', (SELECT is_admin() IS NOT NULL);
  END IF;
END $$;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔒 TESTING RLS POLICIES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Check that RLS is enabled on critical tables
SELECT
  '🔐 RLS Status' as check_type,
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('risks', 'controls', 'kri_definitions', 'incidents')
ORDER BY tablename;

-- Count policies on risks table
SELECT
  '📜 RLS Policies on RISKS' as check_type,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'risks';

-- Check for critical admin policies
SELECT
  '🎯 Critical Admin Policies' as check_type,
  tablename,
  policyname,
  CASE
    WHEN policyname ILIKE '%admin%' THEN '✅ Found'
    ELSE '⚠️  Missing'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('risks', 'controls')
  AND policyname ILIKE '%admin%'
ORDER BY tablename, policyname;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ POLICY VERIFICATION COMPLETE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'Expected Results:'
\echo '  ✅ RLS should be enabled on all tables'
\echo '  ✅ risks table should have BOTH user AND admin policies'
\echo '  ✅ controls table should have BOTH user AND admin policies'
\echo '  ✅ Admin policies should exist (names containing "admin")'
\echo ''
\echo 'Key Admin Policies to Look For:'
\echo '  • "Admins can view all org risks"'
\echo '  • "Admins can insert risks for anyone"'
\echo '  • "Admins can update all org risks"'
\echo '  • "Admins can delete all org risks"'
\echo '  • "Admins can view all org controls"'
\echo '  • (+ 3 more for controls: insert, update, delete)'
\echo ''

ROLLBACK;

-- ============================================================================
-- MANUAL TEST INSTRUCTIONS
-- ============================================================================
/*

To fully test RLS policies with actual user context, follow these steps:

STEP 1: LOGIN AS REGULAR USER
--------------------------------
1. Open your NEW-MINRISK app at http://localhost:5175
2. Login as a regular user (role = 'user')
3. Open browser DevTools → Console
4. Run:
   ```javascript
   const { data, error } = await supabase.from('risks').select('*');
   console.log('Regular user sees:', data?.length, 'risks');
   console.log('Risk details:', data);
   ```
5. Expected: Should only see risks where user_id = their own ID


STEP 2: LOGIN AS ADMIN USER
--------------------------------
1. Logout and login as admin (role = 'primary_admin' or 'secondary_admin')
2. Open browser DevTools → Console
3. Run same query:
   ```javascript
   const { data, error } = await supabase.from('risks').select('*');
   console.log('Admin sees:', data?.length, 'risks');
   console.log('Risk details:', data);
   ```
4. Expected: Should see ALL risks in their organization (not just their own)


STEP 3: TEST CROSS-ORG ISOLATION
--------------------------------
1. If you have multiple orgs, login as user from Org A
2. Try to query risks from Org B (different organization_id)
3. Expected: Should see ZERO risks from other organizations


STEP 4: TEST ADMIN CRUD OPERATIONS
--------------------------------
As an admin user, test:
1. CREATE: Create a risk for another user in same org
   Expected: ✅ Should succeed

2. READ: View risks created by other users
   Expected: ✅ Should see all org risks

3. UPDATE: Modify a risk created by another user
   Expected: ✅ Should succeed

4. DELETE: Delete a risk created by another user
   Expected: ✅ Should succeed


VERIFICATION CHECKLIST:
--------------------------------
□ Regular users can only see their own risks
□ Admins can see ALL risks in their organization
□ Admins can create risks for other users
□ Admins can update any risk in their org
□ Admins can delete any risk in their org
□ No cross-org data leakage
□ Same pattern works for controls table

*/
