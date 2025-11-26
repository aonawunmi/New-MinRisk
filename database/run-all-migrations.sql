/**
 * Master Migration Script
 *
 * Runs all Phase 2 & 3 database migrations in the correct order:
 * 1. KRI Monitoring System (4 tables)
 * 2. Risk Intelligence System (3 tables)
 * 3. Incident Management System (2 tables)
 *
 * Total: 9 new tables with complete RLS policies, indexes, and triggers
 *
 * Date: 2025-01-22
 * Author: MinRisk Development Team
 */

-- ============================================================================
-- MIGRATION START
-- ============================================================================

\echo '========================================='
\echo 'MinRisk Phase 2 & 3 Database Migrations'
\echo '========================================='
\echo ''

-- ============================================================================
-- 1. KRI MONITORING TABLES
-- ============================================================================

\echo '1/3: Creating KRI Monitoring tables...'
\echo ''

\i create-kri-tables.sql

\echo ''
\echo '✅ KRI Monitoring tables created successfully'
\echo '   - kri_definitions'
\echo '   - kri_data_entries'
\echo '   - kri_alerts'
\echo '   - kri_risk_links'
\echo ''

-- ============================================================================
-- 2. RISK INTELLIGENCE TABLES
-- ============================================================================

\echo '2/3: Creating Risk Intelligence tables...'
\echo ''

\i create-risk-intelligence-tables.sql

\echo ''
\echo '✅ Risk Intelligence tables created successfully'
\echo '   - external_events'
\echo '   - intelligence_alerts'
\echo '   - risk_intelligence_treatment_log'
\echo ''

-- ============================================================================
-- 3. INCIDENT MANAGEMENT TABLES
-- ============================================================================

\echo '3/3: Creating Incident Management tables...'
\echo ''

\i create-incidents-tables.sql

\echo ''
\echo '✅ Incident Management tables created successfully'
\echo '   - incidents'
\echo '   - control_enhancement_plans'
\echo ''

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '========================================='
\echo 'Verification'
\echo '========================================='
\echo ''

\echo 'All tables created:'
SELECT
  table_name,
  CASE
    WHEN table_name LIKE 'kri%' THEN 'KRI Monitoring'
    WHEN table_name LIKE '%event%' OR table_name LIKE '%intelligence%' THEN 'Risk Intelligence'
    WHEN table_name IN ('incidents', 'control_enhancement_plans') THEN 'Incident Management'
  END as module
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'kri%'
  OR table_name LIKE '%event%'
  OR table_name LIKE '%intelligence%'
  OR table_name IN ('incidents', 'control_enhancement_plans')
)
ORDER BY module, table_name;

\echo ''
\echo 'RLS Status (all should be TRUE):'
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND (
  tablename LIKE 'kri%'
  OR tablename LIKE '%event%'
  OR tablename LIKE '%intelligence%'
  OR tablename IN ('incidents', 'control_enhancement_plans')
)
ORDER BY tablename;

\echo ''
\echo 'Policy Count:'
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND (
  tablename LIKE 'kri%'
  OR tablename LIKE '%event%'
  OR tablename LIKE '%intelligence%'
  OR tablename IN ('incidents', 'control_enhancement_plans')
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

\echo ''
\echo '========================================='
\echo '✅ All migrations completed successfully!'
\echo '========================================='
\echo ''
\echo 'Summary:'
\echo '  - 9 new tables created'
\echo '  - 36+ RLS policies applied'
\echo '  - 25+ indexes created'
\echo '  - 3 triggers configured'
\echo ''
\echo 'Next Steps:'
\echo '  1. Test KRI Management features'
\echo '  2. Test Risk Intelligence features'
\echo '  3. Test Incident Management features'
\echo ''

