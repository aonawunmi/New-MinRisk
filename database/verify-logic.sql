-- ============================================================================
-- VERIFY: App Role vs System Role
-- ============================================================================
SELECT 
    au.email,
    -- System Level (Supabase Internal - Should be FALSE)
    au.is_super_admin as supabase_internal_admin,
    
    -- Application Level (MinRisk - Should be SUPER_ADMIN)
    up.role as minrisk_app_role,
    up.status as minrisk_status
FROM auth.users au
JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'ayodele.onawunmi@gmail.com';
