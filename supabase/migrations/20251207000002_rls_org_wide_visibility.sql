-- =====================================================
-- RLS POLICY UPDATE: Enterprise-Wide Risk Visibility
-- Implements Option C: Org-wide visibility + Owner/Admin editing
-- Date: 2025-12-07
-- =====================================================

-- =====================================================
-- BACKGROUND
-- =====================================================
-- Old behavior: Users could only see their own risks (user_id = auth.uid())
-- New behavior: All users see all org risks, but only owner + admin can edit
--
-- This aligns with enterprise risk management best practices:
-- - Transparency across organization
-- - Prevents risk silos
-- - Enables enterprise-wide view
-- - Maintains proper edit controls

-- =====================================================
-- STEP 1: DROP OLD RESTRICTIVE POLICIES
-- =====================================================

-- Drop the old user-only SELECT policy
DROP POLICY IF EXISTS "Users can view their own risks" ON risks;

-- Drop old user-only UPDATE policy
DROP POLICY IF EXISTS "Users can update their own risks" ON risks;

-- Drop old user-only DELETE policy
DROP POLICY IF EXISTS "Users can delete their own risks" ON risks;

-- Keep admin policies (they're already correct)
-- Keep insert policies (anyone can create)

-- =====================================================
-- STEP 2: CREATE NEW ORG-WIDE VISIBILITY POLICIES
-- =====================================================

-- SELECT Policy: All users see all risks in their organization
DROP POLICY IF EXISTS "Users can view all org risks" ON risks;
CREATE POLICY "Users can view all org risks"
ON risks FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- UPDATE Policy: Only creator OR admin can edit
DROP POLICY IF EXISTS "Owner or admin can update risks" ON risks;
CREATE POLICY "Owner or admin can update risks"
ON risks FOR UPDATE TO authenticated
USING (
  -- Must be in same org AND (is creator OR is admin)
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
  AND (
    user_id = auth.uid() OR   -- Risk creator
    EXISTS (                   -- OR is admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  )
);

-- DELETE Policy: Only creator OR admin can delete
DROP POLICY IF EXISTS "Owner or admin can delete risks" ON risks;
CREATE POLICY "Owner or admin can delete risks"
ON risks FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
  AND (
    user_id = auth.uid() OR   -- Risk creator
    EXISTS (                   -- OR is admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('primary_admin', 'secondary_admin', 'super_admin')
    )
  )
);

-- =====================================================
-- STEP 3: CLEAN UP DUPLICATE POLICIES
-- =====================================================

-- The table has duplicate policies (risks_*_policy).
-- These can be removed as they're redundant with the new policies above.

DROP POLICY IF EXISTS "risks_update_policy" ON risks;
DROP POLICY IF EXISTS "risks_delete_policy" ON risks;

-- Keep risks_insert_policy as it allows anyone to create (correct behavior)

-- =====================================================
-- VERIFICATION
-- =====================================================

-- You can verify the new policies with:
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'risks';

-- Expected policies:
-- 1. "Users can view all org risks" (SELECT) - org-wide visibility
-- 2. "Owner or admin can update risks" (UPDATE) - owner/admin only
-- 3. "Owner or admin can delete risks" (DELETE) - owner/admin only
-- 4. "Users can insert their own risks" (INSERT) - anyone can create
-- 5. Admin policies (Admins can view/update/delete all org risks)

-- Test cases:
-- 1. Non-owner, non-admin should SEE the risk but get error when trying to EDIT
-- 2. Owner should SEE and EDIT the risk
-- 3. Admin should SEE and EDIT any risk
-- 4. Users in different orgs should NOT see each other's risks
