-- =====================================================
-- ENHANCED CLEANUP FUNCTION WITH TAXONOMY RESET
-- =====================================================
-- Adds:
-- 1. divisions and departments tables to cleanup
-- 2. Optional taxonomy reset parameter
-- =====================================================

-- Drop existing function (need to drop with all signatures)
DROP FUNCTION IF EXISTS cleanup_operational_data(TEXT, UUID);
DROP FUNCTION IF EXISTS cleanup_operational_data(TEXT, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION cleanup_operational_data(
  p_scope TEXT DEFAULT 'current_org',  -- 'all_orgs' or 'current_org'
  p_organization_id UUID DEFAULT NULL,  -- Required if scope is 'current_org'
  p_reset_taxonomy BOOLEAN DEFAULT FALSE  -- Optional: also reset taxonomy to defaults
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
    -- ORGANIZATIONAL STRUCTURE (NEW)
    -- ============================================
    'departments',  -- Must be before divisions due to FK
    'divisions',
    
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
    'active_period'
  ];
  v_taxonomy_tables TEXT[] := ARRAY[
    'risk_subcategories',  -- Must be before categories due to FK
    'risk_categories'
  ];
  v_table TEXT;
  v_count BIGINT;
  v_has_org_col BOOLEAN;
  v_industry_type TEXT;
BEGIN
  -- Validate inputs
  IF p_scope = 'current_org' AND p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required when scope is current_org';
  END IF;

  -- NOTE: session_replication_role requires superuser, so we rely on proper
  -- delete order (child tables before parent tables) defined in v_tables array

  -- ==============================================
  -- CLEANUP OPERATIONAL TABLES
  -- ==============================================
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE information_schema.tables.table_name = v_table) THEN
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE information_schema.columns.table_name = v_table 
        AND column_name = 'organization_id'
      ) INTO v_has_org_col;

      IF p_scope = 'all_orgs' OR NOT v_has_org_col THEN
        EXECUTE format('DELETE FROM %I WHERE true', v_table);
        GET DIAGNOSTICS v_count = ROW_COUNT;
      ELSE
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

  -- ==============================================
  -- OPTIONAL: RESET TAXONOMY
  -- ==============================================
  IF p_reset_taxonomy THEN
    -- Clear taxonomy tables
    FOREACH v_table IN ARRAY v_taxonomy_tables
    LOOP
      IF EXISTS (SELECT FROM information_schema.tables WHERE information_schema.tables.table_name = v_table) THEN
        IF p_scope = 'all_orgs' THEN
          EXECUTE format('DELETE FROM %I WHERE true', v_table);
          GET DIAGNOSTICS v_count = ROW_COUNT;
        ELSE
          EXECUTE format('DELETE FROM %I WHERE organization_id = $1', v_table) USING p_organization_id;
          GET DIAGNOSTICS v_count = ROW_COUNT;
        END IF;

        table_name := v_table;
        rows_deleted := v_count;
        status := 'cleared';
        RETURN NEXT;
      END IF;
    END LOOP;

    -- Re-seed taxonomy from industry defaults
    -- Get organization's industry type
    IF p_scope = 'current_org' AND p_organization_id IS NOT NULL THEN
      SELECT industry_type INTO v_industry_type
      FROM organizations
      WHERE id = p_organization_id;

      -- Seed default categories based on industry
      IF v_industry_type IS NOT NULL THEN
        -- Insert default categories for this industry
        INSERT INTO risk_categories (organization_id, name, description, display_order)
        SELECT 
          p_organization_id,
          CASE v_industry_type
            WHEN 'financial_services' THEN cat
            WHEN 'healthcare' THEN cat
            WHEN 'technology' THEN cat
            WHEN 'manufacturing' THEN cat
            ELSE cat
          END,
          '',
          row_number() OVER ()
        FROM unnest(ARRAY[
          'Strategic Risk',
          'Operational Risk',
          'Financial Risk',
          'Compliance Risk',
          'Technology Risk',
          'Reputational Risk'
        ]) AS cat
        ON CONFLICT (organization_id, name) DO NOTHING;

        table_name := 'risk_categories';
        rows_deleted := 0;
        status := 'reseeded';
        RETURN NEXT;
      END IF;
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_operational_data(TEXT, UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION cleanup_operational_data IS 
  'Comprehensive cleanup of operational tables including divisions/departments. 
   Optional p_reset_taxonomy=TRUE clears and reseeds risk categories.
   scope="all_orgs" for complete cleanup or scope="current_org" with organization_id for org-specific.';
