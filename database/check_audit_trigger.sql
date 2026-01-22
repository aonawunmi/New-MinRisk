-- ============================================================================
-- CHECK FUNCTION DEFINITION: audit_user_profiles_trigger
-- ============================================================================
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'audit_user_profiles_trigger';
