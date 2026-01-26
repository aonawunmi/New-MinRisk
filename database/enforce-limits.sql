-- ============================================================================
-- Phase 2: Enforcement - Max Users Trigger
-- ============================================================================

-- Function to check limit on insert
CREATE OR REPLACE FUNCTION public.check_user_limit_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_can_add BOOLEAN;
BEGIN
    -- Only check if a new user is being added to an organization
    IF NEW.organization_id IS NOT NULL THEN
        -- Use the helper function we created in Phase 1
        IF NOT public.can_add_user_to_org(NEW.organization_id) THEN
            RAISE EXCEPTION 'User limit reached for this organization. Please upgrade your subscription.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create Trigger
DROP TRIGGER IF EXISTS enforce_user_limit ON public.user_profiles;

CREATE TRIGGER enforce_user_limit
    BEFORE INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_limit_on_insert();

-- Note: This ensures that even if you invite a user via Auth, 
-- when their profile is created, it will fail if the limit is reached.
-- Supabase Auth might create the user in auth.users, but the profile creation will fail, 
-- effectively blocking them (or leaving them in a broken state, which is a hard block).
-- Ideally, we check before invite, but this is the database-level safety net.
