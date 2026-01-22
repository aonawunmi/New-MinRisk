-- ============================================================================
-- DEBUG: Compare User Configurations
-- ============================================================================
SELECT 
    email,
    id, 
    instance_id, 
    aud, 
    role as auth_role, 
    is_super_admin,
    created_at
FROM auth.users 
WHERE email IN ('ayodele.onawunmi@gmail.com', 'admin1@acme.com', 'admin2@gfs.com');
