-- ============================================================================
-- CHECK FUNCTION SIGNATURES
-- ============================================================================
SELECT 
    p.proname as function_name, 
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type
FROM pg_proc p
WHERE p.proname IN ('change_user_status', 'change_user_role');
