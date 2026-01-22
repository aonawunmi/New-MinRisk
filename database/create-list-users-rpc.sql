-- ============================================================================
-- FEATURE: Super Admin User List (RPC)
-- ============================================================================
-- Problem: Edge Function 'admin-list-users' crashes when organization_id is NULL.
--          Super Admins need to see ALL users.
-- Solution: Create a secure RPC function to fetch users with emails.
--           This bypasses the strict-typed Edge Function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_users_with_email(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role user_role,
    status user_status,
    organization_id UUID,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Access auth.users
SET search_path = public, auth -- Secure path
AS $$
BEGIN
    -- Check permissions: Must be super_admin OR viewing own org
    IF public.get_my_role() <> 'super_admin'::text THEN
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
        up.role,
        up.status,
        up.organization_id,
        au.last_sign_in_at,
        au.created_at,
        up.updated_at
    FROM auth.users au
    JOIN public.user_profiles up ON up.id = au.id
    WHERE 
        -- Filter by org if provided, otherwise show all (Super Admin behavior)
        (p_organization_id IS NULL OR up.organization_id = p_organization_id)
    ORDER BY au.created_at DESC;
END;
$$;
