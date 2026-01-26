-- ============================================================================
-- Phase 2: Organization Suspension
-- ============================================================================
-- Adds status field to organizations and functions to suspend/reactivate
-- Suspended orgs: All users blocked from login
-- ============================================================================

-- 1. Add status column to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'suspended'));

-- 2. Add suspended_at and suspended_by columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

-- 3. Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- ============================================================================
-- FUNCTION: suspend_organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.suspend_organization(p_organization_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    status TEXT,
    suspended_at TIMESTAMPTZ,
    users_affected BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_count BIGINT;
BEGIN
    -- Check: Only super_admin can suspend
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can suspend organizations';
    END IF;

    -- Check: Organization must exist
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization not found: %', p_organization_id;
    END IF;

    -- Count affected users
    SELECT COUNT(*) INTO v_user_count 
    FROM user_profiles 
    WHERE organization_id = p_organization_id;

    -- Update organization status
    UPDATE organizations 
    SET 
        status = 'suspended',
        suspended_at = NOW(),
        suspended_by = auth.uid()
    WHERE organizations.id = p_organization_id;

    -- Return result
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.status,
        o.suspended_at,
        v_user_count as users_affected
    FROM organizations o
    WHERE o.id = p_organization_id;
END;
$$;

-- ============================================================================
-- FUNCTION: reactivate_organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reactivate_organization(p_organization_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    status TEXT,
    reactivated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check: Only super_admin can reactivate
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can reactivate organizations';
    END IF;

    -- Check: Organization must exist
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization not found: %', p_organization_id;
    END IF;

    -- Update organization status
    UPDATE organizations 
    SET 
        status = 'active',
        suspended_at = NULL,
        suspended_by = NULL
    WHERE organizations.id = p_organization_id;

    -- Return result
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.status,
        NOW() as reactivated_at
    FROM organizations o
    WHERE o.id = p_organization_id;
END;
$$;

-- ============================================================================
-- FUNCTION: check_org_status (for login blocking)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_org_status()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_status TEXT;
    v_org_id UUID;
BEGIN
    -- Get current user's org
    SELECT organization_id INTO v_org_id
    FROM user_profiles
    WHERE id = auth.uid();

    -- Super admin has no org, always active
    IF v_org_id IS NULL THEN
        RETURN 'active';
    END IF;

    -- Get org status
    SELECT status INTO v_org_status
    FROM organizations
    WHERE id = v_org_id;

    RETURN COALESCE(v_org_status, 'active');
END;
$$;

-- ============================================================================
-- Update list_organizations_admin to include status
-- ============================================================================
DROP FUNCTION IF EXISTS public.list_organizations_admin();
CREATE OR REPLACE FUNCTION public.list_organizations_admin()
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
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
        o.status,
        o.created_at,
        o.suspended_at,
        COALESCE(COUNT(up.id), 0) as user_count
    FROM organizations o
    LEFT JOIN user_profiles up ON up.organization_id = o.id
    GROUP BY o.id, o.name, o.code, o.description, o.status, o.created_at, o.suspended_at
    ORDER BY o.created_at DESC;
END;
$$;
