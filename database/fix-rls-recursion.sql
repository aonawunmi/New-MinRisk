-- ============================================================================
-- FIX: Infinite Recursion in User Profiles RLS (v2 - Fixed Types)
-- ============================================================================
-- Problem: Infinite recursion in RLS. Recursion fix v1 had type mismatch.
-- Fix: Make helper function return TEXT (safest for comparisons).
-- ============================================================================

-- 1. Create Helper Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text  -- Changed from user_role to text for safety
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Cast the enum to text explicitly
  SELECT role::text FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 2. Update USER_PROFILES Policy
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;

CREATE POLICY "Super admins can view all profiles" ON user_profiles
    FOR SELECT
    USING (
        get_my_role() = 'super_admin'
    );

-- 3. Update ORGANIZATIONS Policy
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;

CREATE POLICY "Super admins can view all organizations" ON organizations
    FOR SELECT
    USING (
        get_my_role() = 'super_admin'
    );

-- 4. Update AUDIT_TRAIL Policy
DROP POLICY IF EXISTS "Super admins can view all audit trails" ON audit_trail;

CREATE POLICY "Super admins can view all audit trails" ON audit_trail
    FOR SELECT
    USING (
        get_my_role() = 'super_admin'
    );

-- 5. Update APP_CONFIGS Policy
DROP POLICY IF EXISTS "Super admins can view all configs" ON app_configs;

CREATE POLICY "Super admins can view all configs" ON app_configs
    FOR SELECT
    USING (
        get_my_role() = 'super_admin'
    );
