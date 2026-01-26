-- ============================================================================
-- Super Admin: Full CRUD Capabilities
-- ============================================================================
-- Extends existing RLS to allow Super Admin to:
-- 1. Create organizations
-- 2. Update organizations  
-- 3. Create user profiles (for Primary Admins)
-- ============================================================================

-- ============================================================================
-- ORGANIZATIONS: INSERT/UPDATE for Super Admin
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
CREATE POLICY "Super admins can create organizations" ON organizations
    FOR INSERT
    WITH CHECK (
        public.get_my_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
CREATE POLICY "Super admins can update organizations" ON organizations
    FOR UPDATE
    USING (
        public.get_my_role() = 'super_admin'
    )
    WITH CHECK (
        public.get_my_role() = 'super_admin'
    );

-- ============================================================================
-- USER_PROFILES: INSERT for Super Admin (to create Primary Admins)
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can create user profiles" ON user_profiles;
CREATE POLICY "Super admins can create user profiles" ON user_profiles
    FOR INSERT
    WITH CHECK (
        public.get_my_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Super admins can update user profiles" ON user_profiles;
CREATE POLICY "Super admins can update user profiles" ON user_profiles
    FOR UPDATE
    USING (
        public.get_my_role() = 'super_admin'
    )
    WITH CHECK (
        public.get_my_role() = 'super_admin'
    );

-- ============================================================================
-- APP_CONFIGS: INSERT for Super Admin (to initialize org config)
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can create configs" ON app_configs;
CREATE POLICY "Super admins can create configs" ON app_configs
    FOR INSERT
    WITH CHECK (
        public.get_my_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Super admins can update configs" ON app_configs;
CREATE POLICY "Super admins can update configs" ON app_configs
    FOR UPDATE
    USING (
        public.get_my_role() = 'super_admin'
    )
    WITH CHECK (
        public.get_my_role() = 'super_admin'
    );
