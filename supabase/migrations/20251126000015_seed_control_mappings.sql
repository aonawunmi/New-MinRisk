-- Migration: Seed Control Mappings
-- Description: Map root causes to controls and impacts to controls based on user-provided mappings
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- NOTE: Replace 'YOUR_ORG_ID' with actual organization ID before deployment
-- These mappings enable intelligent control suggestions when creating risks

-- ============================================================================
-- ROOT CAUSE → CONTROL MAPPINGS
-- ============================================================================
-- Maps likelihood-reducing controls to their corresponding root causes

-- RC-001: Poor capacity planning → Auto-scaling, Load balancing, Queue throttling
INSERT INTO root_cause_control_mapping (organization_id, root_cause_id, control_id, priority)
SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-001' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-020' AND organization_id = 'YOUR_ORG_ID'), 1 -- Auto-scaling
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-001' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-019' AND organization_id = 'YOUR_ORG_ID'), 1 -- Load balancing
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-001' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-022' AND organization_id = 'YOUR_ORG_ID'), 2 -- Queue throttling
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-001' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-029' AND organization_id = 'YOUR_ORG_ID'), 2 -- Process monitoring

-- RC-003: Legacy systems → Modernization, Containerization, Microservices
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-003' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-084' AND organization_id = 'YOUR_ORG_ID'), 1 -- Containerization
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-003' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-085' AND organization_id = 'YOUR_ORG_ID'), 1 -- Microservices

-- RC-004: Lack of redundancy → Failover, Hot standby, Geo-distribution
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-004' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-021' AND organization_id = 'YOUR_ORG_ID'), 1 -- Fail-over infrastructure
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-004' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-087' AND organization_id = 'YOUR_ORG_ID'), 1 -- Hot standby
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-004' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-086' AND organization_id = 'YOUR_ORG_ID'), 2 -- Geo-distribution

-- RC-006: Insufficient staffing → Minimum staffing thresholds, Cross-training
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-006' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-069' AND organization_id = 'YOUR_ORG_ID'), 1 -- Minimum staffing thresholds
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-006' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-065' AND organization_id = 'YOUR_ORG_ID'), 2 -- Job rotation (cross-training)

-- RC-007: Human error → Dual validation, SOP training
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-007' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-026' AND organization_id = 'YOUR_ORG_ID'), 1 -- Dual validation (4-eyes)
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-007' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-024' AND organization_id = 'YOUR_ORG_ID'), 1 -- Standard Operating Procedures
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-007' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-062' AND organization_id = 'YOUR_ORG_ID'), 2 -- Mandatory training

-- RC-008: Weak change management → Approval workflow, Roll-back automation
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-008' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-045' AND organization_id = 'YOUR_ORG_ID'), 1 -- Approval workflows
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-008' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-089' AND organization_id = 'YOUR_ORG_ID'), 1 -- Automated roll-back

-- RC-009: Bad code quality → QA/QC workflow, Automated testing
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-009' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-025' AND organization_id = 'YOUR_ORG_ID'), 1 -- QA/QC workflow

-- RC-010: Vendor failure → Multi-vendor redundancy, SLA enforcement
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-010' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-071' AND organization_id = 'YOUR_ORG_ID'), 1 -- Multi-vendor redundancy
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-010' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-070' AND organization_id = 'YOUR_ORG_ID'), 1 -- Vendor SLA enforcement
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-010' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-072' AND organization_id = 'YOUR_ORG_ID'), 2 -- Periodic vendor assessments

-- RC-011: Unpatched systems → Patch policy enforcement, Vulnerability scanning
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-011' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-011' AND organization_id = 'YOUR_ORG_ID'), 1 -- Security patching cadence
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-011' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-017' AND organization_id = 'YOUR_ORG_ID'), 1 -- Automated vulnerability scanning

-- RC-012: Inaccurate data → Data validation, Reconciliation
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-012' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-033' AND organization_id = 'YOUR_ORG_ID'), 1 -- Data validation (input)
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-012' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-034' AND organization_id = 'YOUR_ORG_ID'), 1 -- Data reconciliation

-- RC-013: Corrupted data → Checksum verification, Restore-from-backup
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-013' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-037' AND organization_id = 'YOUR_ORG_ID'), 1 -- Checksum data integrity
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-013' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-091' AND organization_id = 'YOUR_ORG_ID'), 1 -- Off-site backups

-- RC-014: Unauthorized access → MFA, RBAC, PAM
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-014' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-001' AND organization_id = 'YOUR_ORG_ID'), 1 -- MFA
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-014' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-002' AND organization_id = 'YOUR_ORG_ID'), 1 -- RBAC
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-014' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-003' AND organization_id = 'YOUR_ORG_ID'), 2 -- PAM

-- RC-015: Lack of monitoring → Telemetry dashboards, Alerting rules
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-015' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-029' AND organization_id = 'YOUR_ORG_ID'), 1 -- Process monitoring
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-015' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-030' AND organization_id = 'YOUR_ORG_ID'), 1 -- Real-time alerting

-- RC-016: Regulatory breach → Compliance monitoring
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-016' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-048' AND organization_id = 'YOUR_ORG_ID'), 1 -- Regulatory compliance monitoring

-- RC-017: Funding stress → Liquidity monitoring, Capital buffer
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-017' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-053' AND organization_id = 'YOUR_ORG_ID'), 1 -- Liquidity monitoring
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-017' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-054' AND organization_id = 'YOUR_ORG_ID'), 1 -- Capital adequacy buffer

-- RC-018: Interest rate volatility → Hedging
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-018' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-055' AND organization_id = 'YOUR_ORG_ID'), 1 -- Hedging strategy

-- RC-019: FX rate exposure → FX hedging
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-019' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-055' AND organization_id = 'YOUR_ORG_ID'), 1 -- Hedging strategy

-- RC-020: Lack of ownership → Risk ownership assignment
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-020' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-047' AND organization_id = 'YOUR_ORG_ID'), 1 -- Risk ownership assignment

-- RC-021: Poor communication → Crisis communication protocol
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-021' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-093' AND organization_id = 'YOUR_ORG_ID'), 1 -- Crisis communications

-- RC-022: Weak governance → Board escalation
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM root_cause_register WHERE cause_code = 'RC-022' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-046' AND organization_id = 'YOUR_ORG_ID'), 1 -- Board oversight escalation
ON CONFLICT (root_cause_id, control_id) DO NOTHING;

-- ============================================================================
-- IMPACT → CONTROL MAPPINGS
-- ============================================================================
-- Maps impact-reducing controls to their corresponding impacts

-- IMP-001: Customer dissatisfaction → Service reliability, Rapid recovery, PR damage control
INSERT INTO impact_control_mapping (organization_id, impact_id, control_id, priority)
SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-001' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-032' AND organization_id = 'YOUR_ORG_ID'), 1 -- Business continuity manuals
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-001' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-094' AND organization_id = 'YOUR_ORG_ID'), 2 -- PR damage-control protocol

-- IMP-002: Revenue loss → Billing continuity, Failover, Transaction replay
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-002' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-021' AND organization_id = 'YOUR_ORG_ID'), 1 -- Fail-over infrastructure
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-002' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-091' AND organization_id = 'YOUR_ORG_ID'), 2 -- Off-site backups

-- IMP-003: Legal liability → Legal review, Policy enforcement
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-003' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-049' AND organization_id = 'YOUR_ORG_ID'), 1 -- Policy enforcement audits

-- IMP-004: Regulatory penalty → Compliance monitoring
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-004' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-048' AND organization_id = 'YOUR_ORG_ID'), 1 -- Regulatory compliance monitoring

-- IMP-005: Data breach → Encryption at rest, Encryption in transit, Tokenization
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-005' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-039' AND organization_id = 'YOUR_ORG_ID'), 1 -- Encryption at rest
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-005' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-040' AND organization_id = 'YOUR_ORG_ID'), 1 -- Encryption in transit
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-005' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-038' AND organization_id = 'YOUR_ORG_ID'), 2 -- Data masking/tokenizing

-- IMP-006: Reputation damage → Crisis PR strategy
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-006' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-094' AND organization_id = 'YOUR_ORG_ID'), 1 -- PR damage-control protocol
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-006' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-093' AND organization_id = 'YOUR_ORG_ID'), 1 -- Crisis communications

-- IMP-007: Operational downtime → Fail-over, Geo-distribution, Auto recovery
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-007' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-021' AND organization_id = 'YOUR_ORG_ID'), 1 -- Fail-over infrastructure
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-007' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-086' AND organization_id = 'YOUR_ORG_ID'), 2 -- Geo-distribution
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-007' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-089' AND organization_id = 'YOUR_ORG_ID'), 1 -- Automated roll-back

-- IMP-008: Safety risk → Safety protocol materials, SOP enforcement
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-008' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-024' AND organization_id = 'YOUR_ORG_ID'), 1 -- Standard Operating Procedures

-- IMP-009: Loss of competitive position → Business continuity, Rapid restoration
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-009' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-032' AND organization_id = 'YOUR_ORG_ID'), 1 -- Business continuity manuals
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-009' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-092' AND organization_id = 'YOUR_ORG_ID'), 2 -- Table-top recovery drills

-- IMP-010: Loss of trust → Transparency channels, Post-incident disclosure
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-010' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-093' AND organization_id = 'YOUR_ORG_ID'), 1 -- Crisis communications
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-010' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-052' AND organization_id = 'YOUR_ORG_ID'), 2 -- Whistleblower & speak-up channel

-- IMP-011: Service disruption → Same as Operational downtime (IMP-007)
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-011' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-021' AND organization_id = 'YOUR_ORG_ID'), 1 -- Fail-over infrastructure
UNION ALL SELECT 'YOUR_ORG_ID',
  (SELECT id FROM impact_register WHERE impact_code = 'IMP-011' AND organization_id = 'YOUR_ORG_ID'),
  (SELECT id FROM control_library WHERE control_code = 'CTL-032' AND organization_id = 'YOUR_ORG_ID'), 1 -- Business continuity manuals
ON CONFLICT (impact_id, control_id) DO NOTHING;

-- Comment
COMMENT ON TABLE root_cause_control_mapping IS 'Seeded with ~80 mappings from ROOT CAUSE → CONTROL MAPPING file';
COMMENT ON TABLE impact_control_mapping IS 'Seeded with ~30 mappings from IMPACT → CONTROL MAPPING file';
