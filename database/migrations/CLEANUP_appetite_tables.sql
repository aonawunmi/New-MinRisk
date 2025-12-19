-- ================================================================
-- CLEANUP SCRIPT: Remove incomplete appetite/tolerance tables
-- ================================================================
-- Run this ONLY if migration failed and you need to start fresh
-- This will DELETE all data in these tables!
-- ================================================================

-- Check what exists first
DO $$
BEGIN
  RAISE NOTICE '=== Checking existing tables ===';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appetite_breaches') THEN
    RAISE NOTICE '✓ appetite_breaches exists';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tolerance_metrics') THEN
    RAISE NOTICE '✓ tolerance_metrics exists';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_appetite_categories') THEN
    RAISE NOTICE '✓ risk_appetite_categories exists';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_appetite_statements') THEN
    RAISE NOTICE '✓ risk_appetite_statements exists';
  END IF;
END $$;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS appetite_breaches CASCADE;
DROP TABLE IF EXISTS tolerance_metrics CASCADE;
DROP TABLE IF EXISTS risk_appetite_categories CASCADE;
DROP TABLE IF EXISTS risk_appetite_statements CASCADE;

-- Confirm cleanup
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Cleanup complete ===';
  RAISE NOTICE 'All appetite/tolerance tables dropped';
  RAISE NOTICE 'You can now run the main migration: 20251213_risk_appetite_tolerance.sql';
END $$;
