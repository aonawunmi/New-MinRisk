-- ============================================================================
-- FIX: Update all RPC functions for Clerk Third-Party Auth compatibility
-- ============================================================================
-- Problem: Several RPC functions still use auth.uid() (returns Clerk string ID
--          like 'user_39nT8qOadYrGvbgO9ShfzXF0q26') where a UUID is expected,
--          and join auth.users (which no longer contains Clerk users).
--
-- Errors seen:
--   - "invalid input syntax for type uuid: 'user_39nT8qOadYrGvbgO9ShfzXF0q26'"
--   - PostgreSQL error code 22P02
--
-- Fix: Replace auth.uid() with clerk_user_uuid(), remove auth.users joins,
--      use user_profiles.email directly, and use is_super_admin()/current_user_role()
--      instead of get_my_role().
--
-- Dependencies: Requires the Clerk helper functions from 20260217000001_clerk_migration.sql:
--   - clerk_user_uuid()
--   - current_org_id()
--   - is_admin()
--   - is_super_admin()
--   - current_user_role()
-- ============================================================================


-- =====================================================================
-- FIX 1: get_my_role() — ROOT CAUSE of most failures
-- =====================================================================
-- Old: WHERE id = auth.uid()  → auth.uid() returns Clerk string, not UUID
-- New: WHERE clerk_id = (auth.jwt()->>'sub')  → matches Clerk user ID

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.user_profiles
  WHERE clerk_id = (SELECT auth.jwt()->>'sub')
  LIMIT 1;
$$;


-- =====================================================================
-- FIX 2: list_users_with_email() — Remove auth.users join
-- =====================================================================
-- Old: Joined auth.users for email, used auth.uid() for permission check
-- New: Uses user_profiles.email directly, clerk helpers for permissions
-- Must DROP first because return type may differ from existing function

DROP FUNCTION IF EXISTS public.list_users_with_email(UUID);
DROP FUNCTION IF EXISTS public.list_users_with_email();

CREATE OR REPLACE FUNCTION public.list_users_with_email(
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    status TEXT,
    organization_id UUID,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check permissions using Clerk-compatible helper
    IF NOT public.is_super_admin() THEN
        IF p_organization_id IS NULL OR p_organization_id <> public.current_org_id() THEN
            RAISE EXCEPTION 'Access denied: You can only view users in your own organization.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        up.id,
        up.email,
        up.full_name,
        up.role::TEXT,
        up.status::TEXT,
        up.organization_id,
        up.last_active_at AS last_sign_in_at,
        up.created_at,
        up.updated_at
    FROM user_profiles up
    WHERE
        (p_organization_id IS NULL OR up.organization_id = p_organization_id)
    ORDER BY up.created_at DESC;
END;
$$;


-- =====================================================================
-- FIX 3: get_active_users_admin() — Remove auth.users join
-- =====================================================================
-- Old: Joined auth.users for email, used get_my_role() for permission check
-- New: Uses user_profiles.email, is_super_admin() for permissions

DROP FUNCTION IF EXISTS public.get_active_users_admin(INT);
DROP FUNCTION IF EXISTS public.get_active_users_admin();

CREATE OR REPLACE FUNCTION public.get_active_users_admin(p_window_minutes INT DEFAULT 15)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    organization_name TEXT,
    role TEXT,
    last_active_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check: Only super_admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        up.id,
        up.email,
        up.full_name,
        COALESCE(org.name, 'Platform Admin'),
        up.role::TEXT,
        up.last_active_at,
        CASE
            WHEN up.last_active_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN 'online'
            ELSE 'offline'
        END
    FROM user_profiles up
    LEFT JOIN organizations org ON org.id = up.organization_id
    WHERE up.last_active_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL
    ORDER BY up.last_active_at DESC;
END;
$$;


-- =====================================================================
-- FIX 4: get_platform_metrics() — Uses get_my_role() (now fixed above)
-- =====================================================================
-- Must DROP first because return type may differ from existing function

DROP FUNCTION IF EXISTS public.get_platform_metrics();
DROP FUNCTION IF EXISTS public.get_platform_metrics(INT);

CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_code TEXT,
    organization_status TEXT,
    created_at TIMESTAMPTZ,
    total_users BIGINT,
    active_users_last_30d BIGINT,
    admins_count BIGINT,
    regular_users_count BIGINT,
    last_login_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check: Only super_admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.code,
        o.status,
        o.created_at,
        COUNT(up.id) as total_users,
        COUNT(CASE WHEN up.last_active_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users_last_30d,
        COUNT(CASE WHEN up.role IN ('primary_admin', 'admin') THEN 1 END) as admins_count,
        COUNT(CASE WHEN up.role NOT IN ('primary_admin', 'admin', 'super_admin') THEN 1 END) as regular_users_count,
        MAX(up.last_active_at) as last_login_at
    FROM organizations o
    LEFT JOIN user_profiles up ON up.organization_id = o.id
    GROUP BY o.id, o.name, o.code, o.status, o.created_at
    ORDER BY total_users DESC, o.created_at DESC;
END;
$$;


-- =====================================================================
-- FIX 5: create_organization() — Replace auth.uid() with clerk_user_uuid()
-- =====================================================================
-- Must DROP first because return type may differ

DROP FUNCTION IF EXISTS public.create_organization(TEXT, TEXT, TEXT);

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
    IF NOT public.is_super_admin() THEN
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

    -- Create default app_config (use clerk_user_uuid instead of auth.uid)
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
        clerk_user_uuid(),
        5,
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


-- =====================================================================
-- FIX 6: invite_primary_admin() — Use user_profiles.email instead of auth.users
-- =====================================================================
-- Must DROP first because return type may differ

DROP FUNCTION IF EXISTS public.invite_primary_admin(UUID, TEXT, TEXT);

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
SET search_path = public
AS $$
BEGIN
    -- Check: Only super_admin can call this
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can invite primary admins';
    END IF;

    -- Check: Organization must exist
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization not found: %', p_organization_id;
    END IF;

    -- Check: Email must not already exist (check user_profiles instead of auth.users)
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists: %', p_email;
    END IF;

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


-- =====================================================================
-- FIX 7: list_organizations_admin() — Update to use is_super_admin()
-- =====================================================================
-- Must DROP first because return type differs from existing function

DROP FUNCTION IF EXISTS public.list_organizations_admin();

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
    IF NOT public.is_super_admin() THEN
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


-- =====================================================================
-- FIX 8: get_org_features() — Replace auth.uid() with clerk_user_uuid()
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_org_features(p_org_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_features JSONB;
BEGIN
    -- If no org specified, use current user's org
    IF p_org_id IS NULL THEN
        SELECT up.organization_id INTO v_org_id
        FROM user_profiles up
        WHERE up.id = clerk_user_uuid();
    ELSE
        v_org_id := p_org_id;
    END IF;

    -- Get features from plan
    SELECT sp.features INTO v_features
    FROM organizations o
    JOIN subscription_plans sp ON sp.id = o.plan_id
    WHERE o.id = v_org_id;

    -- Return empty if no plan assigned
    RETURN COALESCE(v_features, '{}'::jsonb);
END;
$$;


-- =====================================================================
-- FIX 9: upsert_subscription_plan() — Update to use is_super_admin()
-- =====================================================================

CREATE OR REPLACE FUNCTION public.upsert_subscription_plan(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_max_users INT DEFAULT NULL,
    p_price_monthly DECIMAL DEFAULT 0,
    p_features JSONB DEFAULT '{}'::jsonb,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    -- Only super_admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO subscription_plans (name, max_users, price_monthly, features, is_active)
        VALUES (p_name, p_max_users, p_price_monthly, p_features, p_is_active)
        RETURNING subscription_plans.id INTO v_plan_id;
    ELSE
        UPDATE subscription_plans
        SET
            name = COALESCE(p_name, subscription_plans.name),
            max_users = p_max_users,
            price_monthly = COALESCE(p_price_monthly, subscription_plans.price_monthly),
            features = COALESCE(p_features, subscription_plans.features),
            is_active = COALESCE(p_is_active, subscription_plans.is_active),
            updated_at = NOW()
        WHERE subscription_plans.id = p_id
        RETURNING subscription_plans.id INTO v_plan_id;
    END IF;

    RETURN v_plan_id;
END;
$$;


-- =====================================================================
-- FIX 10: Session functions — Also update user_profiles.last_active_at
-- =====================================================================
-- The clerk migration rewrote these to use active_sessions table,
-- but get_active_users_admin() relies on user_profiles.last_active_at.
-- Add the last_active_at update back.

CREATE OR REPLACE FUNCTION register_new_login(p_session_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := clerk_user_uuid();
BEGIN
  -- Update user_profiles last_active_at (for get_active_users_admin)
  UPDATE user_profiles SET last_active_at = NOW() WHERE id = v_user_id;

  -- Handle active_sessions table
  DELETE FROM active_sessions WHERE user_id = v_user_id;
  INSERT INTO active_sessions (user_id, session_id, last_heartbeat)
  VALUES (v_user_id, p_session_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET session_id = p_session_id, last_heartbeat = NOW();
EXCEPTION WHEN undefined_table THEN
  -- active_sessions table may not exist; the user_profiles update above still works
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := clerk_user_uuid();
  v_current_session TEXT;
BEGIN
  -- Always update user_profiles.last_active_at (for get_active_users_admin)
  UPDATE user_profiles SET last_active_at = NOW() WHERE id = v_user_id;

  -- Check active_sessions table
  SELECT session_id INTO v_current_session
  FROM active_sessions
  WHERE user_id = v_user_id;

  IF v_current_session IS NULL OR v_current_session = p_session_id THEN
    UPDATE active_sessions
    SET last_heartbeat = NOW()
    WHERE user_id = v_user_id AND session_id = p_session_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RETURN true;  -- If table doesn't exist, always succeed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =====================================================================
-- FIX 11: Update subscription_plans RLS to use is_super_admin()
-- =====================================================================
-- Old: USING (public.get_my_role() = 'super_admin')
-- New: USING (public.is_super_admin()) for consistency

DROP POLICY IF EXISTS "Super admin can manage plans" ON public.subscription_plans;
CREATE POLICY "Super admin can manage plans" ON public.subscription_plans
    FOR ALL TO authenticated USING (public.is_super_admin());


-- =====================================================================
-- DONE: All RPC functions updated for Clerk compatibility
-- =====================================================================
-- Summary of changes:
-- 1.  get_my_role()              → Uses clerk_id lookup instead of auth.uid()
-- 2.  list_users_with_email()    → Removed auth.users join, uses user_profiles.email
-- 3.  get_active_users_admin()   → Removed auth.users join, uses user_profiles.email
-- 4.  get_platform_metrics()     → Uses is_super_admin() instead of get_my_role()
-- 5.  create_organization()      → Uses clerk_user_uuid() instead of auth.uid()
-- 6.  invite_primary_admin()     → Checks user_profiles.email instead of auth.users
-- 7.  list_organizations_admin() → Uses is_super_admin() instead of get_my_role()
-- 8.  get_org_features()         → Uses clerk_user_uuid() instead of auth.uid()
-- 9.  upsert_subscription_plan() → Uses is_super_admin() instead of get_my_role()
-- 10. register_new_login()       → Also updates user_profiles.last_active_at
-- 11. update_session_heartbeat() → Also updates user_profiles.last_active_at
-- 12. subscription_plans RLS     → Uses is_super_admin() instead of get_my_role()
