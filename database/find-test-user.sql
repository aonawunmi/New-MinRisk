-- Find the test user to see what's happening
-- Run this in Supabase SQL Editor

-- Check all users with +test1 in their email
SELECT
  au.email,
  au.email_confirmed_at,
  CASE
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Already Confirmed'
    ELSE '❌ Not Confirmed'
  END as email_status,
  au.created_at
FROM auth.users au
WHERE au.email LIKE '%test1%'
ORDER BY au.created_at DESC;

-- Check user_profiles for test user
SELECT
  up.email,
  up.full_name,
  up.role,
  up.status,
  up.created_at
FROM user_profiles up
WHERE up.email LIKE '%test1%'
ORDER BY up.created_at DESC;

-- Show all recent users (last 10)
SELECT
  au.email,
  CASE
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as email_status,
  au.created_at
FROM auth.users au
ORDER BY au.created_at DESC
LIMIT 10;
