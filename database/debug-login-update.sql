-- ============================================================================
-- DEBUG: Simulate Login Update
-- ============================================================================
-- The 500 error likely happens when Supabase Auth tries to update the user record.
-- Run this to see if it triggers an SQL error.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Attempting to update last_sign_in_at...';
    
    UPDATE auth.users 
    SET last_sign_in_at = NOW() 
    WHERE email = 'ayodele.onawunmi@gmail.com';
    
    RAISE NOTICE 'Success! No trigger failed.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Update Failed: %', SQLERRM;
    RAISE; -- Re-raise to see full details
END $$;
