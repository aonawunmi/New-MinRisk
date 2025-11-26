-- ============================================================================
-- Quick RLS Verification (Safe to run in Supabase SQL Editor)
-- ============================================================================

-- 1. Check RLS is enabled
SELECT 
  '🔐 RLS Status' as "Check",
  tablename as "Table",
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ DISABLED' END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('risks', 'controls', 'kri_definitions', 'incidents', 'external_events')
ORDER BY tablename;

-- 2. Count policies per table
SELECT 
  '📊 Policy Count' as "Check",
  tablename as "Table",
  COUNT(*) as "Policies"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('risks', 'controls')
GROUP BY tablename
ORDER BY tablename;

-- 3. List all policies on risks table
SELECT 
  '📜 Risks Table' as "Check",
  policyname as "Policy Name",
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'risks'
ORDER BY policyname;

-- 4. List all policies on controls table
SELECT 
  '🎛️  Controls Table' as "Check",
  policyname as "Policy Name",
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'controls'
ORDER BY policyname;

-- 5. Verify critical admin policies exist
SELECT 
  '✅ Critical Policies' as "Check",
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'risks' AND policyname ILIKE '%admin%view%') 
    THEN '✅ Admins can view all org risks'
    ELSE '❌ MISSING: Admin view policy'
  END as "Risks - View",
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'risks' AND policyname ILIKE '%admin%update%') 
    THEN '✅ Admins can update all org risks'
    ELSE '❌ MISSING: Admin update policy'
  END as "Risks - Update",
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'controls' AND policyname ILIKE '%admin%view%') 
    THEN '✅ Admins can view all org controls'
    ELSE '❌ MISSING: Admin controls view'
  END as "Controls - View";

-- 6. Check helper functions exist
SELECT 
  '🛠️  Helper Functions' as "Check",
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_org_id') 
    THEN '✅ current_org_id()' ELSE '❌ MISSING' END as "Org ID",
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') 
    THEN '✅ is_admin()' ELSE '❌ MISSING' END as "Is Admin",
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_role') 
    THEN '✅ current_user_role()' ELSE '❌ MISSING' END as "User Role";

-- 7. Summary
SELECT 
  '📋 SUMMARY' as "Check",
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'risks') as "Risks Policies",
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'controls') as "Controls Policies",
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'risks' AND policyname ILIKE '%admin%') as "Risks Admin Policies",
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'controls' AND policyname ILIKE '%admin%') as "Controls Admin Policies";
