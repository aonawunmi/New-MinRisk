-- Restore views dropped by cascading migration
-- Date: 2026-01-08

-- 1. Restore root_cause_kris_view
DROP VIEW IF EXISTS root_cause_kris_view;
CREATE OR REPLACE VIEW root_cause_kris_view AS
SELECT
  rc.cause_code,
  rc.cause_name,
  kri.indicator_code,
  kri.indicator_name,
  mapping.relevance_score,
  mapping.source
FROM root_cause_register rc
INNER JOIN root_cause_kri_mapping mapping ON rc.id = mapping.root_cause_id
INNER JOIN kri_kci_library kri ON mapping.kri_id = kri.id
WHERE kri.indicator_type = 'KRI'
ORDER BY rc.cause_code, mapping.relevance_score DESC;

-- 2. Restore impact_kcis_view
DROP VIEW IF EXISTS impact_kcis_view;
CREATE OR REPLACE VIEW impact_kcis_view AS
SELECT
  imp.impact_code,
  imp.impact_name,
  kci.indicator_code,
  kci.indicator_name,
  mapping.relevance_score,
  mapping.source
FROM impact_register imp
INNER JOIN impact_kci_mapping mapping ON imp.id = mapping.impact_id
INNER JOIN kri_kci_library kci ON mapping.kci_id = kci.id
WHERE kci.indicator_type = 'KCI'
ORDER BY imp.impact_code, mapping.relevance_score DESC;

-- 3. Restore risk_decomposition_view
DROP VIEW IF EXISTS risk_decomposition_view;
CREATE OR REPLACE VIEW risk_decomposition_view AS
SELECT
  r.id,
  r.risk_title,
  r.organization_id,
  jsonb_agg(DISTINCT jsonb_build_object(
    'cause_code', rc.cause_code,
    'cause_name', rc.cause_name,
    'is_primary', rrc.is_primary,
    'contribution_pct', rrc.contribution_percentage
  )) FILTER (WHERE rc.id IS NOT NULL) as all_root_causes,
  jsonb_agg(DISTINCT jsonb_build_object(
    'impact_code', imp.impact_code,
    'impact_name', imp.impact_name,
    'is_primary', ri.is_primary,
    'severity_pct', ri.severity_percentage
  )) FILTER (WHERE imp.id IS NOT NULL) as all_impacts
FROM risks r
LEFT JOIN risk_root_causes rrc ON r.id = rrc.risk_id
LEFT JOIN root_cause_register rc ON rrc.root_cause_id = rc.id
LEFT JOIN risk_impacts ri ON r.id = ri.risk_id
LEFT JOIN impact_register imp ON ri.impact_id = imp.id
GROUP BY r.id, r.risk_title, r.organization_id;

-- 4. Restore control_implementation_readiness_view
DROP VIEW IF EXISTS control_implementation_readiness_view;
CREATE OR REPLACE VIEW control_implementation_readiness_view AS
SELECT
  automation_level,
  complexity_level,
  COUNT(*) as control_count,
  ROUND(AVG((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0), 1) as avg_dime,
  ARRAY_AGG(control_code ORDER BY control_code) as control_codes
FROM control_library
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
GROUP BY automation_level, complexity_level
ORDER BY
  CASE automation_level
    WHEN 'Fully-Automated' THEN 1
    WHEN 'Semi-Automated' THEN 2
    WHEN 'Manual' THEN 3
  END,
  CASE complexity_level
    WHEN 'Basic' THEN 1
    WHEN 'Intermediate' THEN 2
    WHEN 'Advanced' THEN 3
  END;

-- 5. Restore controls_due_for_testing_view
DROP VIEW IF EXISTS controls_due_for_testing_view;
CREATE OR REPLACE VIEW controls_due_for_testing_view AS
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  MAX(t.test_date) as last_test_date,
  MAX(t.next_test_date) as next_test_date,
  CASE
    WHEN MAX(t.next_test_date) < CURRENT_DATE THEN 'Overdue'
    WHEN MAX(t.next_test_date) <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due Soon'
    ELSE 'Scheduled'
  END as test_status
FROM control_library c
LEFT JOIN control_effectiveness_tests t ON c.id = t.control_id
GROUP BY c.id, c.control_code, c.control_name, c.organization_id
HAVING MAX(t.next_test_date) IS NULL OR MAX(t.next_test_date) <= CURRENT_DATE + INTERVAL '60 days';

-- 6. Restore active_breaches_view
DROP VIEW IF EXISTS active_breaches_view;
CREATE OR REPLACE VIEW active_breaches_view AS
SELECT
  b.id,
  b.organization_id,
  k.indicator_code,
  k.indicator_name,
  k.indicator_type,
  b.breach_level,
  b.measured_value,
  b.threshold_value,
  b.breach_percentage,
  b.breach_date,
  EXTRACT(EPOCH FROM (NOW() - b.breach_date)) / 3600 as hours_since_breach,
  b.status
FROM indicator_breaches b
INNER JOIN kri_kci_library k ON b.indicator_id = k.id
WHERE b.status IN ('active', 'investigating')
ORDER BY b.breach_level DESC, b.breach_date ASC;
