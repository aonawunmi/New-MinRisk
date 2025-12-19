-- ================================================================
-- DIAGNOSTIC: Check which migrations have been applied
-- Run this in Supabase SQL Editor
-- ================================================================

-- Check Supabase migration tracking table
SELECT
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 50;

-- Alternative: Check if tracking table exists differently
SELECT
  *
FROM information_schema.tables
WHERE table_name LIKE '%migration%'
  OR table_name LIKE '%schema%';
