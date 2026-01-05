-- =====================================================
-- COMPREHENSIVE DATA CLEANUP SCRIPT
-- =====================================================
-- Based on thorough scan of ALL table references in codebase
-- Filters out VIEWS (only deletes from actual tables)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

DO $$
DECLARE
  tables_to_clear TEXT[] := ARRAY[
    'kri_risk_links',
    'incident_risk_links',
    'risk_control_links',
    'incident_risk_mapping_history',
    'incident_risk_ai_suggestions',
    'incident_lifecycle_history',
    'incident_amendments',
    'kri_data_entries',
    'kri_values',
    'kri_alerts',
    'risk_controls',
    'risk_indicators',
    'risk_root_causes',
    'risk_impacts',
    'risk_history',
    'appetite_breaches',
    'tolerance_exceptions',
    'appetite_kri_thresholds',
    'tolerance_metrics',
    'risk_appetite_breaches',
    'indicator_breaches',
    'risk_intelligence_alerts',
    'risk_intelligence_treatment_log',
    'intelligence_risk_matches',
    'intelligence_alerts',
    'period_commits',
    'user_status_transitions',
    'user_role_transitions',
    'risks',
    'controls',
    'kri_definitions',
    'kris',
    'incidents',
    'incident_summary',
    'external_events',
    'org_controls',
    'org_kri_kci',
    'org_root_cause_kri_mapping',
    'org_impact_kci_mapping',
    'org_root_causes',
    'org_impacts',
    'risk_appetite_categories',
    'risk_appetite_statements',
    'risk_appetite',
    'risk_tolerance_exceptions',
    'audit_log',
    'audit_trail',
    'risk_keywords',
    'rss_sources',
    'active_period',
    'root_cause_register',
    'impact_register',
    'control_library',
    'kri_kci_library',
    'global_root_cause_kri_mapping',
    'global_impact_kci_mapping',
    'global_control_task_mapping',
    'global_control_library',
    'global_kri_kci_library',
    'global_root_cause_library',
    'global_impact_library'
  ];
  t TEXT;
  deleted_count INTEGER := 0;
  is_base_table BOOLEAN;
BEGIN
  FOREACH t IN ARRAY tables_to_clear
  LOOP
    -- Check if it's a BASE TABLE (not a view)
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = t 
      AND table_type = 'BASE TABLE'
    ) INTO is_base_table;
    
    IF is_base_table THEN
      EXECUTE format('DELETE FROM %I WHERE true', t);
      deleted_count := deleted_count + 1;
      RAISE NOTICE 'Cleared table: %', t;
    ELSE
      RAISE NOTICE 'Skipped (view or not found): %', t;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'CLEANUP COMPLETE: % tables cleared', deleted_count;
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

SELECT 'COMPREHENSIVE CLEANUP COMPLETE!' AS status;
