-- Safety check before dropping risk_snapshots table
-- Run this FIRST to see what exists

SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT 'SAFETY CHECK: Current state of risk_snapshots' as title;
SELECT '═══════════════════════════════════════════════════════════' as separator;

-- Check 1: Does the table exist?
SELECT
  'Table Exists' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'risk_snapshots'
  ) THEN '✅ YES' ELSE '❌ NO' END as result;

-- Check 2: What columns does it have?
SELECT
  'Current Columns' as check_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'risk_snapshots';

-- Check 3: Are there any foreign keys TO this table?
SELECT
  'Foreign Keys TO risk_snapshots' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '⚠️ ' || COUNT(*) || ' dependencies found' ELSE '✅ No dependencies' END as result,
  COALESCE(string_agg(
    tc.table_name || '.' || kcu.column_name,
    ', '
  ), 'None') as dependent_tables
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'risk_snapshots';

-- Check 4: How much data is in the table?
SELECT
  'Data Count' as check_name,
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_snapshots')
    THEN (SELECT COUNT(*)::text || ' snapshots' FROM risk_snapshots)
    ELSE 'Table does not exist'
  END as result;

-- Check 5: If there's data, show it
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_snapshots') THEN
    IF (SELECT COUNT(*) FROM risk_snapshots) > 0 THEN
      RAISE NOTICE '⚠️ WARNING: Table contains data that will be lost!';
    ELSE
      RAISE NOTICE '✅ Table is empty - safe to drop';
    END IF;
  END IF;
END $$;

-- Show any existing snapshots
SELECT
  '═══════════════════════════════════════════════════════════' as separator
UNION ALL
SELECT 'Existing Snapshots (if any):';

SELECT
  period,
  snapshot_date,
  risk_count,
  notes
FROM risk_snapshots
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'risk_snapshots'
)
ORDER BY snapshot_date;

-- Final recommendation
SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT
  CASE
    WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_snapshots')
    THEN '✅ SAFE: Table does not exist yet - run the fix script'
    WHEN (SELECT COUNT(*) FROM risk_snapshots) = 0
    THEN '✅ SAFE: Table is empty - safe to drop and recreate'
    ELSE '⚠️ WARNING: Table contains ' || (SELECT COUNT(*)::text FROM risk_snapshots) || ' snapshots that will be lost!'
  END as recommendation;
