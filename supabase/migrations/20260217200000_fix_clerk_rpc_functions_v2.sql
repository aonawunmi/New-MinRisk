-- ============================================================================
-- FIX v2: Update remaining RPC functions for Clerk compatibility
-- ============================================================================
-- These functions from enhanced-audit-logging.sql and 20260202 migrations
-- still use get_my_role() (now fixed) and auth.uid() (still broken).
-- Also fixes:
--   - get_platform_audit_trail: ambiguous 'id' column (error 42702)
--   - list_organizations_admin: restores full return type from 20260202
--   - create_organization: fixes 6-param version with audit logging
-- ============================================================================


-- =====================================================================
-- FIX 1: get_platform_audit_trail — Ambiguous 'id' column + Clerk update
-- =====================================================================
-- Error: 42702 "column reference 'id' is ambiguous"
-- Root cause: OUT parameter 'id' conflicts with table column 'at.id' in PL/pgSQL
-- Fix: Rename OUT parameter to 'audit_id' to avoid ambiguity

DROP FUNCTION IF EXISTS public.get_platform_audit_trail(INT);

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
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        at2.id,
        at2.action_type::TEXT,
        at2.entity_type::TEXT,
        at2.entity_id,
        at2.entity_code,
        at2.performed_at,
        COALESCE(up2.full_name, 'System') AS user_email,
        o2.name AS organization_name,
        at2.old_values,
        at2.new_values,
        at2.metadata
    FROM audit_trail at2
    LEFT JOIN user_profiles up2 ON at2.user_id = up2.id
    LEFT JOIN organizations o2 ON at2.organization_id = o2.id
    WHERE at2.entity_type IN ('organization', 'subscription_plan')
       OR at2.action_type IN ('suspend', 'reactivate', 'invite', 'plan_change')
    ORDER BY at2.performed_at DESC
    LIMIT p_limit;
END;
$$;


-- =====================================================================
-- FIX 2: list_organizations_admin — Restore full return type from 20260202
-- =====================================================================
-- Our previous fix regressed this to a simpler return type.
-- The frontend needs: status, suspended_at, plan_name, subscription_status,
-- trial_ends_at, institution_type

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
    trial_ends_at TIMESTAMPTZ,
    institution_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can list all organizations';
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
        o.trial_ends_at,
        o.institution_type
    FROM organizations o
    LEFT JOIN user_profiles up ON up.organization_id = o.id
    LEFT JOIN subscription_plans sp ON sp.id = o.plan_id
    GROUP BY o.id, o.name, o.code, o.description, o.status, o.created_at,
             o.suspended_at, sp.name, o.subscription_status, o.trial_ends_at,
             o.institution_type
    ORDER BY o.created_at DESC;
END;
$$;


-- =====================================================================
-- FIX 3: create_organization (6-param version with audit) — Clerk update
-- =====================================================================
-- The frontend calls with: p_name, p_code, p_description, p_plan_id,
-- p_start_trial, p_institution_type

DROP FUNCTION IF EXISTS public.create_organization(TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION public.create_organization(
    p_name TEXT,
    p_code TEXT,
    p_description TEXT DEFAULT NULL,
    p_plan_id UUID DEFAULT NULL,
    p_start_trial BOOLEAN DEFAULT FALSE,
    p_institution_type TEXT DEFAULT NULL
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
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := clerk_user_uuid();

    -- Determine Plan
    IF p_plan_id IS NULL THEN
        SELECT sp2.id, sp2.name INTO v_default_plan_id, v_plan_name
        FROM subscription_plans sp2 WHERE sp2.name = 'Starter' LIMIT 1;
        p_plan_id := v_default_plan_id;
    ELSE
        SELECT sp2.name INTO v_plan_name FROM subscription_plans sp2 WHERE sp2.id = p_plan_id;
    END IF;

    IF p_start_trial THEN
        v_status := 'trial';
        v_trial_ends := NOW() + INTERVAL '14 days';
    END IF;

    INSERT INTO organizations (
        name, code, description, plan_id,
        subscription_status, trial_ends_at, institution_type
    )
    VALUES (
        p_name, p_code, p_description, p_plan_id,
        v_status, v_trial_ends, p_institution_type
    )
    RETURNING organizations.id INTO v_org_id;

    -- Audit log
    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type,
        entity_id, entity_code, new_values, metadata
    ) VALUES (
        v_org_id, v_user_id, 'create', 'organization',
        v_org_id, p_code,
        jsonb_build_object(
            'name', p_name, 'code', p_code, 'description', p_description,
            'plan_name', v_plan_name, 'subscription_status', v_status,
            'trial_ends_at', v_trial_ends, 'institution_type', p_institution_type
        ),
        jsonb_build_object(
            'action_description', 'Created new organization',
            'plan_name', v_plan_name, 'is_trial', p_start_trial
        )
    );

    RETURN v_org_id;
END;
$$;

-- Also drop the 3-param version we created in v1 (frontend uses 6-param)
DROP FUNCTION IF EXISTS public.create_organization(TEXT, TEXT, TEXT);


-- =====================================================================
-- FIX 4: suspend_organization — Replace auth.uid() with clerk_user_uuid()
-- =====================================================================

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
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := clerk_user_uuid();

    SELECT o2.name, o2.code INTO v_org_name, v_org_code
    FROM organizations o2 WHERE o2.id = p_organization_id;

    SELECT COUNT(*) INTO v_user_count
    FROM user_profiles WHERE organization_id = p_organization_id;

    UPDATE organizations
    SET status = 'suspended', suspended_at = NOW()
    WHERE organizations.id = p_organization_id;

    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type,
        entity_id, entity_code, old_values, new_values, metadata
    ) VALUES (
        p_organization_id, v_user_id, 'suspend', 'organization',
        p_organization_id, v_org_code,
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


-- =====================================================================
-- FIX 5: reactivate_organization — Replace auth.uid() with clerk_user_uuid()
-- =====================================================================

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
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := clerk_user_uuid();

    SELECT o2.name, o2.code, o2.suspended_at INTO v_org_name, v_org_code, v_suspended_at
    FROM organizations o2 WHERE o2.id = p_organization_id;

    UPDATE organizations
    SET status = 'active', suspended_at = NULL
    WHERE organizations.id = p_organization_id;

    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type,
        entity_id, entity_code, old_values, new_values, metadata
    ) VALUES (
        p_organization_id, v_user_id, 'reactivate', 'organization',
        p_organization_id, v_org_code,
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


-- =====================================================================
-- FIX 6: update_organization_plan — Replace auth.uid() with clerk_user_uuid()
-- =====================================================================

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
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := clerk_user_uuid();

    SELECT
        o2.name, o2.code, o2.plan_id, o2.subscription_status, sp2.name
    INTO
        v_org_name, v_org_code, v_old_plan_id, v_old_status, v_old_plan_name
    FROM organizations o2
    LEFT JOIN subscription_plans sp2 ON o2.plan_id = sp2.id
    WHERE o2.id = p_org_id;

    SELECT sp2.name INTO v_new_plan_name FROM subscription_plans sp2 WHERE sp2.id = p_plan_id;

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
    WHERE organizations.id = p_org_id;

    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type,
        entity_id, entity_code, old_values, new_values, metadata
    ) VALUES (
        p_org_id, v_user_id, 'plan_change', 'organization',
        p_org_id, v_org_code,
        jsonb_build_object('plan_name', v_old_plan_name, 'subscription_status', v_old_status),
        jsonb_build_object('plan_name', v_new_plan_name, 'subscription_status', v_status, 'trial_ends_at', v_trial_ends),
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


-- =====================================================================
-- FIX 7: upsert_subscription_plan (6-param enhanced version)
-- =====================================================================
-- The enhanced-audit-logging.sql created a 6-param version with
-- required (non-default) params. Our v1 fix created a different signature
-- with defaults. Drop the enhanced version and recreate with Clerk.

DROP FUNCTION IF EXISTS public.upsert_subscription_plan(UUID, TEXT, INT, NUMERIC, JSONB, BOOLEAN);

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
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_user_id := clerk_user_uuid();

    IF p_id IS NOT NULL THEN
        v_is_update := TRUE;

        SELECT jsonb_build_object(
            'name', sp2.name,
            'max_users', sp2.max_users,
            'price_monthly', sp2.price_monthly,
            'features', sp2.features,
            'is_active', sp2.is_active
        ) INTO v_old_values
        FROM subscription_plans sp2 WHERE sp2.id = p_id;

        UPDATE subscription_plans SET
            name = p_name,
            max_users = p_max_users,
            price_monthly = p_price_monthly,
            features = p_features,
            is_active = p_is_active
        WHERE subscription_plans.id = p_id
        RETURNING subscription_plans.id INTO v_plan_id;
    ELSE
        INSERT INTO subscription_plans (name, max_users, price_monthly, features, is_active)
        VALUES (p_name, p_max_users, p_price_monthly, p_features, p_is_active)
        RETURNING subscription_plans.id INTO v_plan_id;
    END IF;

    INSERT INTO audit_trail (
        organization_id, user_id, action_type, entity_type,
        entity_id, entity_code, old_values, new_values, metadata
    ) VALUES (
        NULL, v_user_id,
        CASE WHEN v_is_update THEN 'update' ELSE 'create' END,
        'subscription_plan', v_plan_id, p_name,
        v_old_values,
        jsonb_build_object(
            'name', p_name, 'max_users', p_max_users,
            'price_monthly', p_price_monthly, 'features', p_features,
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
