-- ============================================================================
-- STAGING FULL RESET
-- ============================================================================
-- Wipes ALL data, keeping only Super Admin (ayodele.onawunmi@gmail.com)
-- Target: Staging database (oydbriokgjuwxndlsocd) ONLY
-- ============================================================================

-- Disable ALL triggers (including FK constraints) via replication role
SET session_replication_role = 'replica';

-- Verify Super Admin exists
DO $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM auth.users WHERE email = 'ayodele.onawunmi@gmail.com';
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'Super Admin not found! Aborting.';
    END IF;
    RAISE NOTICE 'Super Admin: %', v_id;
END $$;

-- Delete from EVERY table (alphabetical, order doesn't matter with triggers off)
DO $$
DECLARE
    tables_to_clear TEXT[] := ARRAY[
        'appetite_breaches',
        'appetite_kri_thresholds',
        'app_configs',
        'archived_controls',
        'archived_risks',
        'audit_log',
        'audit_trail',
        'control_enhancement_plans',
        'controls',
        'external_events',
        'incident_amendments',
        'incident_lifecycle_history',
        'incident_risk_ai_suggestions',
        'incident_risk_links',
        'incident_risk_mapping_history',
        'incident_summary',
        'incidents',
        'indicator_breaches',
        'intelligence_alerts',
        'intelligence_risk_matches',
        'kri_alerts',
        'kri_data_entries',
        'kri_definitions',
        'kri_risk_links',
        'kri_values',
        'kris',
        'library_generation_log',
        'org_controls',
        'org_impact_kci_mapping',
        'org_impacts',
        'org_kri_kci',
        'org_root_cause_kri_mapping',
        'org_root_causes',
        'organization_regulators',
        'period_commits',
        'active_period',
        'regulator_access',
        'regulatory_reports',
        'risk_appetite',
        'risk_appetite_breaches',
        'risk_appetite_categories',
        'risk_appetite_history',
        'risk_appetite_statements',
        'risk_control_links',
        'risk_controls',
        'risk_history',
        'risk_impacts',
        'risk_indicators',
        'risk_intelligence_alerts',
        'risk_intelligence_treatment_log',
        'risk_keywords',
        'risk_root_causes',
        'risk_tolerance_exceptions',
        'risks',
        'rss_sources',
        'tolerance_exceptions',
        'tolerance_metrics',
        'user_role_transitions',
        'user_status_transitions',
        'var_scale_config'
    ];
    t TEXT;
    is_table BOOLEAN;
BEGIN
    FOREACH t IN ARRAY tables_to_clear LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = t AND table_type = 'BASE TABLE'
        ) INTO is_table;

        IF is_table THEN
            EXECUTE format('DELETE FROM %I', t);
            RAISE NOTICE 'Cleared: %', t;
        END IF;
    END LOOP;
END $$;

-- Clear self-references in user_profiles
UPDATE user_profiles SET approved_by = NULL, rejected_by = NULL, suspended_by = NULL;

-- Delete all user_profiles except Super Admin
DELETE FROM user_profiles
WHERE id != (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@gmail.com');

-- Delete all auth.users except Super Admin
DELETE FROM auth.users
WHERE email != 'ayodele.onawunmi@gmail.com';

-- Detach Super Admin from org (about to delete orgs)
UPDATE user_profiles SET organization_id = NULL
WHERE id = (SELECT id FROM auth.users WHERE email = 'ayodele.onawunmi@gmail.com');

-- Delete all organizations
DELETE FROM organizations;

-- Re-enable all triggers
SET session_replication_role = 'origin';

-- Verify
DO $$
DECLARE
    v_users INTEGER;
    v_orgs INTEGER;
    v_email TEXT;
BEGIN
    SELECT COUNT(*) INTO v_users FROM auth.users;
    SELECT COUNT(*) INTO v_orgs FROM organizations;
    SELECT email INTO v_email FROM auth.users LIMIT 1;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESET COMPLETE';
    RAISE NOTICE 'Users: % (should be 1)', v_users;
    RAISE NOTICE 'Orgs: % (should be 0)', v_orgs;
    RAISE NOTICE 'Super Admin: %', v_email;
    RAISE NOTICE '========================================';
END $$;
