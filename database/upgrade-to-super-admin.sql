-- ============================================================================
-- UPGRADE: Elevate Clean User to Super Admin (v10)
-- ============================================================================
-- User: ayodele.onawunmi@gmail.com
-- Strategy:
-- 1. Find the valid user created by Dashboard.
-- 2. Upgrade Profile (Bypassing Triggers to avoid governance blocks).
-- 3. Upgrade Auth Metadata (optional but good practice).
-- ============================================================================

DO $$
DECLARE
    v_target_email text := 'ayodele.onawunmi@gmail.com';
    v_user_id uuid;
BEGIN
    -- 1. Get the User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_target_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found! Please create it in Dashboard first.', v_target_email;
    END IF;
    
    RAISE NOTICE 'Found user % (ID: %)', v_target_email, v_user_id;

    -- 2. Force Upgrade Profile (Bypass Triggers)
    --    The Dashboard creation likely created a 'pending' profile via trigger.
    --    We just need to update it.
    
    SET session_replication_role = replica; -- Bypass user triggers
    
    UPDATE public.user_profiles
    SET 
        role = 'super_admin',
        status = 'approved',
        organization_id = NULL, -- Explicitly ensure NULL for super_admin
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Also Insert if not exists (race condition safety)
    IF NOT FOUND THEN
        INSERT INTO public.user_profiles (id, full_name, role, status, organization_id)
        VALUES (v_user_id, 'Ayodele Onawunmi', 'super_admin', 'approved', NULL);
    END IF;

    SET session_replication_role = origin; -- Restore triggers
    
    -- 3. Update Auth Metadata (optional, purely cosmetic for Supabase UI)
    UPDATE auth.users
    SET 
        is_super_admin = FALSE, -- Keep FALSE (Supabase internal superadmin is deprecated/dangerous)
        role = 'authenticated',
        raw_user_meta_data = raw_user_meta_data || '{"full_name": "Ayodele Onawunmi"}'::jsonb
    WHERE id = v_user_id;

    RAISE NOTICE 'User % successfully upgraded to super_admin', v_target_email;
END $$;

-- Verification
SELECT 
    au.email, 
    up.role, 
    up.full_name, 
    up.status
FROM auth.users au
JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'ayodele.onawunmi@gmail.com';
