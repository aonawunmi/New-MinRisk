-- ============================================================================
-- Update Org Creation to support Plans & Trials
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_organization(text, text, text);

CREATE OR REPLACE FUNCTION public.create_organization(
    p_name TEXT,
    p_code TEXT,
    p_description TEXT DEFAULT NULL,
    p_plan_id UUID DEFAULT NULL,
    p_start_trial BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_trial_ends TIMESTAMPTZ := NULL;
    v_status TEXT := 'active';
    v_default_plan_id UUID;
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Determine Plan ID (Default to 'Starter' if null)
    IF p_plan_id IS NULL THEN
        SELECT id INTO v_default_plan_id FROM subscription_plans WHERE name = 'Starter' LIMIT 1;
        p_plan_id := v_default_plan_id;
    END IF;

    -- Handle Trial Logic
    IF p_start_trial THEN
        v_status := 'trial';
        v_trial_ends := NOW() + INTERVAL '14 days';
    END IF;

    INSERT INTO organizations (
        name, 
        code, 
        description, 
        plan_id, 
        subscription_status, 
        trial_ends_at
    )
    VALUES (
        p_name, 
        p_code, 
        p_description, 
        p_plan_id, 
        v_status, 
        v_trial_ends
    )
    RETURNING id INTO v_org_id;

    RETURN v_org_id;
END;
$$;

-- Also update list_organizations_admin to return plan info
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
    user_count BIGINT,
    plan_name TEXT,
    subscription_status TEXT,
    trial_ends_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.code,
        o.description,
        COALESCE(o.status, 'active'),
        o.created_at,
        o.suspended_at,
        COALESCE(COUNT(up.id), 0) as user_count,
        sp.name as plan_name,
        o.subscription_status,
        o.trial_ends_at
    FROM organizations o
    LEFT JOIN user_profiles up ON up.organization_id = o.id
    LEFT JOIN subscription_plans sp ON sp.id = o.plan_id
    GROUP BY o.id, o.name, o.code, o.description, o.status, o.created_at, o.suspended_at, sp.name, o.subscription_status, o.trial_ends_at
    ORDER BY o.created_at DESC;
END;
$$;
