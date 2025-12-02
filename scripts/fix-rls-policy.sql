-- Fix RLS policy to allow primary_admin and secondary_admin
-- The current policy only checks for 'admin' role

-- Drop old policy
DROP POLICY IF EXISTS "Admins can commit period snapshots" ON risk_snapshots;

-- Create new policy that includes all admin roles
CREATE POLICY "Admins can commit period snapshots"
  ON risk_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'primary_admin', 'secondary_admin')
    )
  );

-- Also fix the delete policy
DROP POLICY IF EXISTS "Admins can delete snapshots" ON risk_snapshots;

CREATE POLICY "Admins can delete snapshots"
  ON risk_snapshots
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'primary_admin', 'secondary_admin')
    )
  );

SELECT '✅ RLS policies updated to allow all admin roles!' as status;
