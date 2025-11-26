-- Check existing test users for RLS testing
-- Safe to run in Supabase SQL Editor

SELECT
  up.id,
  au.email,
  up.full_name,
  up.role,
  up.status,
  o.name as organization_name,
  up.organization_id
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
JOIN organizations o ON o.id = up.organization_id
ORDER BY up.role DESC, au.email;
