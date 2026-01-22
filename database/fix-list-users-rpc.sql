-- ============================================================================
-- FIX: list_users_with_email RPC Type Mismatch
-- ============================================================================
-- Problem: Function declared to return user_role but returning text
-- Fix: Change return type to TEXT for role and status columns
-- ============================================================================

-- Drop and recreate with correct types
DROP FUNCTION IF EXISTS public.list_users_with_email(UUID);

CREATE OR REPLACE FUNCTION public.list_users_with_email(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,          -- Changed from user_role to TEXT
    status TEXT,        -- Changed from user_status to TEXT
    organization_id UUID,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check permissions: Must be super_admin OR viewing own org
    IF public.get_my_role() <> 'super_admin' THEN
        -- If not super admin, ENFORCE organization filter to own org
        IF p_organization_id IS NULL OR p_organization_id::text <> (SELECT organization_id::text FROM public.user_profiles WHERE id = auth.uid()) THEN
            RAISE EXCEPTION 'Access denied: You can only view users in your own organization.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        up.full_name,
        up.role::TEXT,      -- Cast enum to TEXT
        up.status::TEXT,    -- Cast enum to TEXT
        up.organization_id,
        au.last_sign_in_at,
        au.created_at,
        up.updated_at
    FROM auth.users au
    JOIN public.user_profiles up ON up.id = au.id
    WHERE 
        (p_organization_id IS NULL OR up.organization_id = p_organization_id)
    ORDER BY au.created_at DESC;
END;
$$;
