-- ============================================================================
-- Phase 4: Platform Metrics & Billing Stats
-- ============================================================================
-- RPC: get_platform_metrics
-- Returns aggregated stats for billing purposes (seat counts)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_platform_metrics();

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
    IF public.get_my_role() <> 'super_admin' THEN
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
