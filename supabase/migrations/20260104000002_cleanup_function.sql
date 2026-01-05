-- =====================================================
-- DATABASE CLEANUP FUNCTION (COMPREHENSIVE)
-- =====================================================
-- Based on thorough scan of ALL 45+ tables in codebase
-- Called from Admin UI Data Cleanup component
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS cleanup_operational_data;

CREATE OR REPLACE FUNCTION cleanup_operational_data(
  p_scope TEXT DEFAULT 'current_org',  -- 'all_orgs' or 'current_org'
  p_organization_id UUID DEFAULT NULL   -- Required if scope is 'current_org'
)
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT,
  status TEXT
) AS $$
DECLARE
  v_tables TEXT[] := ARRAY[
    -- ============================================
    -- JUNCTION/CHILD TABLES (delete first due to FK)
    -- ============================================
    'kri_risk_links',
    'incident_risk_links',
    'risk_control_links',
    'incident_risk_mapping_history',
    'incident_risk_ai_suggestions',
    'incident_lifecycle_history',
    'incident_amendments',
    
    -- KRI-related
    'kri_data_entries',
    'kri_values',
    'kri_alerts',
    
    -- Risk-related junctions
    'risk_controls',
    'risk_indicators',
    'risk_root_causes',
    'risk_impacts',
    'risk_history',
    
    -- Appetite/Tolerance tracking
    'appetite_breaches',
    'tolerance_exceptions',
    'appetite_kri_thresholds',
    'tolerance_metrics',
    'risk_appetite_breaches',
    'indicator_breaches',
    
    -- Intelligence
    'risk_intelligence_alerts',
    'risk_intelligence_treatment_log',
    'intelligence_risk_matches',
    'intelligence_alerts',
    
    -- Period tracking
    'period_commits',
    
    -- User transitions
    'user_status_transitions',
    'user_role_transitions',
    
    -- ============================================
    -- MAIN OPERATIONAL TABLES
    -- ============================================
    'risks',
    'controls',
    'kri_definitions',
    'kris',
    'incidents',
    'incident_summary',
    'external_events',
    
    -- Org-level customizations
    'org_controls',
    'org_kri_kci',
    'org_root_cause_kri_mapping',
    'org_impact_kci_mapping',
    'org_root_causes',
    'org_impacts',
    
    -- Appetite framework
    'risk_appetite_categories',
    'risk_appetite_statements',
    'risk_appetite',
    'risk_tolerance_exceptions',
    
    -- Audit
    'audit_log',
    'audit_trail',
    
    -- Intelligence
    'risk_keywords',
    'rss_sources',
    
    -- Periods
    'active_period',
    
    -- Registers
    'root_cause_register',
    'impact_register',
    'control_library',
    'kri_kci_library',
    
    -- Global library tables
    'global_root_cause_kri_mapping',
    'global_impact_kci_mapping',
    'global_control_task_mapping',
    'global_control_library',
    'global_kri_kci_library',
    'global_root_cause_library',
    'global_impact_library'
  ];
  v_table TEXT;
  v_count BIGINT;
  v_has_org_col BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_scope = 'current_org' AND p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required when scope is current_org';
  END IF;

  -- Disable triggers temporarily
  SET session_replication_role = 'replica';

  FOREACH v_table IN ARRAY v_tables
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE information_schema.tables.table_name = v_table) THEN
      -- Check if table has organization_id column
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE information_schema.columns.table_name = v_table 
        AND column_name = 'organization_id'
      ) INTO v_has_org_col;

      IF p_scope = 'all_orgs' OR NOT v_has_org_col THEN
        -- Delete all rows
        EXECUTE format('DELETE FROM %I WHERE true', v_table);
        GET DIAGNOSTICS v_count = ROW_COUNT;
      ELSE
        -- Delete only for specific organization
        EXECUTE format('DELETE FROM %I WHERE organization_id = $1', v_table) USING p_organization_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
      END IF;

      table_name := v_table;
      rows_deleted := v_count;
      status := 'cleared';
      RETURN NEXT;
    ELSE
      table_name := v_table;
      rows_deleted := 0;
      status := 'not_found';
      RETURN NEXT;
    END IF;
  END LOOP;

  -- Re-enable triggers
  SET session_replication_role = 'origin';

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_operational_data TO authenticated;

COMMENT ON FUNCTION cleanup_operational_data IS 
  'Comprehensive cleanup of all 45+ operational tables. scope="all_orgs" for complete cleanup or scope="current_org" with organization_id for org-specific cleanup. Preserves user_profiles, organizations, and taxonomy.';
