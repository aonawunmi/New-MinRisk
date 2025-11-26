-- Check the exact SELECT policies on risks table
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  qual as "USING Expression",
  with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'risks'
  AND cmd = 'SELECT'
ORDER BY policyname;
