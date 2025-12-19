-- Run this in Supabase SQL Editor to diagnose the profile issue
-- Replace the email with the actual user's email

-- 1. Check if auth user exists
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'xz12ar@yahoo.com';

-- 2. Check if user_profile exists (using the ID from above)
SELECT *
FROM user_profiles
WHERE id = '254ef943-2bd7-4a2a-a789-1a7576efc322';

-- 3. Check for duplicate profiles
SELECT id, COUNT(*) as count
FROM user_profiles
WHERE id = '254ef943-2bd7-4a2a-a789-1a7576efc322'
GROUP BY id
HAVING COUNT(*) > 1;

-- 4. Check RLS policies on user_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles';
