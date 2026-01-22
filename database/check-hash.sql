-- ============================================================================
-- DEBUG: Check Password Hash Algorithm
-- ============================================================================
SELECT 
    email, 
    left(encrypted_password, 10) as hash_prefix, 
    length(encrypted_password) as hash_len 
FROM auth.users 
WHERE email IN ('ayodele.onawunmi@gmail.com', 'admin1@acme.com');
