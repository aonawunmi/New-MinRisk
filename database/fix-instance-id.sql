-- ============================================================================
-- FIX: Repair Instance ID for Super Admin
-- ============================================================================
-- Problem: Created user with hardcoded instance_id '0000...' but system uses real UUID.
-- Fix: Copy instance_id from a known working user (e.g., admin1@acme.com)
-- ============================================================================

DO $$
DECLARE
    v_correct_instance_id uuid;
    v_target_email text := 'ayodele.onawunmi@gmail.com';
BEGIN
    -- 1. Get correct instance_id from ANY existing user
    SELECT instance_id INTO v_correct_instance_id 
    FROM auth.users 
    WHERE instance_id != '00000000-0000-0000-0000-000000000000' 
    LIMIT 1;

    IF v_correct_instance_id IS NULL THEN
        RAISE EXCEPTION 'Could not find a valid instance_id from existing users!';
    END IF;

    RAISE NOTICE 'Found valid instance_id: %', v_correct_instance_id;

    -- 2. Update our Super Admin user
    UPDATE auth.users
    SET instance_id = v_correct_instance_id
    WHERE email = v_target_email;
    
    RAISE NOTICE 'Updated % to use instance_id %', v_target_email, v_correct_instance_id;

END $$;

-- Verification
SELECT email, instance_id, role, 'Instance ID repair complete' as status
FROM auth.users 
WHERE email = 'ayodele.onawunmi@gmail.com';
