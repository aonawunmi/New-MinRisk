-- Platform Audit Trail RPC for Super Admin
-- Returns platform-wide audit events across all organizations

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
        at.metadata
    FROM audit_trail at
    LEFT JOIN user_profiles up ON at.user_id = up.id
    LEFT JOIN organizations o ON at.organization_id = o.id
    WHERE at.entity_type IN ('organization', 'subscription_plan', 'user')
       OR at.action_type IN ('suspend', 'reactivate', 'invite', 'plan_change')
    ORDER BY at.performed_at DESC
    LIMIT p_limit;
END;
$$;
