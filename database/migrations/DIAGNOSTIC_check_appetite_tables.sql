-- ================================================================
-- DIAGNOSTIC: Check if appetite tables already exist
-- Run this to understand current state before migration
-- ================================================================

-- 1. Check which appetite tables exist
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%appetite%' OR
    table_name LIKE '%tolerance%'
  )
ORDER BY table_name;

-- 2. Check risk_appetite_statements structure if it exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'risk_appetite_statements'
ORDER BY ordinal_position;

-- 3. Check risk_appetite_categories structure if it exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'risk_appetite_categories'
ORDER BY ordinal_position;

-- 4. Check tolerance_metrics structure if it exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tolerance_metrics'
ORDER BY ordinal_position;

-- 5. Check appetite_breaches structure if it exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appetite_breaches'
ORDER BY ordinal_position;

-- 6. Check kri_values structure if it exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'kri_values'
ORDER BY ordinal_position;

-- 7. Summary message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Diagnostic Complete';
  RAISE NOTICE '   Check results above to see which tables exist and their structure';
  RAISE NOTICE '';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_appetite_statements') THEN
    RAISE NOTICE '⚠️  risk_appetite_statements EXISTS - may have incomplete schema';
  ELSE
    RAISE NOTICE '✅ risk_appetite_statements does not exist - safe to create';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tolerance_metrics') THEN
    RAISE NOTICE '⚠️  tolerance_metrics EXISTS - may have incomplete schema';
  ELSE
    RAISE NOTICE '✅ tolerance_metrics does not exist - safe to create';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kri_values') THEN
    RAISE NOTICE '⚠️  kri_values EXISTS - may have incomplete schema';
  ELSE
    RAISE NOTICE '✅ kri_values does not exist - safe to create';
  END IF;

  RAISE NOTICE '';
END $$;
