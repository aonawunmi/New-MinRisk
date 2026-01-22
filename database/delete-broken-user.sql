-- ============================================================================
-- CLEANUP: Delete Broken Super Admin User
-- ============================================================================
-- This will delete the user from auth.users.
-- Cascade rules will automatically remove:
-- 1. public.user_profiles
-- 2. public.user_status_transitions (audit logs)
-- 3. public.user_role_transitions   (audit logs)
-- 4. public.audit_trail            (audit logs)
-- ============================================================================

DO $$
DECLARE
    v_target_email text := 'ayodele.onawunmi@gmail.com';
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_target_email;

    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Deleting user % (ID: %)', v_target_email, v_user_id;

        -- Delete from auth.users (cascades to everything else)
        DELETE FROM auth.users WHERE id = v_user_id;
        
        RAISE NOTICE 'User deleted successfully.';
    ELSE
        RAISE NOTICE 'User % not found. Nothing to delete.', v_target_email;
    END IF;
END $$;
