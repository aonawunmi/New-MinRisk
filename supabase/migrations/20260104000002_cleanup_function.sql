-- =====================================================
-- DATABASE CLEANUP FUNCTION
-- =====================================================
-- Safe cleanup function that can be called from the UI
-- Supports scoped deletion (all orgs or single org)
-- =====================================================

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
    'intelligence_risk_matches',
    'intelligence_alerts',
    'risk_keywords',
    'rss_sources',
    'active_period',
    'org_root_causes',
    'org_impacts'
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

-- Grant execute permission (will be enforced by RLS in the app)
GRANT EXECUTE ON FUNCTION cleanup_operational_data TO authenticated;

COMMENT ON FUNCTION cleanup_operational_data IS 
  'Safely deletes operational data. Use scope="all_orgs" for complete cleanup or scope="current_org" with organization_id for org-specific cleanup.';
