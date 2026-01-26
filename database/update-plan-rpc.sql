-- Function to update an organization's plan
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
BEGIN
    -- Only super_admin
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Get current status to preserve active/suspended unless trial logic changes it?
    -- Actually, subscription_status deals with trial/active. status (suspended) is separate.
    
    SELECT subscription_status INTO v_status FROM organizations WHERE id = p_org_id;

    -- Handle Trial Logic
    IF p_start_trial THEN
        v_status := 'trial';
        v_trial_ends := NOW() + INTERVAL '14 days';
    ELSE
        -- If switching off trial, set to active (unless it was something else? assumes active)
        v_status := 'active';
        v_trial_ends := NULL;
    END IF;

    UPDATE organizations 
    SET 
        plan_id = p_plan_id,
        subscription_status = v_status,
        trial_ends_at = v_trial_ends
    WHERE id = p_org_id;

    RETURN TRUE;
END;
$$;
