-- ============================================================================
-- CHECK: Email Confirmation Status
-- ============================================================================
SELECT 
    email, 
    email_confirmed_at, 
    last_sign_in_at,
    role,
    is_super_admin
FROM auth.users 
WHERE email = 'ayodele.onawunmi@gmail.com';
