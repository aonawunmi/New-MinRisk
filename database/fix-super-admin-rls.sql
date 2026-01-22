-- ============================================================================
-- FIX: Super Admin RLS Access
-- ============================================================================
-- Problem: Super Admins have organization_id = NULL, so existing RLS policies
--          prevent them from seeing ANY organizations or data.
-- Fix: Add policies permitting 'super_admin' role to view ALL records.
-- ============================================================================

-- 1. Policies for ORGANIZATIONS
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
CREATE POLICY "Super admins can view all organizations" ON organizations
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- 2. Policies for USER_PROFILES (View all users)
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
CREATE POLICY "Super admins can view all profiles" ON user_profiles
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- 3. Policies for APP_CONFIGS
DROP POLICY IF EXISTS "Super admins can view all configs" ON app_configs;
CREATE POLICY "Super admins can view all configs" ON app_configs
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Verification: Check if super admin can see organizations
SELECT 
    'Checking RLS visibility...' as check_name,
    COUNT(*) as visible_orgs
FROM organizations;
