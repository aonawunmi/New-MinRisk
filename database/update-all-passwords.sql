-- ============================================================================
-- Update All User Passwords in MinRisk System
-- ============================================================================
-- This script updates ALL user passwords to: 213Capital$
-- Use for BOTH dev and prod environments
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- ============================================================================

-- Update ALL users' passwords to the new password
UPDATE auth.users
SET 
  encrypted_password = crypt('213Capital$', gen_salt('bf')),
  updated_at = NOW()
WHERE deleted_at IS NULL;

-- Verification: Show all updated users
SELECT 
  au.email,
  up.full_name,
  up.role,
  up.organization_id,
  o.name as organization_name,
  au.updated_at as password_updated_at,
  '213Capital$' as new_password
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE au.deleted_at IS NULL
ORDER BY au.email;

-- Summary
SELECT 
  COUNT(*) as total_users_updated,
  'All passwords updated to: 213Capital$' as message
FROM auth.users
WHERE deleted_at IS NULL;
