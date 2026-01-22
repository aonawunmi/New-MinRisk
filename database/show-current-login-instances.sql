-- ============================================================================
-- Show All Current Login Instances in MinRisk System
-- ============================================================================
-- This script shows all users who are currently logged in or have active sessions
-- Run this in Supabase SQL Editor for both dev and prod environments
-- ============================================================================

-- 1. Show all active auth sessions with user details
SELECT 
    'Active Sessions' as category,
    au.id as user_id,
    au.email,
    up.full_name,
    up.role,
    up.organization_id,
    o.name as organization_name,
    au.last_sign_in_at,
    au.created_at as user_created_at,
    CASE 
        WHEN au.last_sign_in_at > NOW() - INTERVAL '1 hour' THEN 'Active (< 1 hour)'
        WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 'Recent (< 24 hours)'
        WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'This week'
        ELSE 'Older'
    END as session_status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE au.deleted_at IS NULL
ORDER BY au.last_sign_in_at DESC NULLS LAST;

-- 2. Show session count by organization
SELECT 
    'Session Count by Organization' as category,
    o.name as organization_name,
    COUNT(DISTINCT au.id) as total_users,
    COUNT(DISTINCT CASE WHEN au.last_sign_in_at > NOW() - INTERVAL '1 hour' THEN au.id END) as active_last_hour,
    COUNT(DISTINCT CASE WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN au.id END) as active_last_24h,
    COUNT(DISTINCT CASE WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN au.id END) as active_last_week
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE au.deleted_at IS NULL
GROUP BY o.id, o.name
ORDER BY total_users DESC;

-- 3. Show all users with their authentication status
SELECT 
    'All Users Authentication Status' as category,
    au.email,
    up.full_name,
    up.role,
    up.status as profile_status,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.last_sign_in_at,
    au.created_at,
    CASE 
        WHEN au.last_sign_in_at IS NULL THEN 'Never logged in'
        WHEN au.last_sign_in_at > NOW() - INTERVAL '1 hour' THEN 'Currently active'
        WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 'Last 24 hours'
        ELSE 'Inactive'
    END as login_status
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.deleted_at IS NULL
ORDER BY au.last_sign_in_at DESC NULLS LAST;

-- 4. Summary statistics
SELECT 
    'Summary Statistics' as category,
    COUNT(*) as total_users,
    COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '1 hour' THEN 1 END) as active_now,
    COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_today,
    COUNT(CASE WHEN last_sign_in_at IS NULL THEN 1 END) as never_logged_in
FROM auth.users
WHERE deleted_at IS NULL;
