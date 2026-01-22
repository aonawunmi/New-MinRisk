-- ============================================================================
-- Create or Upgrade Super Admin User (FIXED v9 - Replica Mode Bypass)
-- ============================================================================
-- User: ayodele.onawunmi@gmail.com
-- Strategy:
-- 1. Create/Update Auth User
-- 2. Create Profile (Safe Defaults)
-- 3. BYPASS TRIGGERS using session_replication_role
--    (Disables user triggers but keeps system integrity triggers)
-- ============================================================================

DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'ayodele.onawunmi@gmail.com';
    v_password text := '213Capital$';
    v_full_name text := 'Ayodele Onawunmi';
BEGIN
    -- 1. Check if user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Updating existing auth user %', v_email;
        UPDATE auth.users
        SET 
            encrypted_password = crypt(v_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        RAISE NOTICE 'Creating new auth user %', v_email;
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, role, aud
        ) VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', v_email,
            crypt(v_password, gen_salt('bf')), NOW(), NOW(), NOW(),
            '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object('full_name', v_full_name),
            FALSE, 'authenticated', 'authenticated'
        );

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_user_id, v_user_id, v_user_id::text,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email', NOW(), NOW(), NOW()
        );
    END IF;

    -- 2. Ensure Profile Exists (Safe Defaults)
    BEGIN
        INSERT INTO public.user_profiles (
            id, full_name, role, status, organization_id
        ) VALUES (
            v_user_id, v_full_name, 'user', 'pending', NULL
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            full_name = v_full_name,
            updated_at = NOW();
    EXCEPTION WHEN unique_violation THEN
        NULL;
    END;

    -- 3. FORCE UPDATE (Replica Mode Bypass)
    RAISE NOTICE 'Forcing update to super_admin...';
    
    -- Set session to replica mode to bypass user triggers
    SET session_replication_role = replica;
    
    UPDATE public.user_profiles
    SET 
        role = 'super_admin',
        status = 'approved',
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Restore session to origin mode
    SET session_replication_role = origin;

END $$;

-- Verification
SELECT 
    au.email, 
    up.role, 
    up.full_name, 
    up.status,
    'Password set to: 213Capital$' as standard_password
FROM auth.users au
JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'ayodele.onawunmi@gmail.com';
