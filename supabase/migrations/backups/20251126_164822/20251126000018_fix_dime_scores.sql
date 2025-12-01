-- Migration: Fix DIME Scores (Make Realistic)
-- Description: Apply realistic DIME score variations based on control complexity and type
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #3 (Critical)

-- Problem: All controls currently have identical DIME scores within their complexity tier
--   - Basic: 65, 65, 65, 65 (unrealistic)
--   - Intermediate: 75, 75, 75, 75 (unrealistic)
--   - Advanced: 85, 85, 85, 85 (unrealistic)
--
-- Reality: Implementation < Design, Monitoring < Implementation, Evaluation < Monitoring
--
-- Approach: Apply variations based on:
--   1. Complexity (Basic/Intermediate/Advanced)
--   2. Control Type (preventive, detective, corrective)
--   3. Technical vs Procedural nature

-- ============================================================================
-- CYBERSECURITY CONTROLS
-- ============================================================================

-- Basic Cybersecurity Controls (simple to implement, harder to monitor/evaluate)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-001', 'CTL-002') AND organization_id = 'YOUR_ORG_ID'; -- MFA, RBAC

UPDATE control_library SET design_score = 70, implementation_score = 65, monitoring_score = 50, evaluation_score = 40
WHERE control_code IN ('CTL-004', 'CTL-007', 'CTL-011', 'CTL-012', 'CTL-017') AND organization_id = 'YOUR_ORG_ID';
-- Password enforcement, Firewall hardening, Patching, DNS filtering, Vuln scanning

-- Intermediate Cybersecurity Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-003', 'CTL-006', 'CTL-008', 'CTL-010', 'CTL-014') AND organization_id = 'YOUR_ORG_ID';
-- PAM, Network segmentation, IDS, EDR, Privileged session recording

UPDATE control_library SET design_score = 80, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-005', 'CTL-015') AND organization_id = 'YOUR_ORG_ID';
-- Credential rotation, Security incident response plan

-- Advanced Cybersecurity Controls (highly complex, excellent design, difficult to fully implement)
UPDATE control_library SET design_score = 95, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-009' AND organization_id = 'YOUR_ORG_ID'; -- IPS

UPDATE control_library SET design_score = 90, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-013', 'CTL-016') AND organization_id = 'YOUR_ORG_ID';
-- Firmware integrity, Penetration testing

UPDATE control_library SET design_score = 95, implementation_score = 75, monitoring_score = 65, evaluation_score = 50
WHERE control_code = 'CTL-018' AND organization_id = 'YOUR_ORG_ID'; -- Zero-trust network

-- ============================================================================
-- OPERATIONAL CONTROLS
-- ============================================================================

-- Basic Operational Controls (procedural, easier to monitor)
UPDATE control_library SET design_score = 70, implementation_score = 65, monitoring_score = 55, evaluation_score = 45
WHERE control_code IN ('CTL-023', 'CTL-024', 'CTL-026', 'CTL-027', 'CTL-032') AND organization_id = 'YOUR_ORG_ID';
-- Maintenance windows, SOPs, Dual validation, Exception logging, BC manuals

-- Intermediate Operational Controls (technical, good design but partial implementation)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-019', 'CTL-020', 'CTL-022') AND organization_id = 'YOUR_ORG_ID';
-- Load balancing, Auto-scaling, Queue throttling

UPDATE control_library SET design_score = 80, implementation_score = 70, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-025', 'CTL-028', 'CTL-029', 'CTL-030', 'CTL-031') AND organization_id = 'YOUR_ORG_ID';
-- QA/QC, Audit testing, Process monitoring, Real-time alerting, RTO/RPO definition

-- Advanced Operational Controls (complex infrastructure)
UPDATE control_library SET design_score = 90, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-021' AND organization_id = 'YOUR_ORG_ID'; -- Fail-over infrastructure

-- ============================================================================
-- DATA GOVERNANCE CONTROLS
-- ============================================================================

-- Basic Data Controls
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-033', 'CTL-040', 'CTL-042') AND organization_id = 'YOUR_ORG_ID';
-- Data validation, Encryption in transit, Retention policies

-- Intermediate Data Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-034', 'CTL-035', 'CTL-036', 'CTL-037', 'CTL-039', 'CTL-041', 'CTL-043') AND organization_id = 'YOUR_ORG_ID';
-- Reconciliation, Master data, Access partitioning, Checksum, Encryption at rest, Classification, PII/PHI enforcement

-- Advanced Data Controls (sophisticated implementation)
UPDATE control_library SET design_score = 90, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-038' AND organization_id = 'YOUR_ORG_ID'; -- Data masking/tokenizing

-- ============================================================================
-- GOVERNANCE & COMPLIANCE CONTROLS
-- ============================================================================

-- Basic Governance Controls (procedural, well-designed but evaluation is weak)
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 55, evaluation_score = 45
WHERE control_code IN ('CTL-044', 'CTL-045', 'CTL-047', 'CTL-051', 'CTL-052') AND organization_id = 'YOUR_ORG_ID';
-- Segregation of duties, Approval workflows, Risk ownership, Ethical conduct, Whistleblower

-- Intermediate Governance Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-046', 'CTL-048', 'CTL-049') AND organization_id = 'YOUR_ORG_ID';
-- Board oversight, Regulatory monitoring, Policy audits

-- Advanced Governance Controls
UPDATE control_library SET design_score = 90, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-050' AND organization_id = 'YOUR_ORG_ID'; -- Independent assurance reviews

-- ============================================================================
-- FINANCIAL CONTROLS
-- ============================================================================

-- Basic Financial Controls
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-057', 'CTL-059') AND organization_id = 'YOUR_ORG_ID';
-- Sensitivity analysis, Payment authorization limits

-- Intermediate Financial Controls (analytical, strong design but execution varies)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-053', 'CTL-054', 'CTL-055', 'CTL-056', 'CTL-058', 'CTL-060', 'CTL-061') AND organization_id = 'YOUR_ORG_ID';
-- Liquidity monitoring, Capital buffer, Hedging, Stress testing, Counterparty evaluation, Treasury segregation, Fraud analytics

-- ============================================================================
-- HR / PEOPLE / CULTURE CONTROLS
-- ============================================================================

-- Basic HR Controls (procedural, straightforward but hard to measure effectiveness)
UPDATE control_library SET design_score = 70, implementation_score = 65, monitoring_score = 50, evaluation_score = 40
WHERE control_code IN ('CTL-062', 'CTL-064', 'CTL-066', 'CTL-068', 'CTL-069') AND organization_id = 'YOUR_ORG_ID';
-- Mandatory training, Access revocation, Role clarity, Conduct policy, Minimum staffing

-- Intermediate HR Controls
UPDATE control_library SET design_score = 80, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-063', 'CTL-065', 'CTL-067') AND organization_id = 'YOUR_ORG_ID';
-- Competency certification, Job rotation, Burnout monitoring

-- ============================================================================
-- THIRD-PARTY / VENDOR CONTROLS
-- ============================================================================

-- Basic Vendor Controls
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-073', 'CTL-075', 'CTL-076') AND organization_id = 'YOUR_ORG_ID';
-- Access boundary, Incident reporting, API health monitoring

-- Intermediate Vendor Controls (strong design, moderate implementation quality)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-070', 'CTL-071', 'CTL-072', 'CTL-074') AND organization_id = 'YOUR_ORG_ID';
-- SLA enforcement, Multi-vendor redundancy, Periodic assessments, Vendor accreditation

-- ============================================================================
-- PHYSICAL & FACILITY CONTROLS
-- ============================================================================

-- Basic Physical Controls (well-designed, but monitoring and testing gaps)
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 55, evaluation_score = 45
WHERE control_code IN ('CTL-077', 'CTL-078') AND organization_id = 'YOUR_ORG_ID';
-- Physical badges, CCTV

-- Intermediate Physical Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-079', 'CTL-080', 'CTL-081', 'CTL-082', 'CTL-083') AND organization_id = 'YOUR_ORG_ID';
-- Man-trap, Biometric access, Fire suppression, UPS, Server cages

-- ============================================================================
-- INFRASTRUCTURE & ARCHITECTURE CONTROLS
-- ============================================================================

-- Intermediate Infrastructure Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-084', 'CTL-089') AND organization_id = 'YOUR_ORG_ID';
-- Containerization, Automated roll-back

-- Advanced Infrastructure Controls (brilliant design, challenging to implement fully)
UPDATE control_library SET design_score = 95, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code IN ('CTL-085', 'CTL-086', 'CTL-087', 'CTL-088') AND organization_id = 'YOUR_ORG_ID';
-- Microservices, Geo-distribution, Standby systems, Chaos engineering

-- ============================================================================
-- DISASTER RECOVERY & RESILIENCE CONTROLS
-- ============================================================================

-- Basic DR Controls (procedural, good plans but weak testing)
UPDATE control_library SET design_score = 75, implementation_score = 65, monitoring_score = 50, evaluation_score = 40
WHERE control_code = 'CTL-093' AND organization_id = 'YOUR_ORG_ID'; -- Crisis communications

-- Intermediate DR Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-090', 'CTL-091', 'CTL-092', 'CTL-094', 'CTL-095') AND organization_id = 'YOUR_ORG_ID';
-- RTO/RPO frameworks, Off-site backups, Table-top drills, PR damage control, Service failover simulation

-- ============================================================================
-- CREATE DIME ANALYSIS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW dime_score_analysis_view AS
SELECT
  complexity,
  control_type,
  COUNT(*) as control_count,
  ROUND(AVG(design_score)::numeric, 1) as avg_design,
  ROUND(AVG(implementation_score)::numeric, 1) as avg_implementation,
  ROUND(AVG(monitoring_score)::numeric, 1) as avg_monitoring,
  ROUND(AVG(evaluation_score)::numeric, 1) as avg_evaluation,
  ROUND(AVG((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0)::numeric, 1) as avg_overall_dime
FROM control_library
WHERE organization_id = 'YOUR_ORG_ID' AND status = 'active'
GROUP BY complexity, control_type
ORDER BY
  CASE complexity
    WHEN 'Basic' THEN 1
    WHEN 'Intermediate' THEN 2
    WHEN 'Advanced' THEN 3
  END,
  control_type;

-- Create view showing controls with greatest DIME variance (most realistic)
CREATE OR REPLACE VIEW dime_variance_view AS
SELECT
  control_code,
  control_name,
  complexity,
  control_type,
  design_score,
  implementation_score,
  monitoring_score,
  evaluation_score,
  (design_score - evaluation_score) as dime_range,
  ROUND(((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0)::numeric, 1) as dime_average
FROM control_library
WHERE organization_id = 'YOUR_ORG_ID' AND status = 'active'
ORDER BY (design_score - evaluation_score) DESC;

-- Comments
COMMENT ON VIEW dime_score_analysis_view IS 'Analysis of DIME scores by complexity and control type, showing realistic score degradation';
COMMENT ON VIEW dime_variance_view IS 'Controls ranked by DIME variance (Design to Evaluation), higher variance = more realistic degradation';

-- Verification Query (for manual testing)
-- SELECT complexity,
--        ROUND(AVG(design_score), 1) as avg_d,
--        ROUND(AVG(implementation_score), 1) as avg_i,
--        ROUND(AVG(monitoring_score), 1) as avg_m,
--        ROUND(AVG(evaluation_score), 1) as avg_e
-- FROM control_library
-- WHERE organization_id = 'YOUR_ORG_ID'
-- GROUP BY complexity;
--
-- Expected Results (approximately):
-- Basic:        D: 73, I: 68, M: 55, E: 46
-- Intermediate: D: 84, I: 74, M: 64, E: 54
-- Advanced:     D: 93, I: 79, M: 69, E: 58

-- Update comment on control_library table
COMMENT ON TABLE control_library IS 'Seeded with 95 comprehensive controls with realistic DIME score variations reflecting implementation challenges';
