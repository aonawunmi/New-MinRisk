-- ============================================================================
-- Phase 3: Session Enforcement & Monitoring
-- ============================================================================
-- 1. Add session tracking columns to user_profiles
--    - current_session_id: The only valid session ID (enforces single device)
--    - last_active_at: For monitoring active users
-- ============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS current_session_id TEXT,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Index for querying active users efficiently
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON public.user_profiles(last_active_at);

-- ============================================================================
-- FUNCTION: update_session_heartbeat
-- ============================================================================
-- Called periodically by the client to prove they are active.
-- Updates last_active_at.
-- Returns true if session is valid, false if session limit exceeded (logged out elsewhere).

CREATE OR REPLACE FUNCTION public.update_session_heartbeat(p_session_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_session TEXT;
BEGIN
    -- Update last_active_at for the user
    UPDATE user_profiles
    SET last_active_at = NOW()
    WHERE id = auth.uid()
    RETURNING current_session_id INTO v_current_session;

    -- If current_session_id is NULL (first run) or matches, return TRUE
    -- If mismatch, return FALSE (client should logout)
    IF v_current_session IS NULL THEN
        -- Self-healing: active user claims session if none set
        UPDATE user_profiles
        SET current_session_id = p_session_id
        WHERE id = auth.uid();
        RETURN TRUE;
    END IF;

    RETURN v_current_session = p_session_id;
END;
$$;

-- ============================================================================
-- FUNCTION: register_new_login
-- ============================================================================
-- Called immediately after login to claim the session.
-- Invalidates any previous sessions.

CREATE OR REPLACE FUNCTION public.register_new_login(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE user_profiles
    SET 
        current_session_id = p_session_id,
        last_active_at = NOW()
    WHERE id = auth.uid();
END;
$$;

-- ============================================================================
-- FUNCTION: get_active_users (Super Admin Monitor)
-- ============================================================================
-- Returns users active in the last 15 minutes
DROP FUNCTION IF EXISTS public.get_active_users_admin(); -- Drop first to allow return type changes if needed

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
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        up.id,
        au.email::TEXT,
        up.full_name,
        COALESCE(org.name, 'Platform Admin'),
        up.role::TEXT,
        up.last_active_at,
        CASE 
            WHEN up.last_active_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN 'online'
            ELSE 'offline'
        END
    FROM user_profiles up
    JOIN auth.users au ON au.id = up.id
    LEFT JOIN organizations org ON org.id = up.organization_id
    WHERE up.last_active_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL
    ORDER BY up.last_active_at DESC;
END;
$$;
