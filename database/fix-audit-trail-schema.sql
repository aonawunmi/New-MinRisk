-- ============================================================================
-- FIX: Allow NULL Organization in AUDIT_TRAIL (For Super Admin)
-- ============================================================================
-- Problem: audit_user_profiles_trigger writes to 'audit_trail'.
--          Super Admin has NULL org, causing NOT NULL violation on insert.
-- Fix: Make organization_id NULLABLE in audit_trail.
--      Update RLS policies for audit_trail.
-- ============================================================================

-- 1. Alter Table
ALTER TABLE audit_trail ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Update RLS Policies
-- Allow Super Admins to see ALL logs in audit_trail
DROP POLICY IF EXISTS "Super admins can view all audit trails" ON audit_trail;
CREATE POLICY "Super admins can view all audit trails" ON audit_trail
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Verification
SELECT 
    table_name, 
    column_name, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
  AND column_name = 'organization_id';
