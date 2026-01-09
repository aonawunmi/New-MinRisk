-- =====================================================
-- FIX TAXONOMY RLS POLICIES
-- =====================================================
-- Add INSERT, UPDATE, DELETE policies for risk_categories
-- and risk_subcategories to allow admins to manage taxonomy
-- =====================================================

-- risk_categories policies
DO $$ BEGIN
CREATE POLICY "Admins can insert risk_categories" ON risk_categories
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Admins can update risk_categories" ON risk_categories
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Admins can delete risk_categories" ON risk_categories
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can view org risk_categories" ON risk_categories
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- risk_subcategories policies
DO $$ BEGIN
CREATE POLICY "Admins can insert risk_subcategories" ON risk_subcategories
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Admins can update risk_subcategories" ON risk_subcategories
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Admins can delete risk_subcategories" ON risk_subcategories
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'primary_admin', 'secondary_admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can view org risk_subcategories" ON risk_subcategories
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
