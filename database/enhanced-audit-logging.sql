-- ============================================================================
-- Enhanced Audit Logging for Super Admin Actions
-- ============================================================================
-- This script updates all Super Admin RPCs to log detailed audit entries
-- with rich metadata (before/after values, entity names, reasons)

-- Drop existing functions first to allow return type changes
DROP FUNCTION IF EXISTS public.create_organization(text, text, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.suspend_organization(uuid);
DROP FUNCTION IF EXISTS public.reactivate_organization(uuid);
DROP FUNCTION IF EXISTS public.update_organization_plan(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.upsert_subscription_plan(uuid, text, int, numeric, jsonb, boolean);
DROP FUNCTION IF EXISTS public.get_platform_audit_trail(int);

-- ============================================================================
-- 1. Update create_organization to log audit
-- ============================================================================
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
    v_plan_name TEXT;
    v_user_id UUID;
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Get current user
    v_user_id := auth.uid();

    -- Determine Plan ID (Default to 'Starter' if null)
    IF p_plan_id IS NULL THEN
        SELECT id, name INTO v_default_plan_id, v_plan_name 
        FROM subscription_plans WHERE name = 'Starter' LIMIT 1;
        p_plan_id := v_default_plan_id;
    ELSE
        SELECT name INTO v_plan_name FROM subscription_plans WHERE id = p_plan_id;
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

    -- LOG AUDIT ENTRY
    INSERT INTO audit_trail (
        organization_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_code,
        new_values,
        metadata
    ) VALUES (
        v_org_id,
        v_user_id,
        'create',
        'organization',
        v_org_id,
        p_code,
        jsonb_build_object(
            'name', p_name,
            'code', p_code,
            'description', p_description,
            'plan_name', v_plan_name,
            'subscription_status', v_status,
            'trial_ends_at', v_trial_ends
        ),
        jsonb_build_object(
            'action_description', 'Created new organization',
            'plan_name', v_plan_name,
            'is_trial', p_start_trial
        )
    );

    RETURN v_org_id;
END;
$$;

-- ============================================================================
-- 2. Update suspend_organization to log audit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.suspend_organization(
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_name TEXT;
    v_org_code TEXT;
    v_user_count INT;
    v_user_id UUID;
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := auth.uid();

    -- Get org info for audit
    SELECT name, code INTO v_org_name, v_org_code 
    FROM organizations WHERE id = p_organization_id;

    -- Count affected users
    SELECT COUNT(*) INTO v_user_count 
    FROM user_profiles WHERE organization_id = p_organization_id;

    -- Perform suspension
    UPDATE organizations 
    SET status = 'suspended', suspended_at = NOW() 
    WHERE id = p_organization_id;

    -- LOG AUDIT ENTRY
    INSERT INTO audit_trail (
        organization_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_code,
        old_values,
        new_values,
        metadata
    ) VALUES (
        p_organization_id,
        v_user_id,
        'suspend',
        'organization',
        p_organization_id,
        v_org_code,
        jsonb_build_object('status', 'active'),
        jsonb_build_object('status', 'suspended', 'suspended_at', NOW()),
        jsonb_build_object(
            'action_description', 'Suspended organization',
            'organization_name', v_org_name,
            'affected_users', v_user_count
        )
    );

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 3. Update reactivate_organization to log audit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reactivate_organization(
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_name TEXT;
    v_org_code TEXT;
    v_suspended_at TIMESTAMPTZ;
    v_user_id UUID;
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := auth.uid();

    -- Get org info for audit
    SELECT name, code, suspended_at INTO v_org_name, v_org_code, v_suspended_at
    FROM organizations WHERE id = p_organization_id;

    -- Perform reactivation
    UPDATE organizations 
    SET status = 'active', suspended_at = NULL 
    WHERE id = p_organization_id;

    -- LOG AUDIT ENTRY
    INSERT INTO audit_trail (
        organization_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_code,
        old_values,
        new_values,
        metadata
    ) VALUES (
        p_organization_id,
        v_user_id,
        'reactivate',
        'organization',
        p_organization_id,
        v_org_code,
        jsonb_build_object('status', 'suspended', 'suspended_at', v_suspended_at),
        jsonb_build_object('status', 'active'),
        jsonb_build_object(
            'action_description', 'Reactivated organization',
            'organization_name', v_org_name,
            'was_suspended_since', v_suspended_at
        )
    );

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 4. Update update_organization_plan to log audit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_organization_plan(
    p_org_id UUID,
    p_plan_id UUID,
    p_start_trial BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trial_ends TIMESTAMPTZ := NULL;
    v_status TEXT;
    v_old_plan_id UUID;
    v_old_plan_name TEXT;
    v_new_plan_name TEXT;
    v_old_status TEXT;
    v_org_name TEXT;
    v_org_code TEXT;
    v_user_id UUID;
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := auth.uid();

    -- Get current state for audit
    SELECT 
        o.name, o.code, o.plan_id, o.subscription_status, sp.name
    INTO 
        v_org_name, v_org_code, v_old_plan_id, v_old_status, v_old_plan_name
    FROM organizations o
    LEFT JOIN subscription_plans sp ON o.plan_id = sp.id
    WHERE o.id = p_org_id;

    -- Get new plan name
    SELECT name INTO v_new_plan_name FROM subscription_plans WHERE id = p_plan_id;

    -- Handle Trial Logic
    IF p_start_trial THEN
        v_status := 'trial';
        v_trial_ends := NOW() + INTERVAL '14 days';
    ELSE
        v_status := 'active';
        v_trial_ends := NULL;
    END IF;

    UPDATE organizations 
    SET 
        plan_id = p_plan_id,
        subscription_status = v_status,
        trial_ends_at = v_trial_ends
    WHERE id = p_org_id;

    -- LOG AUDIT ENTRY
    INSERT INTO audit_trail (
        organization_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_code,
        old_values,
        new_values,
        metadata
    ) VALUES (
        p_org_id,
        v_user_id,
        'plan_change',
        'organization',
        p_org_id,
        v_org_code,
        jsonb_build_object(
            'plan_name', v_old_plan_name,
            'subscription_status', v_old_status
        ),
        jsonb_build_object(
            'plan_name', v_new_plan_name,
            'subscription_status', v_status,
            'trial_ends_at', v_trial_ends
        ),
        jsonb_build_object(
            'action_description', 'Changed subscription plan',
            'organization_name', v_org_name,
            'from_plan', v_old_plan_name,
            'to_plan', v_new_plan_name,
            'is_trial', p_start_trial
        )
    );

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 5. Update upsert_subscription_plan to log audit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_subscription_plan(
    p_id UUID,
    p_name TEXT,
    p_max_users INT,
    p_price_monthly NUMERIC,
    p_features JSONB,
    p_is_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id UUID;
    v_is_update BOOLEAN := FALSE;
    v_old_values JSONB := NULL;
    v_user_id UUID;
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := auth.uid();

    IF p_id IS NOT NULL THEN
        -- Update existing
        v_is_update := TRUE;
        
        -- Capture old values for audit
        SELECT jsonb_build_object(
            'name', name,
            'max_users', max_users,
            'price_monthly', price_monthly,
            'features', features,
            'is_active', is_active
        ) INTO v_old_values
        FROM subscription_plans WHERE id = p_id;

        UPDATE subscription_plans SET
            name = p_name,
            max_users = p_max_users,
            price_monthly = p_price_monthly,
            features = p_features,
            is_active = p_is_active
        WHERE id = p_id
        RETURNING id INTO v_plan_id;
    ELSE
        -- Create new
        INSERT INTO subscription_plans (name, max_users, price_monthly, features, is_active)
        VALUES (p_name, p_max_users, p_price_monthly, p_features, p_is_active)
        RETURNING id INTO v_plan_id;
    END IF;

    -- LOG AUDIT ENTRY
    INSERT INTO audit_trail (
        organization_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_code,
        old_values,
        new_values,
        metadata
    ) VALUES (
        NULL, -- Platform-level, no org
        v_user_id,
        CASE WHEN v_is_update THEN 'update' ELSE 'create' END,
        'subscription_plan',
        v_plan_id,
        p_name,
        v_old_values,
        jsonb_build_object(
            'name', p_name,
            'max_users', p_max_users,
            'price_monthly', p_price_monthly,
            'features', p_features,
            'is_active', p_is_active
        ),
        jsonb_build_object(
            'action_description', CASE WHEN v_is_update THEN 'Updated subscription plan' ELSE 'Created new subscription plan' END,
            'plan_name', p_name
        )
    );

    RETURN v_plan_id;
END;
$$;

-- ============================================================================
-- 6. Update get_platform_audit_trail to return richer data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_platform_audit_trail(
    p_limit INT DEFAULT 200
)
RETURNS TABLE (
    id UUID,
    action_type TEXT,
    entity_type TEXT,
    entity_id UUID,
    entity_code TEXT,
    performed_at TIMESTAMPTZ,
    user_email TEXT,
    organization_name TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only super_admin can access
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        at.id,
        at.action_type::TEXT,
        at.entity_type::TEXT,
        at.entity_id,
        at.entity_code,
        at.performed_at,
        COALESCE(up.full_name, 'System') AS user_email,
        o.name AS organization_name,
        at.old_values,
        at.new_values,
        at.metadata
    FROM audit_trail at
    LEFT JOIN user_profiles up ON at.user_id = up.id
    LEFT JOIN organizations o ON at.organization_id = o.id
    WHERE at.entity_type IN ('organization', 'subscription_plan')
       OR at.action_type IN ('suspend', 'reactivate', 'invite', 'plan_change')
    ORDER BY at.performed_at DESC
    LIMIT p_limit;
END;
$$;
