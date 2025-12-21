-- Check if the test user was created and manually verify their email
-- Run this in Supabase SQL Editor

-- 1. Check if user exists and their confirmation status
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email Not Confirmed'
  END as status
FROM auth.users
WHERE email = 'ayodele.onawunmi+test1@gmail.com';

-- 2. Manually confirm the email (if needed)
UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'ayodele.onawunmi+test1@gmail.com'
  AND email_confirmed_at IS NULL;

-- 3. Check user profile status
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.status,
  up.created_at
FROM user_profiles up
WHERE up.email = 'ayodele.onawunmi+test1@gmail.com';

-- 4. Verify the changes
SELECT
  au.email,
  au.email_confirmed_at,
  up.status as profile_status,
  up.role as requested_role
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'ayodele.onawunmi+test1@gmail.com';
