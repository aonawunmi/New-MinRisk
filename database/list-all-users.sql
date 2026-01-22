-- ============================================================================
-- List All Users with Roles and Details
-- ============================================================================
-- This script lists all users in the system with their roles and organizations
-- Use this to decide which user to upgrade to super_admin
-- ============================================================================

SELECT 
    au.email,
    up.full_name,
    up.role,
    COALESCE(o.name, 'No Organization') as organization_name,
    up.status,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.created_at,
    au.last_sign_in_at,
    CASE 
        WHEN au.last_sign_in_at IS NULL THEN 'Never logged in'
        WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 'Active recent'
        WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'Active this week'
        ELSE 'Inactive'
    END as activity_status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE au.deleted_at IS NULL
ORDER BY 
    CASE up.role
        WHEN 'super_admin' THEN 1
        WHEN 'primary_admin' THEN 2
        WHEN 'secondary_admin' THEN 3
        WHEN 'user' THEN 4
        WHEN 'viewer' THEN 5
        ELSE 6
    END,
    au.email;
