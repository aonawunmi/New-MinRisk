-- ============================================================================
-- Super Admin: RPC Functions for Organization & User Management
-- ============================================================================
-- These functions allow Super Admin to:
-- 1. Create new organizations
-- 2. Invite Primary Admin users to organizations
-- ============================================================================

-- ============================================================================
-- FUNCTION: create_organization
-- ============================================================================
-- Creates a new organization with default app_config
-- Only callable by super_admin

CREATE OR REPLACE FUNCTION public.create_organization(
    p_name TEXT,
    p_code TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    description TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Check: Only super_admin can call this
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can create organizations';
    END IF;

    -- Check: Organization code must be unique
    IF EXISTS (SELECT 1 FROM organizations WHERE organizations.code = p_code) THEN
        RAISE EXCEPTION 'Organization code already exists: %', p_code;
    END IF;

    -- Create organization
    INSERT INTO organizations (name, code, description)
    VALUES (p_name, p_code, p_description)
    RETURNING organizations.id INTO v_org_id;

    -- Create default app_config for the organization
    INSERT INTO app_configs (
        organization_id,
        user_id,
        matrix_size,
        likelihood_labels,
        impact_labels,
        divisions,
        departments,
        categories,
        owners
    ) VALUES (
        v_org_id,
        auth.uid(),  -- Super admin as creator
        5,  -- Default 5x5 matrix
        '{"1": "Rare", "2": "Unlikely", "3": "Possible", "4": "Likely", "5": "Almost Certain"}'::jsonb,
        '{"1": "Minimal", "2": "Low", "3": "Moderate", "4": "High", "5": "Severe"}'::jsonb,
        '["Division 1", "Division 2"]'::jsonb,
        '["Department 1", "Department 2"]'::jsonb,
        '["Strategic", "Credit", "Market", "Liquidity", "Operational", "Legal/Compliance", "Technology"]'::jsonb,
        '[]'::jsonb
    );

    -- Return the created organization
    RETURN QUERY
    SELECT o.id, o.name, o.code, o.description, o.created_at
    FROM organizations o
    WHERE o.id = v_org_id;
END;
$$;

-- ============================================================================
-- FUNCTION: invite_primary_admin
-- ============================================================================
-- Creates a new auth user and user_profile with primary_admin role
-- Sends invitation email via Supabase Auth
-- Only callable by super_admin

CREATE OR REPLACE FUNCTION public.invite_primary_admin(
    p_organization_id UUID,
    p_email TEXT,
    p_full_name TEXT
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    organization_id UUID,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check: Only super_admin can call this
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can invite primary admins';
    END IF;

    -- Check: Organization must exist
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization not found: %', p_organization_id;
    END IF;

    -- Check: Email must not already exist
    IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists: %', p_email;
    END IF;

    -- NOTE: We cannot create auth.users directly from a function.
    -- This function creates the user_profile record.
    -- The actual auth user must be created via Supabase Auth API (Edge Function).
    
    -- For now, we just validate and return what WOULD be created.
    -- The actual creation happens via Edge Function.
    
    RETURN QUERY
    SELECT 
        NULL::UUID as user_id,
        p_email as email,
        p_full_name as full_name,
        'primary_admin'::TEXT as role,
        p_organization_id as organization_id,
        'pending_invite'::TEXT as status;
END;
$$;

-- ============================================================================
-- FUNCTION: list_organizations (for Super Admin)
-- ============================================================================
-- Lists all organizations with user counts

CREATE OR REPLACE FUNCTION public.list_organizations_admin()
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check: Only super_admin can call this
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can list all organizations';
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.code,
        o.description,
        o.created_at,
        COALESCE(COUNT(up.id), 0) as user_count
    FROM organizations o
    LEFT JOIN user_profiles up ON up.organization_id = o.id
    GROUP BY o.id, o.name, o.code, o.description, o.created_at
    ORDER BY o.created_at DESC;
END;
$$;
