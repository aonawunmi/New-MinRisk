-- Fix RLS: Users should see ONLY their own risks, not all org risks
-- The current risks_select_policy is org-scoped (WRONG for users)

-- Drop the incorrect org-scoped user policy
DROP POLICY IF EXISTS "risks_select_policy" ON risks;

-- Create correct user-scoped policy
CREATE POLICY "Users can view their own risks"
  ON risks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create user policies for INSERT, UPDATE, DELETE (if missing)
DROP POLICY IF EXISTS "Users can insert their own risks" ON risks;
CREATE POLICY "Users can insert their own risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = current_org_id());

DROP POLICY IF EXISTS "Users can update their own risks" ON risks;
CREATE POLICY "Users can update their own risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own risks" ON risks;
CREATE POLICY "Users can delete their own risks"
  ON risks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Verify the fix: List all SELECT policies
SELECT
  '✅ FIXED SELECT Policies' as status,
  policyname as "Policy Name",
  qual as "USING Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'risks'
  AND cmd = 'SELECT'
ORDER BY policyname;
