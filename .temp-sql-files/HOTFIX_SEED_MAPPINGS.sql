-- HOTFIX: Seed Global Mappings
-- Run this AFTER seeding global libraries
-- This populates global_root_cause_kri_mapping and global_impact_kci_mapping

-- ============================================================================
-- SEED ROOT CAUSE → KRI MAPPINGS (~90 mappings)
-- ============================================================================

INSERT INTO global_root_cause_kri_mapping (global_root_cause_id, global_kri_id, relevance_score)
SELECT
  grc.id as global_root_cause_id,
  gkri.id as global_kri_id,
  mapping.relevance_score
FROM (VALUES
  -- Infrastructure & Capacity Root Causes
  ('RC-001', 'KRI-001', 100), -- CPU > 80%
  ('RC-001', 'KRI-002', 100), -- Memory saturation
  ('RC-001', 'KRI-007', 95),  -- Queue backlog growth
  ('RC-001', 'KRI-005', 80),  -- API failure rates

  ('RC-002', 'KRI-003', 100), -- Disk I/O latency
  ('RC-002', 'KRI-004', 90),  -- Network packet loss
  ('RC-002', 'KRI-007', 85),  -- Queue backlog

  ('RC-003', 'KRI-001', 95),  -- CPU saturation
  ('RC-003', 'KRI-002', 95),  -- Memory saturation
  ('RC-003', 'KRI-003', 90),  -- Disk I/O

  ('RC-004', 'KRI-007', 100), -- Queue backlog
  ('RC-004', 'KRI-006', 95),  -- Interface timeouts

  ('RC-005', 'KRI-001', 90),  -- CPU usage
  ('RC-005', 'KRI-002', 90),  -- Memory usage

  ('RC-006', 'KRI-008', 85),  -- Microservice errors
  ('RC-006', 'KRI-006', 80),  -- Interface timeouts

  -- Human Error Root Causes
  ('RC-007', 'KRI-005', 95),  -- API failures
  ('RC-007', 'KRI-018', 95),  -- SOP violations
  ('RC-007', 'KRI-016', 90),  -- Data mismatch

  ('RC-026', 'KRI-005', 85),  -- API failures
  ('RC-026', 'KRI-018', 90),  -- SOP violations

  ('RC-031', 'KRI-018', 95),  -- SOP violations
  ('RC-031', 'KRI-017', 85),  -- Manual overrides

  ('RC-035', 'KRI-019', 95),  -- Staffing issues
  ('RC-035', 'KRI-020', 100), -- Burnout metrics

  -- Change Management Root Causes
  ('RC-018', 'KRI-005', 90),  -- API failures (Change management failure)
  ('RC-018', 'KRI-017', 95),  -- Manual overrides
  ('RC-018', 'KRI-018', 85),  -- SOP violations

  ('RC-036', 'KRI-005', 95),  -- API failures (Inadequate testing)
  ('RC-036', 'KRI-008', 90),  -- Microservice errors

  ('RC-037', 'KRI-005', 85),  -- API failures (Poor requirements)
  ('RC-037', 'KRI-016', 90),  -- Data mismatches

  -- Vendor & Third-Party Root Causes
  ('RC-004', 'KRI-014', 100), -- Vendor SLA breaches (Third-party failure)
  ('RC-004', 'KRI-015', 100), -- Dependency failures

  ('RC-010', 'KRI-014', 100), -- Vendor SLA breaches (Vendor failure)
  ('RC-010', 'KRI-015', 100), -- Dependency failures

  ('RC-044', 'KRI-014', 95),  -- SLA breaches (Inadequate vendor due diligence)
  ('RC-044', 'KRI-015', 90),  -- Dependency failures

  -- Cybersecurity Root Causes
  ('RC-012', 'KRI-013', 100), -- Unpatched vulnerabilities (Cybersecurity breach)
  ('RC-012', 'KRI-012', 90),  -- Malware detection
  ('RC-012', 'KRI-011', 85),  -- Unauthorized access

  ('RC-043', 'KRI-009', 90),  -- Login failures (Lack of security awareness)
  ('RC-043', 'KRI-012', 95),  -- Malware detection
  ('RC-043', 'KRI-011', 85),  -- Unauthorized access

  -- Data Quality Root Causes
  ('RC-014', 'KRI-016', 100), -- Data mismatch (Poor data quality)

  -- Monitoring Root Causes
  ('RC-015', 'KRI-001', 50),  -- CPU monitoring (Insufficient monitoring)
  ('RC-015', 'KRI-002', 50),  -- Memory monitoring
  ('RC-015', 'KRI-003', 50),  -- Disk I/O monitoring

  -- Governance Root Causes
  ('RC-002', 'KRI-017', 95),  -- Manual overrides (Policy non-compliance)
  ('RC-002', 'KRI-018', 100), -- SOP violations

  ('RC-019', 'KRI-018', 90),  -- SOP violations (Inadequate communication)
  ('RC-019', 'KRI-017', 85),  -- Manual overrides

  ('RC-028', 'KRI-018', 95),  -- SOP violations (Unclear role accountability)
  ('RC-028', 'KRI-017', 90),  -- Manual overrides

  ('RC-029', 'KRI-018', 85),  -- SOP violations (Siloed org structure)
  ('RC-029', 'KRI-006', 80),  -- Interface timeouts

  ('RC-030', 'KRI-018', 90),  -- SOP violations (Resistance to change)
  ('RC-030', 'KRI-017', 85),  -- Manual overrides

  ('RC-038', 'KRI-017', 95),  -- Manual overrides (Lack of senior mgmt support)
  ('RC-038', 'KRI-018', 90),  -- SOP violations

  ('RC-039', 'KRI-018', 95),  -- SOP violations (Ineffective communication)
  ('RC-039', 'KRI-017', 85),  -- Manual overrides

  -- Resource Constraints
  ('RC-005', 'KRI-019', 90),  -- Staffing issues (Insufficient resources)
  ('RC-005', 'KRI-020', 85),  -- Burnout metrics

  ('RC-032', 'KRI-019', 85),  -- Staffing issues (Budget constraints)
  ('RC-032', 'KRI-013', 80),  -- Unpatched vulnerabilities

  ('RC-033', 'KRI-018', 85),  -- SOP violations (Time pressure)
  ('RC-033', 'KRI-017', 90),  -- Manual overrides

  -- HR & People
  ('RC-006', 'KRI-005', 90),  -- API failures (Inadequate training)
  ('RC-006', 'KRI-018', 85),  -- SOP violations

  -- Operational Resilience
  ('RC-040', 'KRI-005', 75),  -- API failures (Lack of performance metrics)
  ('RC-040', 'KRI-006', 70),  -- Interface timeouts

  ('RC-041', 'KRI-001', 60),  -- CPU (Inadequate disaster recovery)
  ('RC-041', 'KRI-002', 60),  -- Memory

  ('RC-042', 'KRI-005', 80),  -- API failures (Poor incident response)
  ('RC-042', 'KRI-008', 75),  -- Microservice errors

  -- Technology Debt
  ('RC-003', 'KRI-005', 90),  -- API failures (Legacy systems)
  ('RC-003', 'KRI-008', 85),  -- Microservice errors

  ('RC-045', 'KRI-005', 95),  -- API failures (Technology debt)
  ('RC-045', 'KRI-008', 90),  -- Microservice errors

  ('RC-034', 'KRI-005', 85),  -- API failures (Excessive system complexity)
  ('RC-034', 'KRI-008', 90)   -- Microservice errors

) AS mapping(cause_code, kri_code, relevance_score)
INNER JOIN global_root_cause_library grc ON grc.cause_code = mapping.cause_code
INNER JOIN global_kri_kci_library gkri ON gkri.indicator_code = mapping.kri_code
ON CONFLICT (global_root_cause_id, global_kri_id) DO NOTHING;

-- ============================================================================
-- SEED IMPACT → KCI MAPPINGS (~55 mappings)
-- ============================================================================

INSERT INTO global_impact_kci_mapping (global_impact_id, global_kci_id, relevance_score)
SELECT
  gimp.id as global_impact_id,
  gkci.id as global_kci_id,
  mapping.relevance_score
FROM (VALUES
  -- Operations Impacts
  ('IMP-001', 'KCI-001', 100), -- Downtime duration (Service disruption)
  ('IMP-001', 'KCI-002', 100), -- Service unavailability
  ('IMP-001', 'KCI-003', 90),  -- Incident resolution time

  ('IMP-002', 'KCI-004', 100), -- MTTR (System failure)
  ('IMP-002', 'KCI-005', 100), -- MTBF
  ('IMP-002', 'KCI-001', 95),  -- Downtime duration

  ('IMP-003', 'KCI-003', 100), -- Incident resolution time (Slow response)
  ('IMP-003', 'KCI-004', 90),  -- MTTR

  ('IMP-004', 'KCI-010', 100), -- Transaction loss (Data loss)
  ('IMP-004', 'KCI-009', 85),  -- Refunds issued

  ('IMP-005', 'KCI-010', 100), -- Transaction loss (Transaction errors)
  ('IMP-005', 'KCI-009', 90),  -- Refunds issued
  ('IMP-005', 'KCI-006', 80),  -- Customer complaints

  -- Customer Impacts
  ('IMP-006', 'KCI-006', 100), -- Customer complaints (Customer dissatisfaction)
  ('IMP-006', 'KCI-007', 95),  -- Complaint escalation
  ('IMP-006', 'KCI-008', 85),  -- Client churn

  ('IMP-007', 'KCI-008', 100), -- Client churn (Lost business)
  ('IMP-007', 'KCI-011', 100), -- Revenue impairment

  -- Financial Impacts
  ('IMP-008', 'KCI-011', 100), -- Revenue impairment (Revenue loss)
  ('IMP-008', 'KCI-010', 90),  -- Transaction loss
  ('IMP-008', 'KCI-009', 80),  -- Refunds

  ('IMP-009', 'KCI-009', 100), -- Refunds (Penalties/fees)
  ('IMP-009', 'KCI-012', 90),  -- Regulatory fines

  ('IMP-010', 'KCI-010', 100), -- Transaction loss (Increased costs)
  ('IMP-010', 'KCI-011', 85),  -- Revenue impairment

  -- Compliance Impacts
  ('IMP-011', 'KCI-012', 100), -- Regulatory fines (Regulatory breach)
  ('IMP-011', 'KCI-014', 100), -- Compliance breach count
  ('IMP-011', 'KCI-013', 90),  -- Audit findings

  ('IMP-012', 'KCI-013', 100), -- Audit findings (Audit failures)
  ('IMP-012', 'KCI-014', 95),  -- Compliance breaches

  -- Security Impacts
  ('IMP-013', 'KCI-015', 100), -- Data exposure (Data breach)
  ('IMP-013', 'KCI-012', 85),  -- Regulatory fines
  ('IMP-013', 'KCI-016', 80),  -- Brand sentiment

  ('IMP-014', 'KCI-015', 100), -- Data exposure (Confidentiality breach)
  ('IMP-014', 'KCI-012', 90),  -- Regulatory fines

  ('IMP-015', 'KCI-015', 100), -- Data exposure (Identity theft)
  ('IMP-015', 'KCI-012', 95),  -- Regulatory fines
  ('IMP-015', 'KCI-016', 85),  -- Brand sentiment

  -- Reputation Impacts
  ('IMP-016', 'KCI-016', 100), -- Brand sentiment (Brand damage)
  ('IMP-016', 'KCI-017', 100), -- Social media mentions
  ('IMP-016', 'KCI-018', 95),  -- Reputational damage severity

  ('IMP-017', 'KCI-017', 100), -- Social media mentions (Media coverage)
  ('IMP-017', 'KCI-016', 95),  -- Brand sentiment
  ('IMP-017', 'KCI-018', 90),  -- Reputational damage

  -- Strategic/Business Impacts
  ('IMP-018', 'KCI-019', 100), -- Market share shift (Market share loss)
  ('IMP-018', 'KCI-008', 90),  -- Client churn
  ('IMP-018', 'KCI-011', 85),  -- Revenue impairment

  ('IMP-019', 'KCI-008', 100), -- Client churn (Competitive disadvantage)
  ('IMP-019', 'KCI-019', 95),  -- Market share shift
  ('IMP-019', 'KCI-011', 85),  -- Revenue impairment

  -- Health & Safety / Legal
  ('IMP-020', 'KCI-012', 100), -- Regulatory fines (Injury/harm)
  ('IMP-020', 'KCI-013', 90),  -- Audit findings

  ('IMP-021', 'KCI-012', 100), -- Regulatory fines (Legal liability)
  ('IMP-021', 'KCI-013', 95),  -- Audit findings
  ('IMP-021', 'KCI-014', 90),  -- Compliance breaches

  -- Environmental
  ('IMP-022', 'KCI-012', 100), -- Regulatory fines (Environmental damage)
  ('IMP-022', 'KCI-016', 85),  -- Brand sentiment
  ('IMP-022', 'KCI-017', 80)   -- Social media mentions

) AS mapping(impact_code, kci_code, relevance_score)
INNER JOIN global_impact_library gimp ON gimp.impact_code = mapping.impact_code
INNER JOIN global_kri_kci_library gkci ON gkci.indicator_code = mapping.kci_code
ON CONFLICT (global_impact_id, global_kci_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_rc_kri_count INTEGER;
  v_imp_kci_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_rc_kri_count FROM global_root_cause_kri_mapping;
  SELECT COUNT(*) INTO v_imp_kci_count FROM global_impact_kci_mapping;

  RAISE NOTICE '✓ Root Cause → KRI mappings: %', v_rc_kri_count;
  RAISE NOTICE '✓ Impact → KCI mappings: %', v_imp_kci_count;

  IF v_rc_kri_count < 85 THEN
    RAISE WARNING 'Expected ~90 RC-KRI mappings, found %', v_rc_kri_count;
  END IF;

  IF v_imp_kci_count < 50 THEN
    RAISE WARNING 'Expected ~55 Impact-KCI mappings, found %', v_imp_kci_count;
  END IF;
END $$;

SELECT
  (SELECT COUNT(*) FROM global_root_cause_kri_mapping) as rc_kri_mappings,
  (SELECT COUNT(*) FROM global_impact_kci_mapping) as impact_kci_mappings,
  'MAPPINGS SEEDED' as status;
