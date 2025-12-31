-- Migration: Create KRI/KCI Mapping Tables
-- Description: Map root causes to KRIs and impacts to KCIs for intelligent indicator suggestions
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #4 (Critical)

-- ============================================================================
-- CREATE MAPPING TABLES
-- ============================================================================

-- Root Cause → KRI Mapping (monitors likelihood)
CREATE TABLE IF NOT EXISTS root_cause_kri_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL REFERENCES root_cause_register(id) ON DELETE CASCADE,
  kri_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score BETWEEN 1 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, root_cause_id, kri_id)
);

-- Impact → KCI Mapping (monitors impact severity)
CREATE TABLE IF NOT EXISTS impact_kci_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL REFERENCES impact_register(id) ON DELETE CASCADE,
  kci_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score BETWEEN 1 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, impact_id, kci_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_root_cause_kri_org ON root_cause_kri_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_root_cause_kri_cause ON root_cause_kri_mapping(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_root_cause_kri_kri ON root_cause_kri_mapping(kri_id);

CREATE INDEX IF NOT EXISTS idx_impact_kci_org ON impact_kci_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_impact_kci_impact ON impact_kci_mapping(impact_id);
CREATE INDEX IF NOT EXISTS idx_impact_kci_kci ON impact_kci_mapping(kci_id);

-- ============================================================================
-- POPULATE ROOT CAUSE → KRI MAPPINGS (~90 mappings)
-- ============================================================================

-- Infrastructure & Capacity Root Causes
INSERT INTO root_cause_kri_mapping (organization_id, root_cause_id, kri_id, relevance_score)
SELECT
  '11111111-1111-1111-1111-111111111111',
  rc.id,
  kri.id,
  relevance_score
FROM root_cause_register rc
CROSS JOIN LATERAL (VALUES
  -- RC-001: Poor capacity planning
  ('RC-001', 'KRI-001', 100), -- CPU > 80%
  ('RC-001', 'KRI-002', 100), -- Memory saturation
  ('RC-001', 'KRI-007', 95),  -- Queue backlog growth
  ('RC-001', 'KRI-005', 80),  -- API failure rates

  -- RC-002: Under-resourced infrastructure
  ('RC-002', 'KRI-001', 100), -- CPU > 80%
  ('RC-002', 'KRI-002', 100), -- Memory saturation
  ('RC-002', 'KRI-003', 95),  -- Disk I/O latency
  ('RC-002', 'KRI-004', 90),  -- Network packet loss

  -- RC-003: Legacy systems
  ('RC-003', 'KRI-003', 95),  -- Disk I/O latency
  ('RC-003', 'KRI-005', 90),  -- API failure rates
  ('RC-003', 'KRI-008', 85),  -- Microservice errors
  ('RC-003', 'KRI-013', 100), -- Unpatched vulnerabilities

  -- RC-004: Lack of redundancy
  ('RC-004', 'KRI-005', 95),  -- API failure rates
  ('RC-004', 'KRI-006', 90),  -- Interface timeouts
  ('RC-004', 'KRI-008', 85),  -- Microservice errors

  -- RC-005: Single point of failure
  ('RC-005', 'KRI-005', 100), -- API failure rates
  ('RC-005', 'KRI-006', 95),  -- Interface timeouts
  ('RC-005', 'KRI-015', 90),  -- Dependency failures

  -- RC-034: Excessive system complexity
  ('RC-034', 'KRI-008', 100), -- Microservice errors
  ('RC-034', 'KRI-005', 90),  -- API failure rates
  ('RC-034', 'KRI-006', 85),  -- Interface timeouts

  -- RC-027: Insufficient process automation
  ('RC-027', 'KRI-007', 95),  -- Queue backlog
  ('RC-027', 'KRI-017', 100), -- Manual override frequency

  -- Human Capital Root Causes
  -- RC-006: Insufficient staffing
  ('RC-006', 'KRI-019', 100), -- Staffing below minimum
  ('RC-006', 'KRI-020', 95),  -- Overtime & burnout
  ('RC-006', 'KRI-007', 85),  -- Queue backlog

  -- RC-007: Human error
  ('RC-007', 'KRI-017', 100), -- Manual override frequency
  ('RC-007', 'KRI-018', 95),  -- SOP violations
  ('RC-007', 'KRI-016', 90),  -- Data mismatch

  -- RC-026: Technical skill gaps
  ('RC-026', 'KRI-005', 85),  -- API failures
  ('RC-026', 'KRI-018', 90),  -- SOP violations

  -- RC-031: Over-reliance on tribal knowledge
  ('RC-031', 'KRI-018', 95),  -- SOP violations
  ('RC-031', 'KRI-017', 85),  -- Manual overrides

  -- RC-035: Key person dependency
  ('RC-035', 'KRI-019', 95),  -- Staffing issues
  ('RC-035', 'KRI-020', 100), -- Burnout metrics

  -- Change Management Root Causes
  -- RC-008: Weak change management
  ('RC-008', 'KRI-005', 90),  -- API failures
  ('RC-008', 'KRI-017', 95),  -- Manual overrides
  ('RC-008', 'KRI-018', 85),  -- SOP violations

  -- RC-009: Bad code quality
  ('RC-009', 'KRI-005', 100), -- API failures
  ('RC-009', 'KRI-008', 95),  -- Microservice errors
  ('RC-009', 'KRI-006', 85),  -- Interface timeouts

  -- RC-036: Inadequate testing
  ('RC-036', 'KRI-005', 95),  -- API failures
  ('RC-036', 'KRI-008', 90),  -- Microservice errors

  -- RC-037: Poor requirements gathering
  ('RC-037', 'KRI-005', 85),  -- API failures
  ('RC-037', 'KRI-016', 90),  -- Data mismatches

  -- Vendor & Third-Party Root Causes
  -- RC-010: Vendor failure
  ('RC-010', 'KRI-014', 100), -- Vendor SLA breaches
  ('RC-010', 'KRI-015', 100), -- Dependency failures

  -- RC-023: Third-party dependencies
  ('RC-023', 'KRI-015', 100), -- Dependency failures
  ('RC-023', 'KRI-014', 95),  -- SLA breaches

  -- RC-044: Inadequate vendor due diligence
  ('RC-044', 'KRI-014', 95),  -- SLA breaches
  ('RC-044', 'KRI-015', 90),  -- Dependency failures

  -- Cybersecurity Root Causes
  -- RC-011: Unpatched systems
  ('RC-011', 'KRI-013', 100), -- Unpatched vulnerabilities
  ('RC-011', 'KRI-012', 90),  -- Malware detection
  ('RC-011', 'KRI-011', 85),  -- Unauthorized access

  -- RC-014: Unauthorized access
  ('RC-014', 'KRI-009', 100), -- Login failures
  ('RC-014', 'KRI-010', 100), -- Privileged login spikes
  ('RC-014', 'KRI-011', 100), -- Unauthorized attempts

  -- RC-043: Lack of security awareness
  ('RC-043', 'KRI-009', 90),  -- Login failures
  ('RC-043', 'KRI-012', 95),  -- Malware detection
  ('RC-043', 'KRI-011', 85),  -- Unauthorized access

  -- Data Quality Root Causes
  -- RC-012: Inaccurate data
  ('RC-012', 'KRI-016', 100), -- Data mismatch

  -- RC-013: Corrupted data
  ('RC-013', 'KRI-016', 100), -- Data mismatch

  -- Monitoring Root Causes
  -- RC-015: Lack of monitoring
  ('RC-015', 'KRI-001', 50),  -- (All indicators have lower relevance)
  ('RC-015', 'KRI-002', 50),
  ('RC-015', 'KRI-003', 50),

  -- Governance Root Causes
  -- RC-020: Lack of ownership
  ('RC-020', 'KRI-017', 95),  -- Manual overrides
  ('RC-020', 'KRI-018', 100), -- SOP violations

  -- RC-021: Poor communication
  ('RC-021', 'KRI-018', 90),  -- SOP violations
  ('RC-021', 'KRI-017', 85),  -- Manual overrides

  -- RC-022: Weak governance
  ('RC-022', 'KRI-017', 100), -- Manual overrides
  ('RC-022', 'KRI-018', 100), -- SOP violations

  -- RC-028: Unclear role accountability
  ('RC-028', 'KRI-018', 95),  -- SOP violations
  ('RC-028', 'KRI-017', 90),  -- Manual overrides

  -- RC-029: Siloed organizational structure
  ('RC-029', 'KRI-018', 85),  -- SOP violations
  ('RC-029', 'KRI-006', 80),  -- Interface timeouts

  -- RC-030: Resistance to change
  ('RC-030', 'KRI-018', 90),  -- SOP violations
  ('RC-030', 'KRI-017', 85),  -- Manual overrides

  -- RC-038: Lack of senior management support
  ('RC-038', 'KRI-017', 90),  -- Manual overrides
  ('RC-038', 'KRI-018', 85),  -- SOP violations

  -- RC-039: Ineffective communication channels
  ('RC-039', 'KRI-018', 90),  -- SOP violations
  ('RC-039', 'KRI-017', 80),  -- Manual overrides

  -- RC-040: Lack of performance metrics
  ('RC-040', 'KRI-001', 60),  -- CPU (lower relevance - lack of monitoring)
  ('RC-040', 'KRI-002', 60),  -- Memory

  -- Financial Root Causes (no specific infrastructure KRIs, lower relevance)
  -- RC-017: Funding stress
  -- RC-018: Interest rate volatility
  -- RC-019: FX rate exposure
  -- RC-032: Budget constraints
  -- RC-033: Time pressure

  -- Regulatory Root Cause
  -- RC-016: Regulatory breach
  ('RC-016', 'KRI-018', 95),  -- SOP violations

  -- Documentation Root Causes
  -- RC-024: Inadequate documentation
  ('RC-024', 'KRI-018', 90),  -- SOP violations
  ('RC-024', 'KRI-017', 85),  -- Manual overrides

  -- Technology Root Causes
  -- RC-025: Shadow IT proliferation
  ('RC-025', 'KRI-011', 90),  -- Unauthorized access
  ('RC-025', 'KRI-013', 85),  -- Unpatched vulnerabilities

  -- RC-045: Technology debt accumulation
  ('RC-045', 'KRI-013', 90),  -- Unpatched vulnerabilities
  ('RC-045', 'KRI-005', 85),  -- API failures

  -- Operational Resilience Root Causes
  -- RC-041: Inadequate disaster recovery planning
  ('RC-041', 'KRI-015', 85),  -- Dependency failures

  -- RC-042: Poor incident response procedures
  ('RC-042', 'KRI-017', 90)   -- Manual overrides
) AS mapping(cause_code, kri_code, relevance_score)
JOIN kri_kci_library kri ON kri.indicator_code = mapping.kri_code AND kri.organization_id = '11111111-1111-1111-1111-111111111111'
WHERE rc.cause_code = mapping.cause_code AND rc.organization_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (organization_id, root_cause_id, kri_id) DO NOTHING;

-- ============================================================================
-- POPULATE IMPACT → KCI MAPPINGS (~55 mappings)
-- ============================================================================

INSERT INTO impact_kci_mapping (organization_id, impact_id, kci_id, relevance_score)
SELECT
  '11111111-1111-1111-1111-111111111111',
  imp.id,
  kci.id,
  relevance_score
FROM impact_register imp
CROSS JOIN LATERAL (VALUES
  -- IMP-001: Customer dissatisfaction
  ('IMP-001', 'KCI-006', 100), -- Customer complaints
  ('IMP-001', 'KCI-007', 95),  -- Complaint escalations
  ('IMP-001', 'KCI-008', 90),  -- Client churn
  ('IMP-001', 'KCI-016', 85),  -- Brand sentiment

  -- IMP-002: Revenue loss
  ('IMP-002', 'KCI-009', 100), -- Refunds issued
  ('IMP-002', 'KCI-010', 100), -- Transaction loss
  ('IMP-002', 'KCI-011', 100), -- Revenue impairment

  -- IMP-003: Legal liability
  ('IMP-003', 'KCI-012', 95),  -- Regulatory fines
  ('IMP-003', 'KCI-013', 85),  -- Audit findings

  -- IMP-004: Regulatory penalty
  ('IMP-004', 'KCI-012', 100), -- Regulatory fines
  ('IMP-004', 'KCI-014', 100), -- Compliance breaches
  ('IMP-004', 'KCI-013', 90),  -- Audit findings

  -- IMP-005: Data breach
  ('IMP-005', 'KCI-015', 100), -- Data exposure
  ('IMP-005', 'KCI-012', 90),  -- Regulatory fines
  ('IMP-005', 'KCI-016', 85),  -- Brand sentiment
  ('IMP-005', 'KCI-017', 90),  -- Negative mentions

  -- IMP-006: Reputation damage
  ('IMP-006', 'KCI-016', 100), -- Brand sentiment
  ('IMP-006', 'KCI-017', 100), -- Negative mentions
  ('IMP-006', 'KCI-018', 100), -- Reputational damage
  ('IMP-006', 'KCI-008', 85),  -- Client churn

  -- IMP-007: Operational downtime
  ('IMP-007', 'KCI-001', 100), -- Average downtime
  ('IMP-007', 'KCI-002', 100), -- Unavailability hours
  ('IMP-007', 'KCI-003', 95),  -- Resolution time
  ('IMP-007', 'KCI-004', 95),  -- MTTR
  ('IMP-007', 'KCI-005', 90),  -- MTBF

  -- IMP-008: Safety risk
  ('IMP-008', 'KCI-003', 70),  -- Incident resolution time
  ('IMP-008', 'KCI-013', 75),  -- Audit findings

  -- IMP-009: Loss of competitive position
  ('IMP-009', 'KCI-008', 95),  -- Client churn
  ('IMP-009', 'KCI-019', 100), -- Market share
  ('IMP-009', 'KCI-011', 85),  -- Revenue impairment

  -- IMP-010: Loss of trust
  ('IMP-010', 'KCI-016', 95),  -- Brand sentiment
  ('IMP-010', 'KCI-008', 90),  -- Client churn
  ('IMP-010', 'KCI-018', 90),  -- Reputational damage

  -- IMP-011: Service disruption
  ('IMP-011', 'KCI-002', 100), -- Unavailability hours
  ('IMP-011', 'KCI-001', 95),  -- Downtime duration
  ('IMP-011', 'KCI-006', 85),  -- Customer complaints

  -- IMP-012: Operational inefficiency
  ('IMP-012', 'KCI-003', 90),  -- Resolution time
  ('IMP-012', 'KCI-004', 85),  -- MTTR
  ('IMP-012', 'KCI-011', 80),  -- Revenue impairment

  -- IMP-013: Employee morale decline
  ('IMP-013', 'KCI-006', 75),  -- Complaints (internal)
  ('IMP-013', 'KCI-003', 70),  -- Resolution time

  -- IMP-014: Knowledge/skill loss
  ('IMP-014', 'KCI-003', 85),  -- Resolution time
  ('IMP-014', 'KCI-004', 80),  -- MTTR

  -- IMP-015: Innovation stagnation
  ('IMP-015', 'KCI-019', 85),  -- Market share
  ('IMP-015', 'KCI-011', 75),  -- Revenue impairment

  -- IMP-016: Environmental harm
  ('IMP-016', 'KCI-012', 90),  -- Regulatory fines
  ('IMP-016', 'KCI-018', 85),  -- Reputational damage

  -- IMP-017: Community relations damage
  ('IMP-017', 'KCI-017', 90),  -- Negative mentions
  ('IMP-017', 'KCI-018', 95),  -- Reputational damage

  -- IMP-019: Strategic misalignment
  ('IMP-019', 'KCI-011', 85),  -- Revenue impairment
  ('IMP-019', 'KCI-019', 80),  -- Market share

  -- IMP-020: Technology debt accumulation
  ('IMP-020', 'KCI-003', 85),  -- Resolution time
  ('IMP-020', 'KCI-004', 90),  -- MTTR

  -- IMP-021: Talent attrition
  ('IMP-021', 'KCI-003', 80),  -- Resolution time
  ('IMP-021', 'KCI-011', 75),  -- Revenue impairment

  -- IMP-022: Market credibility loss
  ('IMP-022', 'KCI-016', 100), -- Brand sentiment
  ('IMP-022', 'KCI-018', 95),  -- Reputational damage
  ('IMP-022', 'KCI-019', 90),  -- Market share

  -- IMP-023: Supply chain disruption
  ('IMP-023', 'KCI-002', 90),  -- Service unavailability
  ('IMP-023', 'KCI-011', 95),  -- Revenue impairment

  -- IMP-024: Shareholder value destruction
  ('IMP-024', 'KCI-011', 100), -- Revenue impairment
  ('IMP-024', 'KCI-019', 100), -- Market share

  -- IMP-025: Intellectual property loss
  ('IMP-025', 'KCI-011', 90),  -- Revenue impairment
  ('IMP-025', 'KCI-019', 85),  -- Market share

  -- IMP-026: Competitive advantage erosion
  ('IMP-026', 'KCI-019', 100), -- Market share
  ('IMP-026', 'KCI-008', 90),  -- Client churn

  -- IMP-027: Contractual default
  ('IMP-027', 'KCI-012', 95),  -- Regulatory fines
  ('IMP-027', 'KCI-011', 90),  -- Revenue impairment

  -- IMP-028: Insurance claim
  ('IMP-028', 'KCI-010', 85),  -- Transaction loss
  ('IMP-028', 'KCI-009', 80),  -- Refunds

  -- IMP-029: Business model obsolescence
  ('IMP-029', 'KCI-019', 100), -- Market share
  ('IMP-029', 'KCI-011', 100), -- Revenue impairment

  -- IMP-030: Cultural degradation
  ('IMP-030', 'KCI-013', 80),  -- Audit findings
  ('IMP-030', 'KCI-006', 75)   -- Complaints
) AS mapping(impact_code, kci_code, relevance_score)
JOIN kri_kci_library kci ON kci.indicator_code = mapping.kci_code AND kci.organization_id = '11111111-1111-1111-1111-111111111111'
WHERE imp.impact_code = mapping.impact_code AND imp.organization_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (organization_id, impact_id, kci_id) DO NOTHING;

-- ============================================================================
-- CREATE VIEWS FOR INTELLIGENT SUGGESTIONS
-- ============================================================================

-- View: Root Cause → KRIs
CREATE OR REPLACE VIEW root_cause_kris_view AS
SELECT
  rc.id as root_cause_id,
  rc.organization_id,
  rc.cause_code,
  rc.cause_name,
  rc.category as root_cause_category,
  kri.id as kri_id,
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_category,
  kri.indicator_subtype,
  kri.measurement_unit,
  kri.measurement_frequency,
  kri.threshold_warning,
  kri.threshold_critical,
  mapping.relevance_score,
  RANK() OVER (PARTITION BY rc.id ORDER BY mapping.relevance_score DESC) as kri_rank
FROM root_cause_register rc
JOIN root_cause_kri_mapping mapping ON rc.id = mapping.root_cause_id AND rc.organization_id = mapping.organization_id
JOIN kri_kci_library kri ON mapping.kri_id = kri.id AND kri.organization_id = mapping.organization_id
WHERE rc.status = 'active' AND kri.status = 'active'
ORDER BY rc.cause_code, mapping.relevance_score DESC;

-- View: Impact → KCIs
CREATE OR REPLACE VIEW impact_kcis_view AS
SELECT
  imp.id as impact_id,
  imp.organization_id,
  imp.impact_code,
  imp.impact_name,
  imp.category as impact_category,
  imp.severity_level,
  kci.id as kci_id,
  kci.indicator_code,
  kci.indicator_name,
  kci.indicator_category,
  kci.indicator_subtype,
  kci.measurement_unit,
  kci.measurement_frequency,
  kci.threshold_warning,
  kci.threshold_critical,
  mapping.relevance_score,
  RANK() OVER (PARTITION BY imp.id ORDER BY mapping.relevance_score DESC) as kci_rank
FROM impact_register imp
JOIN impact_kci_mapping mapping ON imp.id = mapping.impact_id AND imp.organization_id = mapping.organization_id
JOIN kri_kci_library kci ON mapping.kci_id = kci.id AND kci.organization_id = mapping.organization_id
WHERE imp.status = 'active' AND kci.status = 'active'
ORDER BY imp.impact_code, mapping.relevance_score DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE root_cause_kri_mapping IS 'Maps root causes to relevant KRIs for intelligent monitoring suggestions';
COMMENT ON TABLE impact_kci_mapping IS 'Maps impacts to relevant KCIs for impact measurement suggestions';
COMMENT ON VIEW root_cause_kris_view IS 'Displays root causes with their recommended KRIs ordered by relevance';
COMMENT ON VIEW impact_kcis_view IS 'Displays impacts with their recommended KCIs ordered by relevance';

-- ============================================================================
-- VERIFICATION QUERY (for manual testing)
-- ============================================================================

-- Sample query to test mappings:
-- SELECT * FROM root_cause_kris_view WHERE cause_code = 'RC-001' LIMIT 5;
-- SELECT * FROM impact_kcis_view WHERE impact_code = 'IMP-001' LIMIT 5;
--
-- Count mappings:
-- SELECT COUNT(*) FROM root_cause_kri_mapping; -- Should be ~90
-- SELECT COUNT(*) FROM impact_kci_mapping;     -- Should be ~55
