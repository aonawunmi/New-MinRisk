-- ============================================================================
-- DEBUG: Compare Auth Identities
-- ============================================================================
SELECT 
    au.email,
    ai.provider_id,
    ai.provider,
    ai.identity_data,
    ai.last_sign_in_at
FROM auth.identities ai
JOIN auth.users au ON au.id = ai.user_id
WHERE au.email IN ('ayodele.onawunmi@gmail.com', 'admin1@acme.com');
