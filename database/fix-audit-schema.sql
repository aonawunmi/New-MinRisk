-- ============================================================================
-- FIX: Allow NULL Organization in Audit Tables (For Super Admin)
-- ============================================================================
-- Problem: Super Admin has organization_id = NULL. 
--          Audit tables enforce NOT NULL on organization_id.
--          Any audit event for Super Admin crashes the transaction.
--
-- Fix: 1. Make organization_id NULLABLE in audit tables.
--      2. Update RLS policies to allow reading NULL org logs.
-- ============================================================================

-- 1. Alter Tables to allow NULL organization_id
ALTER TABLE user_status_transitions ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE user_role_transitions ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Update RLS Policies for user_status_transitions
-- Allow Super Admins to see ALL logs (including NULL org)
DROP POLICY IF EXISTS "audit_status_read_all_super_admin" ON user_status_transitions;
CREATE POLICY "audit_status_read_all_super_admin" ON user_status_transitions
    FOR SELECT
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- 3. Update RLS Policies for user_role_transitions
-- Allow Super Admins to see ALL logs (including NULL org)
DROP POLICY IF EXISTS "audit_role_read_all_super_admin" ON user_role_transitions;
CREATE POLICY "audit_role_read_all_super_admin" ON user_role_transitions
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
WHERE table_name IN ('user_status_transitions', 'user_role_transitions') 
  AND column_name = 'organization_id';
