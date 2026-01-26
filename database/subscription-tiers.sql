-- ============================================================================
-- Phase 1: Subscription Tiers & White-Labeling Database Foundation
-- ============================================================================

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    max_users INT, -- NULL = unlimited
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed default plans
INSERT INTO public.subscription_plans (name, max_users, price_monthly, features, is_active) VALUES
('Starter', 5, 150.00, 
 '{"risk_register": true, "controls_library": true, "kri_monitoring": true, "basic_incidents": true, "basic_ai": true, "ai_full": false, "risk_intel": false, "sso": false, "board_reporting": false}'::jsonb, 
 true),
('Professional', 20, 300.00, 
 '{"risk_register": true, "controls_library": true, "kri_monitoring": true, "basic_incidents": true, "basic_ai": true, "ai_full": true, "risk_intel": true, "sso": false, "board_reporting": true}'::jsonb, 
 true),
('Enterprise', NULL, 1000.00, 
 '{"risk_register": true, "controls_library": true, "kri_monitoring": true, "basic_incidents": true, "basic_ai": true, "ai_full": true, "risk_intel": true, "sso": true, "board_reporting": true}'::jsonb, 
 true),
('Enterprise Plus', NULL, 1500.00, 
 '{"risk_register": true, "controls_library": true, "kri_monitoring": true, "basic_incidents": true, "basic_ai": true, "ai_full": true, "risk_intel": true, "sso": true, "board_reporting": true, "dedicated_instance": true}'::jsonb, 
 true)
ON CONFLICT (name) DO NOTHING;

-- 3. Add subscription & branding columns to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 4. RLS for subscription_plans (read by authenticated, write by super_admin)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view plans" ON public.subscription_plans
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admin can manage plans" ON public.subscription_plans;
CREATE POLICY "Super admin can manage plans" ON public.subscription_plans
    FOR ALL TO authenticated USING (public.get_my_role() = 'super_admin');

-- 5. Function to get organization's plan features
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
        SELECT organization_id INTO v_org_id FROM user_profiles WHERE id = auth.uid();
    ELSE
        v_org_id := p_org_id;
    END IF;

    -- Get features from plan
    SELECT sp.features INTO v_features
    FROM organizations o
    JOIN subscription_plans sp ON sp.id = o.plan_id
    WHERE o.id = v_org_id;

    -- Return empty if no plan assigned (default to all false)
    RETURN COALESCE(v_features, '{}'::jsonb);
END;
$$;

-- 6. Function to check subscription status (enhanced login gate)
CREATE OR REPLACE FUNCTION public.check_subscription_status(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_trial_ends TIMESTAMPTZ;
BEGIN
    SELECT subscription_status, trial_ends_at 
    INTO v_status, v_trial_ends
    FROM organizations 
    WHERE id = p_org_id;

    -- Check trial expiry
    IF v_status = 'trial' AND v_trial_ends IS NOT NULL AND NOW() > v_trial_ends THEN
        RETURN 'trial_expired';
    END IF;

    -- Check other statuses
    IF v_status = 'suspended' THEN
        RETURN 'suspended';
    END IF;

    IF v_status = 'cancelled' THEN
        RETURN 'cancelled';
    END IF;

    RETURN 'active';
END;
$$;

-- 7. Function to check if user can be added (respects max_users limit)
CREATE OR REPLACE FUNCTION public.can_add_user_to_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_users INT;
    v_current_count INT;
BEGIN
    -- Get max users from plan
    SELECT sp.max_users INTO v_max_users
    FROM organizations o
    JOIN subscription_plans sp ON sp.id = o.plan_id
    WHERE o.id = p_org_id;

    -- NULL means unlimited
    IF v_max_users IS NULL THEN
        RETURN true;
    END IF;

    -- Count current users
    SELECT COUNT(*) INTO v_current_count
    FROM user_profiles
    WHERE organization_id = p_org_id;

    RETURN v_current_count < v_max_users;
END;
$$;

-- 8. Super Admin RPC to list subscription plans
CREATE OR REPLACE FUNCTION public.list_subscription_plans()
RETURNS TABLE (
    id UUID,
    name TEXT,
    max_users INT,
    price_monthly DECIMAL,
    features JSONB,
    is_active BOOLEAN,
    org_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.name,
        sp.max_users,
        sp.price_monthly,
        sp.features,
        sp.is_active,
        COUNT(o.id) as org_count
    FROM subscription_plans sp
    LEFT JOIN organizations o ON o.plan_id = sp.id
    GROUP BY sp.id, sp.name, sp.max_users, sp.price_monthly, sp.features, sp.is_active
    ORDER BY sp.price_monthly ASC;
END;
$$;

-- 9. Super Admin RPC to create/update plan
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
    IF public.get_my_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF p_id IS NULL THEN
        -- Create new
        INSERT INTO subscription_plans (name, max_users, price_monthly, features, is_active)
        VALUES (p_name, p_max_users, p_price_monthly, p_features, p_is_active)
        RETURNING id INTO v_plan_id;
    ELSE
        -- Update existing
        UPDATE subscription_plans
        SET 
            name = COALESCE(p_name, name),
            max_users = p_max_users,
            price_monthly = COALESCE(p_price_monthly, price_monthly),
            features = COALESCE(p_features, features),
            is_active = COALESCE(p_is_active, is_active),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_plan_id;
    END IF;

    RETURN v_plan_id;
END;
$$;
