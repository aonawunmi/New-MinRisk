-- =====================================================
-- COMPLETE DATA CLEANUP SCRIPT (SAFE VERSION)
-- =====================================================
-- Uses IF EXISTS checks to avoid errors on missing tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- =====================================================
-- HELPER: Safe delete that ignores missing tables
-- =====================================================
DO $$
DECLARE
  tables_to_clear TEXT[] := ARRAY[
    -- Junction tables first
    'risk_controls',
    'risk_indicators', 
    'risk_root_causes',
    'risk_impacts',
    'indicator_breaches',
    'kri_alerts',
    'tolerance_exceptions',
    'appetite_kri_thresholds',
    'tolerance_metrics',
    'risk_appetite_breaches',
    -- Main operational tables
    'risks',
    'org_controls',
    'org_kri_kci',
    'org_root_cause_kri_mapping',
    'org_impact_kci_mapping',
    'risk_appetite_categories',
    'risk_appetite_statements',
    'risk_appetite',
    'risk_tolerance_exceptions',
    'incidents',
    'audit_log',
    -- Intelligence data
    'intelligence_risk_matches',
    'intelligence_alerts',
    'risk_keywords',
    'rss_sources',
    -- Periods
    'active_period',
    -- Org customizations
    'org_root_causes',
    'org_impacts'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_clear
  LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('DELETE FROM %I WHERE true', t);
      RAISE NOTICE 'Cleared table: %', t;
    ELSE
      RAISE NOTICE 'Table not found (skipped): %', t;
    END IF;
  END LOOP;
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Cleanup complete!' AS status;
