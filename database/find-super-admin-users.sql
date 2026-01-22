-- ============================================================================
-- Find Super Admin Users
-- ============================================================================
-- This script checks if there are any users with the 'super_admin' role
-- Note: super_admin users may NOT belong to any organization (org_id can be NULL)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Check user_role enum definition
SELECT 
    'User Role Enum Values' as category,
    enumlabel as role_value,
    enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- 2. Find all users with super_admin role
-- Note: organization fields will be NULL if super_admin is not tied to an org
SELECT 
    'Super Admin Users' as category,
    au.id,
    au.email,
    up.full_name,
    up.role,
    up.organization_id,
    COALESCE(o.name, 'No Organization') as organization_name,
    up.status,
    au.created_at,
    au.last_sign_in_at,
    au.email_confirmed_at
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE up.role = 'super_admin'
  AND au.deleted_at IS NULL
ORDER BY au.created_at;

-- 3. Count users by role
SELECT 
    'User Count by Role' as category,
    up.role,
    COUNT(*) as user_count
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.deleted_at IS NULL
GROUP BY up.role
ORDER BY up.role;

-- 4. Show all admin roles (super_admin, primary_admin, secondary_admin)
-- Organization info shown but not filtered
SELECT 
    'All Admin Users' as category,
    au.email,
    up.full_name,
    up.role,
    COALESCE(o.name, 'No Organization') as organization_name,
    up.status,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE up.role IN ('super_admin', 'primary_admin', 'secondary_admin')
  AND au.deleted_at IS NULL
ORDER BY up.role, au.email;

-- 5. Specifically check for super_admins without organization
SELECT 
    'Super Admins Without Organization' as category,
    au.email,
    up.full_name,
    up.role,
    up.organization_id,
    up.status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE up.role = 'super_admin'
  AND up.organization_id IS NULL
  AND au.deleted_at IS NULL;
