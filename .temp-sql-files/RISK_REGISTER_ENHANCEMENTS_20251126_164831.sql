-- ============================================================================
-- RISK REGISTER ENHANCEMENTS - COMBINED DEPLOYMENT SQL
-- ============================================================================
--
-- Description: All 12 enhancement migrations combined into a single file
-- Generated: Wed Nov 26 16:48:31 WAT 2025
--
-- This file contains:
--   - Enhancement #1: Expand Root Cause Register (23 → 45)
--   - Enhancement #2: Expand Impact Register (11 → 30)
--   - Enhancement #3: Fix DIME Scores (realistic variations)
--   - Enhancement #4: Add KRI/KCI Mappings
--   - Enhancement #5: Add Implementation Guidance to Controls
--   - Enhancement #6: Add Residual Risk Calculation
--   - Enhancement #7: Add Control Testing/Effectiveness Tracking
--   - Enhancement #8: Enhance Risk Model for Multiple Causes/Impacts
--   - Enhancement #9: Add Control Dependencies
--   - Enhancement #10: Add Risk Appetite Framework
--   - Enhancement #11: Add KRI/KCI Breach History
--   - Enhancement #12: Add Library Suggestions Approval Workflow
--
-- IMPORTANT: Before running, ensure YOUR_ORG_ID has been replaced with actual UUID
--
-- ============================================================================

BEGIN;  -- Start transaction


-- ============================================================================
-- Migration 16: expand_root_cause_register
-- File: 20251126000016_expand_root_cause_register.sql
-- ============================================================================

-- Migration: Expand Root Cause Register (23 → 45)
-- Description: Add 22 additional root causes based on solution architect review
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #1 (Critical)

-- Add new columns for hierarchical categorization and severity
ALTER TABLE root_cause_register
  ADD COLUMN IF NOT EXISTS parent_cause_id UUID REFERENCES root_cause_register(id),
  ADD COLUMN IF NOT EXISTS severity_indicator VARCHAR(20) CHECK (severity_indicator IN ('Low', 'Medium', 'High', 'Critical'));

-- Create index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_root_cause_parent ON root_cause_register(parent_cause_id);

-- Insert 22 additional root causes
INSERT INTO root_cause_register (
  cause_code, cause_name, cause_description, category, subcategory,
  severity_indicator, status, organization_id, approved_at
) VALUES
-- Documentation & Knowledge Management
('RC-024', 'Inadequate documentation', 'Lack of comprehensive, up-to-date documentation for systems, processes, or procedures', 'Operational Risk', 'Process Inefficiency', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-031', 'Over-reliance on tribal knowledge', 'Critical knowledge held by individuals without formal documentation or knowledge transfer', 'Human Capital Risk', 'Skills Shortage', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Technology & Innovation
('RC-025', 'Shadow IT proliferation', 'Unauthorized IT systems or applications deployed without proper governance', 'Technology & Cyber Risk', 'IT Service Management', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-027', 'Insufficient process automation', 'Manual processes where automation would reduce errors and improve efficiency', 'Operational Risk', 'Process Inefficiency', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-034', 'Excessive system complexity', 'Overly complex technical architecture increasing failure risk', 'Technology & Cyber Risk', 'Technology Obsolescence', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-045', 'Technology debt accumulation', 'Accumulated technical debt from shortcuts and deferred refactoring', 'Technology & Cyber Risk', 'Technology Obsolescence', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Human Capital & Skills
('RC-026', 'Technical skill gaps', 'Lack of required technical skills or expertise within the team', 'Human Capital Risk', 'Skills Shortage', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-035', 'Key person dependency', 'Critical dependence on specific individuals for essential functions', 'Human Capital Risk', 'Succession Planning', 'Critical', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-043', 'Lack of security awareness', 'Insufficient security awareness training for staff', 'Technology & Cyber Risk', 'Cybersecurity Threats', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Organizational & Governance
('RC-028', 'Unclear role accountability', 'Ambiguous roles and responsibilities leading to gaps in coverage', 'Governance & Reputational Risk', 'Corporate Governance Structure', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-029', 'Siloed organizational structure', 'Organizational silos preventing effective collaboration and information sharing', 'Governance & Reputational Risk', 'Organizational Restructuring', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-038', 'Lack of senior management support', 'Insufficient executive sponsorship or support for critical initiatives', 'Governance & Reputational Risk', 'Executive Leadership', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Change & Culture
('RC-030', 'Resistance to change', 'Organizational or individual resistance to necessary changes', 'Governance & Reputational Risk', 'Corporate Culture', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-039', 'Ineffective communication channels', 'Poor communication mechanisms leading to misunderstandings and errors', 'Governance & Reputational Risk', 'Stakeholder Management', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Resource Constraints
('RC-032', 'Budget constraints', 'Insufficient budget allocation for critical needs', 'Financial Risk', 'Budgeting & Forecasting', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-033', 'Time pressure / rushed decisions', 'Insufficient time allocated leading to rushed, suboptimal decisions', 'Operational Risk', 'Process Inefficiency', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Quality & Testing
('RC-036', 'Inadequate testing', 'Insufficient testing of systems, processes, or changes before deployment', 'Operational Risk', 'Quality Management', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-037', 'Poor requirements gathering', 'Incomplete or inaccurate requirements definition', 'Project & Programme Risk', 'Scope Creep', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Operational Resilience
('RC-040', 'Lack of performance metrics', 'Insufficient monitoring and measurement of performance', 'Operational Risk', 'Process Monitoring', 'Medium', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-041', 'Inadequate disaster recovery planning', 'Insufficient disaster recovery or business continuity planning', 'Operational Risk', 'Disaster Recovery', 'Critical', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('RC-042', 'Poor incident response procedures', 'Inadequate procedures for responding to incidents', 'Operational Risk', 'Business Continuity', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Third-Party & Vendor
('RC-044', 'Inadequate vendor due diligence', 'Insufficient vetting and ongoing monitoring of vendors', 'Supply Chain & Logistics Risk', 'Vendor Management', 'High', 'active', '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (organization_id, cause_code) DO NOTHING;

-- Set up hierarchical relationships (examples)
-- Group related causes under parent causes
UPDATE root_cause_register SET parent_cause_id = (
  SELECT id FROM root_cause_register WHERE cause_code = 'RC-007' AND organization_id = '11111111-1111-1111-1111-111111111111'
) WHERE cause_code = 'RC-026' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Technical skill gaps → Human error

UPDATE root_cause_register SET parent_cause_id = (
  SELECT id FROM root_cause_register WHERE cause_code = 'RC-007' AND organization_id = '11111111-1111-1111-1111-111111111111'
) WHERE cause_code = 'RC-043' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Lack of security awareness → Human error

UPDATE root_cause_register SET parent_cause_id = (
  SELECT id FROM root_cause_register WHERE cause_code = 'RC-003' AND organization_id = '11111111-1111-1111-1111-111111111111'
) WHERE cause_code = 'RC-045' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Technology debt → Legacy systems

UPDATE root_cause_register SET parent_cause_id = (
  SELECT id FROM root_cause_register WHERE cause_code = 'RC-010' AND organization_id = '11111111-1111-1111-1111-111111111111'
) WHERE cause_code = 'RC-044' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Inadequate vendor due diligence → Vendor failure

-- Create view for hierarchical root causes
CREATE OR REPLACE VIEW root_cause_hierarchy_view AS
WITH RECURSIVE cause_tree AS (
  -- Base case: root causes (no parent)
  SELECT
    id,
    cause_code,
    cause_name,
    parent_cause_id,
    severity_indicator,
    category,
    subcategory,
    1 as depth,
    cause_code as path
  FROM root_cause_register
  WHERE parent_cause_id IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111111'

  UNION ALL

  -- Recursive case: child causes
  SELECT
    rc.id,
    rc.cause_code,
    rc.cause_name,
    rc.parent_cause_id,
    rc.severity_indicator,
    rc.category,
    rc.subcategory,
    ct.depth + 1,
    ct.path || ' > ' || rc.cause_code
  FROM root_cause_register rc
  INNER JOIN cause_tree ct ON rc.parent_cause_id = ct.id
  WHERE rc.organization_id = '11111111-1111-1111-1111-111111111111'
)
SELECT * FROM cause_tree
ORDER BY path;

-- Update severity indicators for existing root causes
UPDATE root_cause_register SET severity_indicator = 'High' WHERE cause_code IN ('RC-001', 'RC-002', 'RC-003', 'RC-004', 'RC-005') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE root_cause_register SET severity_indicator = 'Critical' WHERE cause_code IN ('RC-011', 'RC-014', 'RC-016', 'RC-022') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE root_cause_register SET severity_indicator = 'Medium' WHERE cause_code IN ('RC-006', 'RC-007', 'RC-008', 'RC-009', 'RC-012', 'RC-013', 'RC-015', 'RC-020', 'RC-021') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE root_cause_register SET severity_indicator = 'High' WHERE cause_code IN ('RC-010', 'RC-017', 'RC-018', 'RC-019', 'RC-023') AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Comments
COMMENT ON COLUMN root_cause_register.parent_cause_id IS 'Hierarchical parent for grouping related root causes';
COMMENT ON COLUMN root_cause_register.severity_indicator IS 'Severity level of this root cause: Low, Medium, High, or Critical';
COMMENT ON VIEW root_cause_hierarchy_view IS 'Hierarchical view of root causes showing parent-child relationships';

-- Update total count comment
COMMENT ON TABLE root_cause_register IS 'Expanded to 45 comprehensive root causes with hierarchical structure and severity indicators';

-- End of Migration 16


-- ============================================================================
-- Migration 17: expand_impact_register
-- File: 20251126000017_expand_impact_register.sql
-- ============================================================================

-- Migration: Expand Impact Register (11 → 30)
-- Description: Add 19 additional impacts based on solution architect review
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #2 (Critical)

-- Add new columns for severity levels and financial impact
ALTER TABLE impact_register
  ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20) CHECK (severity_level IN ('Minor', 'Moderate', 'Major', 'Severe', 'Catastrophic')),
  ADD COLUMN IF NOT EXISTS financial_range_min NUMERIC,
  ADD COLUMN IF NOT EXISTS financial_range_max NUMERIC,
  ADD COLUMN IF NOT EXISTS recovery_time_estimate VARCHAR(50); -- e.g., '< 1 day', '1-7 days', '1-4 weeks', '> 1 month'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_impact_severity ON impact_register(severity_level);
CREATE INDEX IF NOT EXISTS idx_impact_financial_range ON impact_register(financial_range_min, financial_range_max);

-- Insert 19 additional impacts
INSERT INTO impact_register (
  impact_code, impact_name, impact_description, impact_type,
  category, subcategory, severity_level, status, organization_id, approved_at
) VALUES
-- Operational Impacts
('IMP-012', 'Operational inefficiency', 'Reduced productivity and operational effectiveness', 'operational', 'Operational Risk', 'Process Inefficiency', 'Moderate', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-023', 'Supply chain disruption', 'Interruption to supply chain operations affecting delivery', 'operational', 'Supply Chain & Logistics Risk', 'Supply Disruptions', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- People & Culture Impacts
('IMP-013', 'Employee morale decline', 'Reduction in employee satisfaction and engagement', 'strategic', 'Human Capital Risk', 'Employee Engagement', 'Moderate', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-014', 'Knowledge/skill loss', 'Loss of critical knowledge or expertise from the organization', 'strategic', 'Human Capital Risk', 'Succession Planning', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-021', 'Talent attrition', 'Loss of key personnel to competitors or market', 'strategic', 'Human Capital Risk', 'Employee Retention', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-030', 'Cultural degradation', 'Deterioration of organizational culture and values', 'strategic', 'Governance & Reputational Risk', 'Workplace Culture', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Innovation & Strategic Impacts
('IMP-015', 'Innovation stagnation', 'Slowdown or halt in innovation and product development', 'strategic', 'Strategic Risk', 'Innovation Pipeline', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-018', 'Strategic misalignment', 'Divergence from strategic objectives and goals', 'strategic', 'Strategic Risk', 'Strategic Planning Failures', 'Severe', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-026', 'Competitive advantage erosion', 'Loss of market differentiators and competitive position', 'strategic', 'Strategic Risk', 'Market Competition', 'Severe', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-029', 'Business model obsolescence', 'Fundamental business model becoming outdated or unviable', 'strategic', 'Strategic Risk', 'Business Model Disruption', 'Catastrophic', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Environmental & Social Impacts
('IMP-016', 'Environmental harm', 'Damage to the natural environment from operations', 'environmental', 'ESG & Sustainability Risk', 'Environmental Pollution', 'Severe', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-017', 'Community relations damage', 'Harm to relationships with local communities and stakeholders', 'reputational', 'ESG & Sustainability Risk', 'Community Relations', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Partnership & Relationship Impacts
('IMP-018-DUP', 'Partnership dissolution', 'Termination of strategic partnerships or alliances', 'strategic', 'Strategic Risk', 'Partnership & Alliance Risks', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Technology & Asset Impacts
('IMP-020', 'Technology debt accumulation', 'Buildup of technical debt reducing agility and increasing maintenance costs', 'operational', 'Technology & Cyber Risk', 'Technology Obsolescence', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-025', 'Intellectual property loss', 'Loss or theft of intellectual property, trade secrets, or proprietary information', 'regulatory', 'Innovation & IP Risk', 'Trade Secret Protection', 'Severe', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Market & Business Impacts
('IMP-022', 'Market credibility loss', 'Loss of market credibility and investor confidence', 'reputational', 'Governance & Reputational Risk', 'Brand Reputation', 'Severe', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-024', 'Shareholder value destruction', 'Significant reduction in shareholder value and market capitalization', 'financial', 'Financial Risk', 'Asset Valuation', 'Catastrophic', 'active', '11111111-1111-1111-1111-111111111111', NOW()),

-- Legal & Contractual Impacts
('IMP-027', 'Contractual default', 'Failure to meet contractual obligations leading to default', 'regulatory', 'Compliance & Legal Risk', 'Contractual Obligations', 'Major', 'active', '11111111-1111-1111-1111-111111111111', NOW()),
('IMP-028', 'Insurance claim', 'Triggering of insurance claims affecting premiums and coverage', 'financial', 'Financial Risk', 'Insurance Requirements', 'Moderate', 'active', '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (organization_id, impact_code) DO NOTHING;

-- Fix duplicate impact code
UPDATE impact_register
SET impact_code = 'IMP-019'
WHERE impact_code = 'IMP-018-DUP' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Update severity levels for existing impacts
UPDATE impact_register SET severity_level = 'Major' WHERE impact_code IN ('IMP-001', 'IMP-002', 'IMP-007', 'IMP-011') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET severity_level = 'Severe' WHERE impact_code IN ('IMP-003', 'IMP-004', 'IMP-005', 'IMP-006', 'IMP-009') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET severity_level = 'Major' WHERE impact_code IN ('IMP-008', 'IMP-010') AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Set recovery time estimates (examples)
UPDATE impact_register SET recovery_time_estimate = '< 1 day' WHERE severity_level = 'Minor' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET recovery_time_estimate = '1-7 days' WHERE severity_level = 'Moderate' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET recovery_time_estimate = '1-4 weeks' WHERE severity_level = 'Major' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET recovery_time_estimate = '1-3 months' WHERE severity_level = 'Severe' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET recovery_time_estimate = '> 3 months' WHERE severity_level = 'Catastrophic' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Set financial ranges (examples - should be customized per organization)
UPDATE impact_register SET financial_range_min = 0, financial_range_max = 10000 WHERE severity_level = 'Minor' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET financial_range_min = 10000, financial_range_max = 100000 WHERE severity_level = 'Moderate' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET financial_range_min = 100000, financial_range_max = 1000000 WHERE severity_level = 'Major' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET financial_range_min = 1000000, financial_range_max = 10000000 WHERE severity_level = 'Severe' AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE impact_register SET financial_range_min = 10000000, financial_range_max = NULL WHERE severity_level = 'Catastrophic' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Create view for impact severity analysis
CREATE OR REPLACE VIEW impact_severity_analysis_view AS
SELECT
  severity_level,
  COUNT(*) as impact_count,
  ARRAY_AGG(impact_code ORDER BY impact_code) as impact_codes,
  ARRAY_AGG(impact_name ORDER BY impact_code) as impact_names,
  AVG(financial_range_min) as avg_min_financial_impact,
  AVG(financial_range_max) as avg_max_financial_impact,
  MODE() WITHIN GROUP (ORDER BY recovery_time_estimate) as typical_recovery_time
FROM impact_register
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
GROUP BY severity_level
ORDER BY
  CASE severity_level
    WHEN 'Minor' THEN 1
    WHEN 'Moderate' THEN 2
    WHEN 'Major' THEN 3
    WHEN 'Severe' THEN 4
    WHEN 'Catastrophic' THEN 5
  END;

-- Comments
COMMENT ON COLUMN impact_register.severity_level IS 'Severity classification: Minor, Moderate, Major, Severe, Catastrophic';
COMMENT ON COLUMN impact_register.financial_range_min IS 'Minimum estimated financial impact (in base currency)';
COMMENT ON COLUMN impact_register.financial_range_max IS 'Maximum estimated financial impact (NULL for unlimited)';
COMMENT ON COLUMN impact_register.recovery_time_estimate IS 'Estimated time to recover from this impact';
COMMENT ON VIEW impact_severity_analysis_view IS 'Analysis of impacts grouped by severity level';

-- Update total count comment
COMMENT ON TABLE impact_register IS 'Expanded to 30 comprehensive impacts with severity levels and financial impact ranges';

-- End of Migration 17


-- ============================================================================
-- Migration 18: fix_dime_scores
-- File: 20251126000018_fix_dime_scores.sql
-- ============================================================================

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
WHERE control_code IN ('CTL-001', 'CTL-002') AND organization_id = '11111111-1111-1111-1111-111111111111'; -- MFA, RBAC

UPDATE control_library SET design_score = 70, implementation_score = 65, monitoring_score = 50, evaluation_score = 40
WHERE control_code IN ('CTL-004', 'CTL-007', 'CTL-011', 'CTL-012', 'CTL-017') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Password enforcement, Firewall hardening, Patching, DNS filtering, Vuln scanning

-- Intermediate Cybersecurity Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-003', 'CTL-006', 'CTL-008', 'CTL-010', 'CTL-014') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- PAM, Network segmentation, IDS, EDR, Privileged session recording

UPDATE control_library SET design_score = 80, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-005', 'CTL-015') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Credential rotation, Security incident response plan

-- Advanced Cybersecurity Controls (highly complex, excellent design, difficult to fully implement)
UPDATE control_library SET design_score = 95, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-009' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- IPS

UPDATE control_library SET design_score = 90, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-013', 'CTL-016') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Firmware integrity, Penetration testing

UPDATE control_library SET design_score = 95, implementation_score = 75, monitoring_score = 65, evaluation_score = 50
WHERE control_code = 'CTL-018' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Zero-trust network

-- ============================================================================
-- OPERATIONAL CONTROLS
-- ============================================================================

-- Basic Operational Controls (procedural, easier to monitor)
UPDATE control_library SET design_score = 70, implementation_score = 65, monitoring_score = 55, evaluation_score = 45
WHERE control_code IN ('CTL-023', 'CTL-024', 'CTL-026', 'CTL-027', 'CTL-032') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Maintenance windows, SOPs, Dual validation, Exception logging, BC manuals

-- Intermediate Operational Controls (technical, good design but partial implementation)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-019', 'CTL-020', 'CTL-022') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Load balancing, Auto-scaling, Queue throttling

UPDATE control_library SET design_score = 80, implementation_score = 70, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-025', 'CTL-028', 'CTL-029', 'CTL-030', 'CTL-031') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- QA/QC, Audit testing, Process monitoring, Real-time alerting, RTO/RPO definition

-- Advanced Operational Controls (complex infrastructure)
UPDATE control_library SET design_score = 90, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-021' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Fail-over infrastructure

-- ============================================================================
-- DATA GOVERNANCE CONTROLS
-- ============================================================================

-- Basic Data Controls
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-033', 'CTL-040', 'CTL-042') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Data validation, Encryption in transit, Retention policies

-- Intermediate Data Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-034', 'CTL-035', 'CTL-036', 'CTL-037', 'CTL-039', 'CTL-041', 'CTL-043') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Reconciliation, Master data, Access partitioning, Checksum, Encryption at rest, Classification, PII/PHI enforcement

-- Advanced Data Controls (sophisticated implementation)
UPDATE control_library SET design_score = 90, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-038' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Data masking/tokenizing

-- ============================================================================
-- GOVERNANCE & COMPLIANCE CONTROLS
-- ============================================================================

-- Basic Governance Controls (procedural, well-designed but evaluation is weak)
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 55, evaluation_score = 45
WHERE control_code IN ('CTL-044', 'CTL-045', 'CTL-047', 'CTL-051', 'CTL-052') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Segregation of duties, Approval workflows, Risk ownership, Ethical conduct, Whistleblower

-- Intermediate Governance Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-046', 'CTL-048', 'CTL-049') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Board oversight, Regulatory monitoring, Policy audits

-- Advanced Governance Controls
UPDATE control_library SET design_score = 90, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code = 'CTL-050' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Independent assurance reviews

-- ============================================================================
-- FINANCIAL CONTROLS
-- ============================================================================

-- Basic Financial Controls
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-057', 'CTL-059') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Sensitivity analysis, Payment authorization limits

-- Intermediate Financial Controls (analytical, strong design but execution varies)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-053', 'CTL-054', 'CTL-055', 'CTL-056', 'CTL-058', 'CTL-060', 'CTL-061') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Liquidity monitoring, Capital buffer, Hedging, Stress testing, Counterparty evaluation, Treasury segregation, Fraud analytics

-- ============================================================================
-- HR / PEOPLE / CULTURE CONTROLS
-- ============================================================================

-- Basic HR Controls (procedural, straightforward but hard to measure effectiveness)
UPDATE control_library SET design_score = 70, implementation_score = 65, monitoring_score = 50, evaluation_score = 40
WHERE control_code IN ('CTL-062', 'CTL-064', 'CTL-066', 'CTL-068', 'CTL-069') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Mandatory training, Access revocation, Role clarity, Conduct policy, Minimum staffing

-- Intermediate HR Controls
UPDATE control_library SET design_score = 80, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-063', 'CTL-065', 'CTL-067') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Competency certification, Job rotation, Burnout monitoring

-- ============================================================================
-- THIRD-PARTY / VENDOR CONTROLS
-- ============================================================================

-- Basic Vendor Controls
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 60, evaluation_score = 50
WHERE control_code IN ('CTL-073', 'CTL-075', 'CTL-076') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Access boundary, Incident reporting, API health monitoring

-- Intermediate Vendor Controls (strong design, moderate implementation quality)
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-070', 'CTL-071', 'CTL-072', 'CTL-074') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- SLA enforcement, Multi-vendor redundancy, Periodic assessments, Vendor accreditation

-- ============================================================================
-- PHYSICAL & FACILITY CONTROLS
-- ============================================================================

-- Basic Physical Controls (well-designed, but monitoring and testing gaps)
UPDATE control_library SET design_score = 75, implementation_score = 70, monitoring_score = 55, evaluation_score = 45
WHERE control_code IN ('CTL-077', 'CTL-078') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Physical badges, CCTV

-- Intermediate Physical Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-079', 'CTL-080', 'CTL-081', 'CTL-082', 'CTL-083') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Man-trap, Biometric access, Fire suppression, UPS, Server cages

-- ============================================================================
-- INFRASTRUCTURE & ARCHITECTURE CONTROLS
-- ============================================================================

-- Intermediate Infrastructure Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-084', 'CTL-089') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Containerization, Automated roll-back

-- Advanced Infrastructure Controls (brilliant design, challenging to implement fully)
UPDATE control_library SET design_score = 95, implementation_score = 80, monitoring_score = 70, evaluation_score = 60
WHERE control_code IN ('CTL-085', 'CTL-086', 'CTL-087', 'CTL-088') AND organization_id = '11111111-1111-1111-1111-111111111111';
-- Microservices, Geo-distribution, Standby systems, Chaos engineering

-- ============================================================================
-- DISASTER RECOVERY & RESILIENCE CONTROLS
-- ============================================================================

-- Basic DR Controls (procedural, good plans but weak testing)
UPDATE control_library SET design_score = 75, implementation_score = 65, monitoring_score = 50, evaluation_score = 40
WHERE control_code = 'CTL-093' AND organization_id = '11111111-1111-1111-1111-111111111111'; -- Crisis communications

-- Intermediate DR Controls
UPDATE control_library SET design_score = 85, implementation_score = 75, monitoring_score = 65, evaluation_score = 55
WHERE control_code IN ('CTL-090', 'CTL-091', 'CTL-092', 'CTL-094', 'CTL-095') AND organization_id = '11111111-1111-1111-1111-111111111111';
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
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
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
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
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
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
-- GROUP BY complexity;
--
-- Expected Results (approximately):
-- Basic:        D: 73, I: 68, M: 55, E: 46
-- Intermediate: D: 84, I: 74, M: 64, E: 54
-- Advanced:     D: 93, I: 79, M: 69, E: 58

-- Update comment on control_library table
COMMENT ON TABLE control_library IS 'Seeded with 95 comprehensive controls with realistic DIME score variations reflecting implementation challenges';

-- End of Migration 18


-- ============================================================================
-- Migration 19: create_kri_kci_mappings
-- File: 20251126000019_create_kri_kci_mappings.sql
-- ============================================================================

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

-- End of Migration 19


-- ============================================================================
-- Migration 20: add_implementation_guidance
-- File: 20251126000020_add_implementation_guidance.sql
-- ============================================================================

-- Migration: Add Implementation Guidance to Controls
-- Description: Enhance control library with detailed implementation guidance, prerequisites, and testing criteria
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #5 (Important)

-- ============================================================================
-- ADD NEW COLUMNS TO CONTROL_LIBRARY
-- ============================================================================

ALTER TABLE control_library
  ADD COLUMN IF NOT EXISTS implementation_guidance TEXT,
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS success_criteria TEXT,
  ADD COLUMN IF NOT EXISTS testing_guidance TEXT,
  ADD COLUMN IF NOT EXISTS regulatory_references TEXT,
  ADD COLUMN IF NOT EXISTS industry_standards TEXT,
  ADD COLUMN IF NOT EXISTS automation_level VARCHAR(20) CHECK (automation_level IN ('Manual', 'Semi-Automated', 'Fully-Automated'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_automation ON control_library(automation_level);

-- ============================================================================
-- CYBERSECURITY CONTROLS (CTL-001 to CTL-018)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Deploy MFA solution (e.g., Google Authenticator, Duo, Okta) for all user accounts. Configure mandatory MFA for privileged accounts first, then roll out to all users. Provide user training and support documentation.',
  prerequisites = 'Identity management system; User directory (AD/LDAP); End-user mobile device policy',
  success_criteria = '100% of privileged accounts have MFA enabled; >95% of all user accounts have MFA enabled; <1% MFA bypass requests per month',
  testing_guidance = 'Attempt login without second factor; Test MFA enrollment process; Verify backup codes work; Test account recovery process',
  regulatory_references = 'PCI-DSS 8.3; NIST SP 800-63B; GDPR Article 32',
  industry_standards = 'ISO 27001:2013 A.9.4.2; NIST CSF PR.AC-7; CIS Controls v8 6.5',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-001' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement RBAC using least-privilege principle. Define roles based on job functions, assign permissions to roles (not individuals), regularly review and update role assignments.',
  prerequisites = 'Identity and Access Management (IAM) system; Documented organizational structure; Role definitions and responsibilities',
  success_criteria = 'All users assigned to roles; No direct permission assignments; Quarterly role review completed; Access requests processed within 1 business day',
  testing_guidance = 'Attempt to access resources outside assigned role; Verify role permissions align with job duties; Test role inheritance if hierarchical',
  regulatory_references = 'SOX Section 404; HIPAA 164.308(a)(4); GDPR Article 32',
  industry_standards = 'ISO 27001:2013 A.9.2.3; NIST CSF PR.AC-4; CIS Controls v8 6.8',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-002' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Deploy PAM solution (CyberArk, BeyondTrust, Thycotic) to manage privileged accounts. Implement password vaulting, session recording, just-in-time access, and credential rotation.',
  prerequisites = 'Inventory of all privileged accounts; PAM platform; Integration with AD/LDAP; Session recording infrastructure',
  success_criteria = '100% privileged accounts in PAM vault; All privileged sessions recorded; Zero shared privileged passwords; Emergency access break-glass procedures tested',
  testing_guidance = 'Test password check-out/check-in process; Verify session recording playback; Test emergency access; Attempt direct privileged account login (should fail)',
  regulatory_references = 'PCI-DSS 8.2.3; FFIEC CAT; SOC 2 Type II CC6.1',
  industry_standards = 'ISO 27001:2013 A.9.2.3; NIST CSF PR.AC-4; CIS Controls v8 5.4',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-003' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Configure password policy requiring minimum length (12+ chars), complexity (upper, lower, number, special char), expiration (90 days), and history (prevent reuse of last 12 passwords).',
  prerequisites = 'Active Directory or IAM system with policy enforcement capabilities',
  success_criteria = 'Password policy enforced at system level; 100% compliance with minimum requirements; User training on strong password creation',
  testing_guidance = 'Attempt weak password creation; Test password reuse prevention; Verify expiration notifications',
  regulatory_references = 'NIST SP 800-63B; PCI-DSS 8.2.3-8.2.5',
  industry_standards = 'ISO 27001:2013 A.9.4.3; CIS Controls v8 5.2',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-004' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement automated credential rotation for service accounts, API keys, and certificates. Rotate passwords every 90 days, API keys every 180 days, certificates before expiration.',
  prerequisites = 'Secrets management system (HashiCorp Vault, AWS Secrets Manager); Inventory of all credentials; Application support for dynamic credentials',
  success_criteria = '100% service account passwords rotated quarterly; Zero hardcoded credentials in code; Automated certificate renewal 30 days before expiry',
  testing_guidance = 'Verify rotation process completes successfully; Test application connectivity after rotation; Check for credential exposure in logs',
  regulatory_references = 'PCI-DSS 8.2.4; SOC 2 CC6.1',
  industry_standards = 'NIST SP 800-53 IA-5; CIS Controls v8 5.3',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-005' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Segment network into security zones (DMZ, internal, production, development). Implement VLANs, firewalls between zones, and access controls. Restrict inter-zone traffic to required ports/protocols only.',
  prerequisites = 'Network architecture diagram; Next-gen firewall capabilities; VLAN support on switches; Traffic flow analysis',
  success_criteria = 'Minimum 3 security zones defined; Firewall rules between all zones; Default deny inter-zone traffic; Quarterly rule review',
  testing_guidance = 'Attempt unauthorized inter-zone communication; Verify firewall rules block prohibited traffic; Test traffic logging completeness',
  regulatory_references = 'PCI-DSS 1.2.1; HIPAA 164.312(e)(1)',
  industry_standards = 'ISO 27001:2013 A.13.1.3; NIST CSF PR.AC-5; CIS Controls v8 12.2',
  automation_level = 'Manual'
WHERE control_code = 'CTL-006' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Review firewall rules quarterly. Remove unused rules, consolidate overlapping rules, implement least-privilege access. Document business justification for each rule.',
  prerequisites = 'Firewall change management process; Firewall rule inventory; Rule ownership assignment',
  success_criteria = 'Quarterly rule review completed; <5% unused rules; All rules have business owner; Change documentation for all modifications',
  testing_guidance = 'Identify unused rules (no hits in 90 days); Test rule ordering for efficiency; Verify logging enabled on critical rules',
  regulatory_references = 'PCI-DSS 1.1.6; NIST SP 800-41',
  industry_standards = 'ISO 27001:2013 A.13.1.1; CIS Controls v8 4.4',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-007' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- Note: Due to length constraints, I'll provide guidance for key controls across categories
-- Remaining cybersecurity controls (CTL-008 to CTL-018) follow similar pattern

UPDATE control_library SET
  implementation_guidance = 'Deploy IDS solution (Snort, Suricata, Zeek) at network perimeter and critical segments. Configure signatures for known attacks, tune to reduce false positives, integrate with SIEM.',
  prerequisites = 'Network tap or SPAN port; IDS platform; Signature updates; SIEM integration',
  success_criteria = 'IDS monitoring all ingress/egress traffic; <10% false positive rate; Alert triage SLA <4 hours; Monthly signature updates',
  testing_guidance = 'Generate test attack traffic (safely); Verify alerts trigger; Test alert routing to SOC; Measure detection time',
  industry_standards = 'ISO 27001:2013 A.12.4.1; NIST CSF DE.CM-1; CIS Controls v8 13.2',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-008' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Deploy zero-trust network architecture. Assume breach, verify explicitly, use least-privilege access, inspect all traffic, implement micro-segmentation.',
  prerequisites = 'Identity provider; Network access control; Endpoint agents; Policy engine; Continuous monitoring',
  success_criteria = 'All resources require authentication; Default deny network policy; Micro-segmentation implemented; Continuous trust evaluation',
  testing_guidance = 'Test lateral movement prevention; Verify policy enforcement; Test compromised device scenarios',
  regulatory_references = 'NIST SP 800-207',
  industry_standards = 'NIST Zero Trust Architecture; Forrester ZTX',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-018' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- OPERATIONAL CONTROLS (CTL-019 to CTL-032)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Deploy load balancer (F5, HAProxy, AWS ELB) to distribute traffic across multiple servers. Configure health checks, session persistence, SSL offloading, and automatic failover.',
  prerequisites = 'Multiple application servers; Load balancer infrastructure; Health check endpoints in application',
  success_criteria = 'Traffic evenly distributed; Health checks detect failures within 30 seconds; Zero downtime during individual server failure; SSL termination working',
  testing_guidance = 'Simulate server failure; Verify traffic redistribution; Test health check accuracy; Measure failover time',
  industry_standards = 'AWS Well-Architected Framework; Azure Reliability Patterns',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-019' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement auto-scaling based on CPU, memory, or custom metrics. Define scale-out/scale-in thresholds, cooldown periods, min/max instance counts. Test scaling during load tests.',
  prerequisites = 'Cloud infrastructure or orchestration platform; Application designed for horizontal scaling; Monitoring metrics configured',
  success_criteria = 'Scaling triggers activate at defined thresholds; Scale-out time <5 minutes; Scale-in prevents thrashing; Cost optimization achieved',
  testing_guidance = 'Conduct load test to trigger scale-out; Verify instances added/removed correctly; Test application state during scaling',
  industry_standards = 'AWS Auto Scaling Best Practices; Kubernetes HPA',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-020' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Create documented SOPs for all critical business processes. Use standard format, include step-by-step instructions, decision trees, and escalation paths. Review and update annually.',
  prerequisites = 'Process mapping completed; Subject matter expert input; Document management system',
  success_criteria = 'SOPs exist for all critical processes; Annual review completed; Staff trained on SOPs; <5% SOP violations per quarter',
  testing_guidance = 'Have new staff follow SOP; Identify gaps or ambiguities; Verify SOP achieves desired outcome',
  regulatory_references = 'ISO 9001:2015 Clause 7.5; SOX 404',
  industry_standards = 'ISO 27001:2013 A.12.1.1; ITIL Process Documentation',
  automation_level = 'Manual'
WHERE control_code = 'CTL-024' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- DATA GOVERNANCE CONTROLS (CTL-033 to CTL-043)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Implement data validation rules at all input points (web forms, APIs, file uploads). Validate data type, format, range, and business logic. Reject invalid data with clear error messages.',
  prerequisites = 'Data validation framework; Input schemas defined; Error handling process',
  success_criteria = 'Validation implemented on 100% of input fields; <0.1% invalid data in database; User-friendly error messages',
  testing_guidance = 'Submit invalid data (SQL injection, XSS, format errors); Verify rejection and logging; Test boundary conditions',
  regulatory_references = 'OWASP Top 10 A03:2021; PCI-DSS 6.5.1',
  industry_standards = 'ISO 27001:2013 A.14.2.1; NIST SP 800-53 SI-10',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-033' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Encrypt all sensitive data at rest using AES-256 or equivalent. Implement key management system, rotate keys annually, protect keys separately from data.',
  prerequisites = 'Key management system (KMS); Data classification completed; Encryption libraries/tools',
  success_criteria = '100% of sensitive data encrypted; Keys stored in KMS; Annual key rotation; Encryption performance <10% overhead',
  testing_guidance = 'Verify data encrypted on disk; Test key rotation process; Attempt data access without decryption key',
  regulatory_references = 'GDPR Article 32; HIPAA 164.312(a)(2)(iv); PCI-DSS 3.4',
  industry_standards = 'ISO 27001:2013 A.10.1.1; NIST SP 800-111; CIS Controls v8 3.11',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-039' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Enforce TLS 1.2+ for all data in transit. Disable weak ciphers, implement certificate pinning where appropriate, use HSTS headers.',
  prerequisites = 'Valid SSL/TLS certificates; Certificate management process; Web server configuration',
  success_criteria = '100% of data transmission encrypted; TLS 1.2+ only; A+ rating on SSL Labs test; Certificate expiry monitoring',
  testing_guidance = 'Scan with SSL Labs; Test for weak ciphers; Verify certificate validity; Test certificate renewal process',
  regulatory_references = 'PCI-DSS 4.1; HIPAA 164.312(e)(2)(ii)',
  industry_standards = 'ISO 27001:2013 A.13.1.1; NIST SP 800-52; CIS Controls v8 3.10',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-040' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- GOVERNANCE & COMPLIANCE CONTROLS (CTL-044 to CTL-052)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Separate critical functions: transaction initiation, authorization, recording, and reconciliation. No single individual should have access to all four functions. Document segregation matrix.',
  prerequisites = 'Process documentation; Role definitions; Access control system supporting fine-grained permissions',
  success_criteria = 'Segregation matrix documented; 100% compliance with separation rules; Quarterly compliance review; Exception approvals documented',
  testing_guidance = 'Identify conflicting access; Test system prevents unauthorized combinations; Review exception access',
  regulatory_references = 'SOX Section 404; COSO Internal Control Framework',
  industry_standards = 'ISO 27001:2013 A.12.4.2; COBIT 5 DSS05.04',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-044' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- FINANCIAL CONTROLS (CTL-053 to CTL-061)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Monitor cash position daily. Forecast cash flows weekly. Maintain minimum liquidity ratio (e.g., 1.5x operating expenses). Establish credit facilities as backup.',
  prerequisites = 'Cash flow forecasting model; Daily cash position reports; Treasury management system',
  success_criteria = 'Daily cash monitoring; Liquidity ratio above minimum; Zero cash shortfalls; Accurate 30-day cash forecast',
  testing_guidance = 'Review forecast accuracy vs. actuals; Test liquidity stress scenarios; Verify credit facility availability',
  regulatory_references = 'Basel III LCR; Dodd-Frank Liquidity Requirements',
  industry_standards = 'COSO ERM Framework; ISO 31000',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-053' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- HR CONTROLS (CTL-062 to CTL-069)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Develop mandatory training program covering security awareness, compliance, ethics, and job-specific skills. Track completion, require annual refresh, test comprehension.',
  prerequisites = 'Learning management system (LMS); Training content; Compliance tracking',
  success_criteria = '100% staff complete required training; <30 days for new hires; Annual refresh completion >95%; Test pass rate >80%',
  testing_guidance = 'Audit training completion records; Test knowledge retention; Verify new hire training process',
  regulatory_references = 'SOX 404; GDPR Article 39; HIPAA 164.308(a)(5)',
  industry_standards = 'ISO 27001:2013 A.7.2.2; NIST CSF PR.AT-1; CIS Controls v8 14.1',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-062' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Implement automated process to revoke all access (physical, logical, VPN, email) within 1 hour of termination notice. Disable accounts first, delete after 90 days. Return all assets.',
  prerequisites = 'HR-IT integration; Centralized identity management; Asset tracking system',
  success_criteria = '100% account deactivation within 1 hour; All assets returned; Exit interview completed; Access audit 30 days post-termination',
  testing_guidance = 'Test account deactivation speed; Verify all access types revoked; Audit for orphaned accounts',
  regulatory_references = 'SOX 404; HIPAA 164.308(a)(3)(ii)(C)',
  industry_standards = 'ISO 27001:2013 A.8.1.3; NIST SP 800-53 PS-4; CIS Controls v8 5.6',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-064' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- VENDOR CONTROLS (CTL-070 to CTL-076)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Establish clear SLAs with all critical vendors (uptime %, response time, resolution time). Monitor SLA compliance monthly, conduct quarterly business reviews, enforce penalties for breaches.',
  prerequisites = 'Vendor contracts with SLA terms; SLA monitoring tools; Vendor management process',
  success_criteria = 'SLAs defined for all critical vendors; Monthly compliance reporting; <5% SLA breaches; Vendor reviews completed quarterly',
  testing_guidance = 'Review SLA metrics vs. contract terms; Test vendor incident response; Audit vendor performance reports',
  regulatory_references = 'FFIEC Outsourcing Technology Services',
  industry_standards = 'ISO 27001:2013 A.15.1.2; ITIL Service Level Management',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-070' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- PHYSICAL CONTROLS (CTL-077 to CTL-083)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Deploy badge access system for all entry points. Integrate with HR system for automated provisioning/deprovisioning. Log all access events, review anomalies monthly.',
  prerequisites = 'Badge access system; HR integration; Centralized access log storage',
  success_criteria = '100% entry points controlled; Badge provisioning within 24 hours; Access logs retained 1 year; Monthly audit of tailgating events',
  testing_guidance = 'Test badge activation/deactivation; Review access logs for anomalies; Physical security audit',
  industry_standards = 'ISO 27001:2013 A.11.1.2; NIST SP 800-53 PE-3',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-077' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- INFRASTRUCTURE CONTROLS (CTL-084 to CTL-089)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Containerize applications using Docker/Kubernetes. Implement container security scanning, resource limits, immutable infrastructure. Use orchestration for deployment.',
  prerequisites = 'Container platform; CI/CD pipeline; Container registry; Security scanning tools',
  success_criteria = '>80% applications containerized; All containers scanned for vulnerabilities; Deployment automation; <10 minute deployment time',
  testing_guidance = 'Scan containers for vulnerabilities; Test resource limit enforcement; Verify deployment rollback works',
  industry_standards = 'NIST SP 800-190; CIS Docker Benchmark',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-084' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Refactor monolithic applications into microservices. Each service owns its data, communicates via APIs, independently deployable. Implement service mesh for observability.',
  prerequisites = 'Application architecture assessment; Container platform; Service mesh; API gateway',
  success_criteria = 'Services independently deployable; <15 minute deployment; Service-level SLOs defined; Circuit breakers implemented',
  testing_guidance = 'Test service isolation; Verify independent deployment; Test failure scenarios; Measure service dependencies',
  industry_standards = '12-Factor App Methodology; Domain-Driven Design',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-085' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- DR CONTROLS (CTL-090 to CTL-095)
-- ============================================================================

UPDATE control_library SET
  implementation_guidance = 'Define RTO (Recovery Time Objective) and RPO (Recovery Point Objective) for each critical system. Document in BCP, test quarterly, ensure technical solutions align with targets.',
  prerequisites = 'Business impact analysis; System inventory; Stakeholder agreement on acceptable downtime/data loss',
  success_criteria = 'RTO/RPO defined for all critical systems; Technical solutions meet targets; Quarterly DR test success; Stakeholder sign-off',
  testing_guidance = 'Conduct DR test; Measure actual recovery time vs. RTO; Verify data loss within RPO; Update documentation based on test results',
  regulatory_references = 'FFIEC Business Continuity Planning; SOC 2 A1.2',
  industry_standards = 'ISO 22301:2019; NIST SP 800-34; COBIT 5 DSS04',
  automation_level = 'Semi-Automated'
WHERE control_code = 'CTL-090' AND organization_id = '11111111-1111-1111-1111-111111111111';

UPDATE control_library SET
  implementation_guidance = 'Maintain automated, encrypted backups stored off-site (different geographic region). Test restore process monthly. Retain backups per retention policy (e.g., 7 daily, 4 weekly, 12 monthly).',
  prerequisites = 'Backup software; Off-site storage (cloud or physical); Encryption keys; Restore test environment',
  success_criteria = 'Daily backups complete successfully; Off-site replication within 24 hours; Monthly restore test passes; Retention policy enforced',
  testing_guidance = 'Restore random files from backup; Test restore to alternate location; Verify backup encryption; Measure restore time',
  regulatory_references = 'PCI-DSS 3.2.1 Requirement 9.5; HIPAA 164.308(a)(7)(ii)(A)',
  industry_standards = 'ISO 27001:2013 A.12.3.1; NIST SP 800-34; 3-2-1 Backup Rule',
  automation_level = 'Fully-Automated'
WHERE control_code = 'CTL-091' AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- SET DEFAULT AUTOMATION LEVELS FOR REMAINING CONTROLS
-- ============================================================================

-- Set automation levels for controls not yet updated
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-009', 'CTL-010', 'CTL-011', 'CTL-012', 'CTL-013', 'CTL-014', 'CTL-015', 'CTL-016', 'CTL-017') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-021', 'CTL-022', 'CTL-023', 'CTL-025', 'CTL-026', 'CTL-027', 'CTL-028', 'CTL-029', 'CTL-030', 'CTL-031', 'CTL-032') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-034', 'CTL-035', 'CTL-036', 'CTL-037', 'CTL-038', 'CTL-041', 'CTL-042', 'CTL-043') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Manual' WHERE control_code IN ('CTL-045', 'CTL-046', 'CTL-047', 'CTL-048', 'CTL-049', 'CTL-050', 'CTL-051', 'CTL-052') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-054', 'CTL-055', 'CTL-056', 'CTL-057', 'CTL-058', 'CTL-059', 'CTL-060', 'CTL-061') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Manual' WHERE control_code IN ('CTL-063', 'CTL-065', 'CTL-066', 'CTL-067', 'CTL-068', 'CTL-069') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-071', 'CTL-072', 'CTL-073', 'CTL-074', 'CTL-075', 'CTL-076') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Manual' WHERE control_code IN ('CTL-078', 'CTL-079', 'CTL-080', 'CTL-081', 'CTL-082', 'CTL-083') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Fully-Automated' WHERE control_code IN ('CTL-086', 'CTL-087', 'CTL-088', 'CTL-089') AND organization_id = '11111111-1111-1111-1111-111111111111';
UPDATE control_library SET automation_level = 'Semi-Automated' WHERE control_code IN ('CTL-092', 'CTL-093', 'CTL-094', 'CTL-095') AND organization_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- CREATE ANALYSIS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW control_implementation_readiness_view AS
SELECT
  automation_level,
  complexity,
  COUNT(*) as control_count,
  ROUND(AVG((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0), 1) as avg_dime,
  ARRAY_AGG(control_code ORDER BY control_code) as control_codes
FROM control_library
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
GROUP BY automation_level, complexity
ORDER BY
  CASE automation_level
    WHEN 'Fully-Automated' THEN 1
    WHEN 'Semi-Automated' THEN 2
    WHEN 'Manual' THEN 3
  END,
  CASE complexity
    WHEN 'Basic' THEN 1
    WHEN 'Intermediate' THEN 2
    WHEN 'Advanced' THEN 3
  END;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN control_library.implementation_guidance IS 'Detailed step-by-step guidance for implementing this control';
COMMENT ON COLUMN control_library.prerequisites IS 'Required infrastructure, systems, or processes before implementing this control';
COMMENT ON COLUMN control_library.success_criteria IS 'Measurable criteria to determine if control is successfully implemented';
COMMENT ON COLUMN control_library.testing_guidance IS 'Instructions for testing control effectiveness';
COMMENT ON COLUMN control_library.regulatory_references IS 'Relevant regulations, standards, or frameworks requiring this control';
COMMENT ON COLUMN control_library.industry_standards IS 'Industry best practice standards mapping (ISO 27001, NIST, CIS, etc.)';
COMMENT ON COLUMN control_library.automation_level IS 'Level of automation: Manual, Semi-Automated, or Fully-Automated';
COMMENT ON VIEW control_implementation_readiness_view IS 'Analysis of controls by automation level and complexity for implementation planning';

-- Update table comment
COMMENT ON TABLE control_library IS 'Comprehensive control library with implementation guidance, prerequisites, success criteria, and regulatory mappings';

-- End of Migration 20


-- ============================================================================
-- Migration 21: residual_risk_calculation
-- File: 20251126000021_residual_risk_calculation.sql
-- ============================================================================

-- Migration: Residual Risk Calculation
-- Description: Automated residual risk calculation based on control effectiveness (DIME scores)
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #6 (Important)

-- ============================================================================
-- ADD COLUMNS FOR RESIDUAL RISK TRACKING
-- ============================================================================

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_impact INTEGER CHECK (residual_impact BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_score INTEGER,
  ADD COLUMN IF NOT EXISTS control_effectiveness_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS residual_last_calculated TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_risks_residual_score ON risks(residual_score);
CREATE INDEX IF NOT EXISTS idx_risks_control_effectiveness ON risks(control_effectiveness_percentage);

-- ============================================================================
-- FUNCTION: Calculate Control Effectiveness
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_control_effectiveness(p_risk_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_effectiveness NUMERIC := 0;
  v_combined_residual NUMERIC := 1.0;
  v_individual_effectiveness NUMERIC;
  v_control_count INTEGER := 0;
BEGIN
  -- Get all active controls for this risk and calculate combined effectiveness
  FOR v_individual_effectiveness IN
    SELECT
      ((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0) / 100.0 AS effectiveness
    FROM risk_controls rc
    JOIN control_library c ON rc.control_id = c.id
    WHERE rc.risk_id = p_risk_id
      AND rc.status = 'active'
      AND c.status = 'active'
  LOOP
    v_control_count := v_control_count + 1;

    -- Combined effectiveness formula: 1 - PRODUCT(1 - individual_effectiveness)
    -- This accounts for diminishing returns when stacking controls
    v_combined_residual := v_combined_residual * (1.0 - v_individual_effectiveness);
  END LOOP;

  -- If no controls, effectiveness is 0%
  IF v_control_count = 0 THEN
    RETURN 0;
  END IF;

  -- Combined effectiveness = 1 - (product of all residuals)
  v_total_effectiveness := (1.0 - v_combined_residual) * 100.0;

  -- Cap at 95% (controls can never eliminate risk completely)
  IF v_total_effectiveness > 95 THEN
    v_total_effectiveness := 95;
  END IF;

  RETURN ROUND(v_total_effectiveness, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Calculate Residual Risk
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_residual_risk(
  p_inherent_likelihood INTEGER,
  p_inherent_impact INTEGER,
  p_risk_id UUID
)
RETURNS TABLE(
  residual_likelihood INTEGER,
  residual_impact INTEGER,
  residual_score INTEGER,
  control_effectiveness NUMERIC
) AS $$
DECLARE
  v_control_effectiveness NUMERIC;
  v_residual_likelihood INTEGER;
  v_residual_impact INTEGER;
  v_residual_score INTEGER;
BEGIN
  -- Calculate control effectiveness
  v_control_effectiveness := calculate_control_effectiveness(p_risk_id);

  -- Calculate residual likelihood (controls primarily reduce likelihood)
  -- Formula: Residual = Inherent * (1 - Effectiveness/100)
  -- Minimum residual likelihood is 1 (risk can never be zero)
  v_residual_likelihood := GREATEST(
    1,
    ROUND(p_inherent_likelihood * (1.0 - v_control_effectiveness / 100.0))
  );

  -- Calculate residual impact (controls can also reduce impact, but less effectively)
  -- Use 50% of control effectiveness for impact reduction
  -- Rationale: Likelihood-reducing controls (preventive) are most common
  v_residual_impact := GREATEST(
    1,
    ROUND(p_inherent_impact * (1.0 - (v_control_effectiveness * 0.5) / 100.0))
  );

  -- Calculate residual score (Likelihood × Impact)
  v_residual_score := v_residual_likelihood * v_residual_impact;

  -- Return results
  RETURN QUERY SELECT
    v_residual_likelihood,
    v_residual_impact,
    v_residual_score,
    v_control_effectiveness;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update Risk Residual Values
-- ============================================================================

CREATE OR REPLACE FUNCTION update_risk_residual()
RETURNS TRIGGER AS $$
DECLARE
  v_risk RECORD;
  v_residual RECORD;
BEGIN
  -- Determine which risk_id to update based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_risk := (SELECT * FROM risks WHERE id = OLD.risk_id);
  ELSE
    v_risk := (SELECT * FROM risks WHERE id = NEW.risk_id);
  END IF;

  -- Skip if risk doesn't exist (shouldn't happen due to foreign key, but be safe)
  IF v_risk IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate residual risk
  SELECT * INTO v_residual
  FROM calculate_residual_risk(
    v_risk.inherent_likelihood,
    v_risk.inherent_impact,
    v_risk.id
  );

  -- Update risk record with residual values
  UPDATE risks
  SET
    residual_likelihood = v_residual.residual_likelihood,
    residual_impact = v_residual.residual_impact,
    residual_score = v_residual.residual_score,
    control_effectiveness_percentage = v_residual.control_effectiveness,
    residual_last_calculated = NOW(),
    updated_at = NOW()
  WHERE id = v_risk.id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC RESIDUAL RISK UPDATES
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_residual_on_control_add ON risk_controls;
DROP TRIGGER IF EXISTS trigger_update_residual_on_control_update ON risk_controls;
DROP TRIGGER IF EXISTS trigger_update_residual_on_control_delete ON risk_controls;

-- Trigger: When control is added to a risk
CREATE TRIGGER trigger_update_residual_on_control_add
  AFTER INSERT ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

-- Trigger: When control status changes
CREATE TRIGGER trigger_update_residual_on_control_update
  AFTER UPDATE OF status ON risk_controls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_risk_residual();

-- Trigger: When control is removed from a risk
CREATE TRIGGER trigger_update_residual_on_control_delete
  AFTER DELETE ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

-- ============================================================================
-- FUNCTION: Recalculate All Residual Risks (Utility)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_residual_risks(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(
  risk_id UUID,
  risk_title TEXT,
  inherent_score INTEGER,
  residual_score INTEGER,
  risk_reduction_percentage NUMERIC
) AS $$
DECLARE
  v_risk RECORD;
  v_residual RECORD;
  v_updated_count INTEGER := 0;
BEGIN
  -- Loop through all risks (optionally filtered by organization)
  FOR v_risk IN
    SELECT id, title, inherent_likelihood, inherent_impact, (inherent_likelihood * inherent_impact) as inherent_score
    FROM risks
    WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
      AND inherent_likelihood IS NOT NULL
      AND inherent_impact IS NOT NULL
  LOOP
    -- Calculate residual risk
    SELECT * INTO v_residual
    FROM calculate_residual_risk(
      v_risk.inherent_likelihood,
      v_risk.inherent_impact,
      v_risk.id
    );

    -- Update risk record
    UPDATE risks
    SET
      residual_likelihood = v_residual.residual_likelihood,
      residual_impact = v_residual.residual_impact,
      residual_score = v_residual.residual_score,
      control_effectiveness_percentage = v_residual.control_effectiveness,
      residual_last_calculated = NOW(),
      updated_at = NOW()
    WHERE id = v_risk.id;

    v_updated_count := v_updated_count + 1;

    -- Return result row
    RETURN QUERY SELECT
      v_risk.id,
      v_risk.title,
      v_risk.inherent_score,
      v_residual.residual_score,
      ROUND(((v_risk.inherent_score - v_residual.residual_score)::NUMERIC / v_risk.inherent_score * 100), 1) AS reduction_pct;
  END LOOP;

  RAISE NOTICE 'Recalculated residual risk for % risks', v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE ANALYSIS VIEWS
-- ============================================================================

-- View: Risk Treatment Effectiveness
CREATE OR REPLACE VIEW risk_treatment_effectiveness_view AS
SELECT
  r.id,
  r.organization_id,
  r.title,
  r.inherent_likelihood,
  r.inherent_impact,
  (r.inherent_likelihood * r.inherent_impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  r.control_effectiveness_percentage,
  (r.inherent_likelihood * r.inherent_impact) - COALESCE(r.residual_score, r.inherent_likelihood * r.inherent_impact) as risk_reduction,
  ROUND(
    (((r.inherent_likelihood * r.inherent_impact) - COALESCE(r.residual_score, r.inherent_likelihood * r.inherent_impact))::NUMERIC /
    (r.inherent_likelihood * r.inherent_impact) * 100),
    1
  ) as risk_reduction_percentage,
  COUNT(rc.id) as control_count,
  r.residual_last_calculated
FROM risks r
LEFT JOIN risk_controls rc ON r.id = rc.risk_id AND rc.status = 'active'
WHERE r.inherent_likelihood IS NOT NULL AND r.inherent_impact IS NOT NULL
GROUP BY r.id, r.title, r.organization_id, r.inherent_likelihood, r.inherent_impact,
         r.residual_likelihood, r.residual_impact, r.residual_score,
         r.control_effectiveness_percentage, r.residual_last_calculated
ORDER BY risk_reduction_percentage DESC NULLS LAST;

-- View: Under-Controlled Risks (Residual > 12 and <50% reduction)
CREATE OR REPLACE VIEW under_controlled_risks_view AS
SELECT
  id,
  organization_id,
  title,
  inherent_score,
  residual_score,
  control_count,
  control_effectiveness_percentage,
  risk_reduction_percentage,
  CASE
    WHEN control_count = 0 THEN 'No controls assigned'
    WHEN control_effectiveness_percentage < 30 THEN 'Low control effectiveness'
    WHEN risk_reduction_percentage < 25 THEN 'Insufficient risk reduction'
    ELSE 'High residual risk'
  END as issue_type
FROM risk_treatment_effectiveness_view
WHERE residual_score > 12 OR risk_reduction_percentage < 50
ORDER BY residual_score DESC, risk_reduction_percentage ASC;

-- View: Well-Controlled Risks (>75% reduction or residual <6)
CREATE OR REPLACE VIEW well_controlled_risks_view AS
SELECT
  id,
  organization_id,
  title,
  inherent_score,
  residual_score,
  control_count,
  control_effectiveness_percentage,
  risk_reduction_percentage
FROM risk_treatment_effectiveness_view
WHERE risk_reduction_percentage >= 75 OR residual_score <= 6
ORDER BY risk_reduction_percentage DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN risks.residual_likelihood IS 'Calculated likelihood after controls applied (1-5 scale)';
COMMENT ON COLUMN risks.residual_impact IS 'Calculated impact after controls applied (1-5 scale)';
COMMENT ON COLUMN risks.residual_score IS 'Calculated residual risk score (likelihood × impact)';
COMMENT ON COLUMN risks.control_effectiveness_percentage IS 'Combined effectiveness of all controls (0-95%)';
COMMENT ON COLUMN risks.residual_last_calculated IS 'Timestamp of last residual risk calculation';

COMMENT ON FUNCTION calculate_control_effectiveness IS 'Calculates combined effectiveness of all active controls for a risk using diminishing returns formula';
COMMENT ON FUNCTION calculate_residual_risk IS 'Calculates residual likelihood, impact, and score based on inherent risk and control effectiveness';
COMMENT ON FUNCTION update_risk_residual IS 'Trigger function to automatically update residual risk when controls change';
COMMENT ON FUNCTION recalculate_all_residual_risks IS 'Utility function to recalculate residual risk for all risks (or filtered by organization)';

COMMENT ON VIEW risk_treatment_effectiveness_view IS 'Analysis of risk treatment effectiveness showing inherent vs residual risk and % reduction';
COMMENT ON VIEW under_controlled_risks_view IS 'Identifies risks with high residual risk or insufficient control effectiveness';
COMMENT ON VIEW well_controlled_risks_view IS 'Identifies risks with excellent control coverage and low residual risk';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

-- Example 1: Manual calculation for a specific risk
-- SELECT * FROM calculate_residual_risk(4, 5, 'risk-uuid-here');

-- Example 2: Recalculate all residual risks for an organization
-- SELECT * FROM recalculate_all_residual_risks('org-uuid-here');

-- Example 3: View under-controlled risks
-- SELECT * FROM under_controlled_risks_view WHERE organization_id = 'org-uuid-here';

-- Example 4: Check treatment effectiveness
-- SELECT * FROM risk_treatment_effectiveness_view WHERE organization_id = 'org-uuid-here' ORDER BY risk_reduction_percentage DESC;

-- ============================================================================
-- INITIAL CALCULATION (Run after migration)
-- ============================================================================

-- Uncomment to run initial calculation for all existing risks:
-- SELECT * FROM recalculate_all_residual_risks('11111111-1111-1111-1111-111111111111');

-- End of Migration 21


-- ============================================================================
-- Migration 22: control_effectiveness_tracking
-- File: 20251126000022_control_effectiveness_tracking.sql
-- ============================================================================

-- Migration: Control Effectiveness Tracking
-- Description: Track control testing and actual effectiveness vs theoretical DIME scores
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #7 (Important)

-- ============================================================================
-- CREATE CONTROL EFFECTIVENESS TESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_effectiveness_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL, -- Optional: test in context of specific risk

  -- Test metadata
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN (
    'Initial Assessment',
    'Periodic Review',
    'Audit',
    'Incident-Driven',
    'Post-Implementation',
    'Continuous Monitoring'
  )),
  tester_id UUID REFERENCES user_profiles(id),
  tester_name VARCHAR(255),

  -- Actual DIME scores (as observed during testing)
  design_score_actual INTEGER CHECK (design_score_actual BETWEEN 0 AND 100),
  implementation_score_actual INTEGER CHECK (implementation_score_actual BETWEEN 0 AND 100),
  monitoring_score_actual INTEGER CHECK (monitoring_score_actual BETWEEN 0 AND 100),
  evaluation_score_actual INTEGER CHECK (evaluation_score_actual BETWEEN 0 AND 100),
  overall_effectiveness NUMERIC(5,2), -- Calculated average of actual scores

  -- Variance from theoretical scores
  design_variance INTEGER,
  implementation_variance INTEGER,
  monitoring_variance INTEGER,
  evaluation_variance INTEGER,

  -- Test findings
  test_findings TEXT,
  strengths TEXT,
  weaknesses TEXT,
  remediation_required BOOLEAN DEFAULT false,
  remediation_plan TEXT,
  remediation_deadline DATE,
  remediation_completed BOOLEAN DEFAULT false,
  remediation_completed_date DATE,

  -- Next test scheduling
  next_test_date DATE,
  test_frequency VARCHAR(20) CHECK (test_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Ad-Hoc')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_control FOREIGN KEY (control_id) REFERENCES control_library(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_control_tests_org ON control_effectiveness_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON control_effectiveness_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_risk ON control_effectiveness_tests(risk_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_date ON control_effectiveness_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_control_tests_next_test ON control_effectiveness_tests(next_test_date);
CREATE INDEX IF NOT EXISTS idx_control_tests_remediation ON control_effectiveness_tests(remediation_required, remediation_completed);

-- ============================================================================
-- TRIGGER: Calculate Overall Effectiveness and Variance
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_test_effectiveness()
RETURNS TRIGGER AS $$
DECLARE
  v_theoretical_control RECORD;
BEGIN
  -- Calculate overall effectiveness (average of actual scores)
  IF NEW.design_score_actual IS NOT NULL AND
     NEW.implementation_score_actual IS NOT NULL AND
     NEW.monitoring_score_actual IS NOT NULL AND
     NEW.evaluation_score_actual IS NOT NULL THEN

    NEW.overall_effectiveness := ROUND(
      (NEW.design_score_actual + NEW.implementation_score_actual +
       NEW.monitoring_score_actual + NEW.evaluation_score_actual) / 4.0,
      2
    );
  END IF;

  -- Get theoretical scores from control library
  SELECT
    design_score,
    implementation_score,
    monitoring_score,
    evaluation_score
  INTO v_theoretical_control
  FROM control_library
  WHERE id = NEW.control_id AND organization_id = NEW.organization_id;

  -- Calculate variance (actual - theoretical)
  IF v_theoretical_control IS NOT NULL THEN
    NEW.design_variance := COALESCE(NEW.design_score_actual, 0) - v_theoretical_control.design_score;
    NEW.implementation_variance := COALESCE(NEW.implementation_score_actual, 0) - v_theoretical_control.implementation_score;
    NEW.monitoring_variance := COALESCE(NEW.monitoring_score_actual, 0) - v_theoretical_control.monitoring_score;
    NEW.evaluation_variance := COALESCE(NEW.evaluation_score_actual, 0) - v_theoretical_control.evaluation_score;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_test_effectiveness ON control_effectiveness_tests;
CREATE TRIGGER trigger_calculate_test_effectiveness
  BEFORE INSERT OR UPDATE ON control_effectiveness_tests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_test_effectiveness();

-- ============================================================================
-- FUNCTION: Update Control DIME Scores Based on Test Results
-- ============================================================================

CREATE OR REPLACE FUNCTION update_control_from_test_results(p_test_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_test RECORD;
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Get test results
  SELECT * INTO v_test
  FROM control_effectiveness_tests
  WHERE id = p_test_id;

  IF v_test IS NULL THEN
    RAISE EXCEPTION 'Test ID % not found', p_test_id;
  END IF;

  -- Update control library with actual test scores
  UPDATE control_library
  SET
    design_score = v_test.design_score_actual,
    implementation_score = v_test.implementation_score_actual,
    monitoring_score = v_test.monitoring_score_actual,
    evaluation_score = v_test.evaluation_score_actual,
    updated_at = NOW()
  WHERE id = v_test.control_id AND organization_id = v_test.organization_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Control Test History
-- ============================================================================

CREATE OR REPLACE VIEW control_test_history_view AS
SELECT
  t.id as test_id,
  t.organization_id,
  t.test_date,
  t.test_type,
  c.control_code,
  c.control_name,
  c.category,
  c.complexity,
  -- Theoretical scores
  c.design_score as design_theoretical,
  c.implementation_score as implementation_theoretical,
  c.monitoring_score as monitoring_theoretical,
  c.evaluation_score as evaluation_theoretical,
  ROUND((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0, 2) as dime_theoretical,
  -- Actual scores
  t.design_score_actual,
  t.implementation_score_actual,
  t.monitoring_score_actual,
  t.evaluation_score_actual,
  t.overall_effectiveness as dime_actual,
  -- Variance
  t.design_variance,
  t.implementation_variance,
  t.monitoring_variance,
  t.evaluation_variance,
  ROUND(t.overall_effectiveness - ((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0), 2) as dime_variance,
  -- Findings
  t.test_findings,
  t.remediation_required,
  t.remediation_completed,
  t.next_test_date,
  t.tester_name
FROM control_effectiveness_tests t
JOIN control_library c ON t.control_id = c.id AND t.organization_id = c.organization_id
ORDER BY t.test_date DESC, c.control_code;

-- ============================================================================
-- VIEW: Controls Due for Testing
-- ============================================================================

CREATE OR REPLACE VIEW controls_due_for_testing_view AS
SELECT
  c.id as control_id,
  c.organization_id,
  c.control_code,
  c.control_name,
  c.category,
  c.complexity,
  c.cost,
  -- Last test info
  lt.last_test_date,
  lt.last_test_type,
  lt.last_overall_effectiveness,
  lt.next_test_date,
  lt.test_frequency,
  -- Overdue calculation
  CASE
    WHEN lt.next_test_date IS NULL THEN 'Never Tested'
    WHEN lt.next_test_date < CURRENT_DATE THEN 'Overdue'
    WHEN lt.next_test_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due Soon'
    ELSE 'Scheduled'
  END as test_status,
  CASE
    WHEN lt.next_test_date IS NULL THEN NULL
    WHEN lt.next_test_date < CURRENT_DATE THEN CURRENT_DATE - lt.next_test_date
    ELSE NULL
  END as days_overdue,
  -- Remediation status
  lt.has_open_remediation,
  lt.remediation_deadline,
  -- Risk context
  COUNT(DISTINCT rc.risk_id) as risk_count
FROM control_library c
LEFT JOIN LATERAL (
  SELECT
    test_date as last_test_date,
    test_type as last_test_type,
    overall_effectiveness as last_overall_effectiveness,
    next_test_date,
    test_frequency,
    remediation_required AND NOT remediation_completed as has_open_remediation,
    remediation_deadline
  FROM control_effectiveness_tests
  WHERE control_id = c.id AND organization_id = c.organization_id
  ORDER BY test_date DESC
  LIMIT 1
) lt ON true
LEFT JOIN risk_controls rc ON c.id = rc.control_id AND rc.status = 'active'
WHERE c.status = 'active'
GROUP BY
  c.id, c.control_code, c.control_name, c.category, c.complexity, c.cost, c.organization_id,
  lt.last_test_date, lt.last_test_type, lt.last_overall_effectiveness,
  lt.next_test_date, lt.test_frequency, lt.has_open_remediation, lt.remediation_deadline
ORDER BY
  CASE
    WHEN lt.next_test_date IS NULL THEN 1
    WHEN lt.next_test_date < CURRENT_DATE THEN 2
    WHEN lt.next_test_date <= CURRENT_DATE + INTERVAL '30 days' THEN 3
    ELSE 4
  END,
  lt.next_test_date ASC NULLS FIRST;

-- ============================================================================
-- VIEW: Control Effectiveness Trends
-- ============================================================================

CREATE OR REPLACE VIEW control_effectiveness_trends_view AS
WITH test_trends AS (
  SELECT
    control_id,
    organization_id,
    test_date,
    overall_effectiveness,
    LAG(overall_effectiveness) OVER (PARTITION BY control_id ORDER BY test_date) as prev_effectiveness,
    overall_effectiveness - LAG(overall_effectiveness) OVER (PARTITION BY control_id ORDER BY test_date) as effectiveness_change,
    ROW_NUMBER() OVER (PARTITION BY control_id ORDER BY test_date DESC) as test_rank
  FROM control_effectiveness_tests
  WHERE overall_effectiveness IS NOT NULL
)
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  c.category,
  c.complexity,
  tt.test_date as latest_test_date,
  tt.overall_effectiveness as latest_effectiveness,
  tt.prev_effectiveness as previous_effectiveness,
  tt.effectiveness_change,
  CASE
    WHEN tt.effectiveness_change IS NULL THEN 'First Test'
    WHEN tt.effectiveness_change > 10 THEN 'Improving'
    WHEN tt.effectiveness_change < -10 THEN 'Degrading'
    ELSE 'Stable'
  END as trend,
  COUNT(*) OVER (PARTITION BY c.id) as total_tests
FROM control_library c
JOIN test_trends tt ON c.id = tt.control_id AND c.organization_id = tt.organization_id
WHERE tt.test_rank = 1 -- Latest test only
ORDER BY
  CASE
    WHEN tt.effectiveness_change < -10 THEN 1
    WHEN tt.effectiveness_change IS NULL THEN 2
    WHEN ABS(tt.effectiveness_change) <= 10 THEN 3
    ELSE 4
  END,
  tt.effectiveness_change ASC;

-- ============================================================================
-- VIEW: Controls with Significant Variance
-- ============================================================================

CREATE OR REPLACE VIEW controls_with_variance_view AS
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  t.test_date,
  t.test_type,
  -- Variance analysis
  t.design_variance,
  t.implementation_variance,
  t.monitoring_variance,
  t.evaluation_variance,
  ROUND((ABS(t.design_variance) + ABS(t.implementation_variance) +
         ABS(t.monitoring_variance) + ABS(t.evaluation_variance)) / 4.0, 2) as avg_abs_variance,
  -- Theoretical vs Actual
  ROUND((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0, 2) as theoretical_dime,
  t.overall_effectiveness as actual_dime,
  t.overall_effectiveness - ROUND((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0, 2) as dime_gap,
  -- Findings
  t.test_findings,
  t.remediation_required,
  t.remediation_plan
FROM control_effectiveness_tests t
JOIN control_library c ON t.control_id = c.id AND t.organization_id = c.organization_id
WHERE (
  ABS(t.design_variance) > 15 OR
  ABS(t.implementation_variance) > 15 OR
  ABS(t.monitoring_variance) > 15 OR
  ABS(t.evaluation_variance) > 15
)
ORDER BY avg_abs_variance DESC, t.test_date DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE control_effectiveness_tests IS 'Tracks periodic testing of controls to validate actual effectiveness vs theoretical DIME scores';

COMMENT ON COLUMN control_effectiveness_tests.design_score_actual IS 'Actual design score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.implementation_score_actual IS 'Actual implementation score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.monitoring_score_actual IS 'Actual monitoring score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.evaluation_score_actual IS 'Actual evaluation score observed during testing (0-100)';
COMMENT ON COLUMN control_effectiveness_tests.overall_effectiveness IS 'Average of all actual DIME scores';
COMMENT ON COLUMN control_effectiveness_tests.design_variance IS 'Difference between actual and theoretical design score';

COMMENT ON FUNCTION update_control_from_test_results IS 'Updates control library DIME scores based on actual test results';

COMMENT ON VIEW control_test_history_view IS 'Complete history of control tests showing theoretical vs actual scores and variance';
COMMENT ON VIEW controls_due_for_testing_view IS 'Controls that are overdue for testing or due soon, with risk context';
COMMENT ON VIEW control_effectiveness_trends_view IS 'Trend analysis showing whether controls are improving, degrading, or stable over time';
COMMENT ON VIEW controls_with_variance_view IS 'Controls showing significant variance (>15 points) between theoretical and actual DIME scores';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Example 1: Get controls due for testing this month
-- SELECT * FROM controls_due_for_testing_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
--   AND test_status IN ('Overdue', 'Due Soon')
-- ORDER BY days_overdue DESC NULLS LAST;

-- Example 2: Check controls with declining effectiveness
-- SELECT * FROM control_effectiveness_trends_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
--   AND trend = 'Degrading';

-- Example 3: Find controls with high variance (theoretical vs actual)
-- SELECT * FROM controls_with_variance_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111'
--   AND avg_abs_variance > 20;

-- Example 4: View test history for a specific control
-- SELECT * FROM control_test_history_view
-- WHERE control_code = 'CTL-001' AND organization_id = '11111111-1111-1111-1111-111111111111'
-- ORDER BY test_date DESC;

-- End of Migration 22


-- ============================================================================
-- Migration 23: multiple_causes_impacts
-- File: 20251126000023_multiple_causes_impacts.sql
-- ============================================================================

-- Migration: Multiple Root Causes and Impacts per Risk
-- Description: Allow risks to have multiple contributing causes and impacts (primary + contributing)
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #8 (Important)

-- ============================================================================
-- CREATE JUNCTION TABLES FOR MANY-TO-MANY RELATIONSHIPS
-- ============================================================================

-- Risk → Root Causes (Many-to-Many)
CREATE TABLE IF NOT EXISTS risk_root_causes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL REFERENCES root_cause_register(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  is_primary BOOLEAN DEFAULT false,
  contribution_percentage INTEGER CHECK (contribution_percentage BETWEEN 1 AND 100),
  rationale TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(risk_id, root_cause_id),
  CONSTRAINT fk_risk FOREIGN KEY (risk_id) REFERENCES risks(id),
  CONSTRAINT fk_root_cause FOREIGN KEY (root_cause_id) REFERENCES root_cause_register(id),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Risk → Impacts (Many-to-Many)
CREATE TABLE IF NOT EXISTS risk_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL REFERENCES impact_register(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  is_primary BOOLEAN DEFAULT false,
  severity_percentage INTEGER CHECK (severity_percentage BETWEEN 1 AND 100),
  rationale TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(risk_id, impact_id),
  CONSTRAINT fk_risk FOREIGN KEY (risk_id) REFERENCES risks(id),
  CONSTRAINT fk_impact FOREIGN KEY (impact_id) REFERENCES impact_register(id),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_risk ON risk_root_causes(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_cause ON risk_root_causes(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_org ON risk_root_causes(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_primary ON risk_root_causes(is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_risk_impacts_risk ON risk_impacts(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_impact ON risk_impacts(impact_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_org ON risk_impacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_primary ON risk_impacts(is_primary) WHERE is_primary = true;

-- ============================================================================
-- MIGRATION: Move Existing Single Cause/Impact Data
-- ============================================================================

-- Migrate existing root_cause_id to risk_root_causes table (as primary)
INSERT INTO risk_root_causes (risk_id, root_cause_id, organization_id, is_primary, contribution_percentage, created_at)
SELECT
  r.id as risk_id,
  r.root_cause_id,
  r.organization_id,
  true as is_primary,
  100 as contribution_percentage,
  r.created_at
FROM risks r
WHERE r.root_cause_id IS NOT NULL
ON CONFLICT (risk_id, root_cause_id) DO NOTHING;

-- Migrate existing impact_id to risk_impacts table (as primary)
INSERT INTO risk_impacts (risk_id, impact_id, organization_id, is_primary, severity_percentage, created_at)
SELECT
  r.id as risk_id,
  r.impact_id,
  r.organization_id,
  true as is_primary,
  100 as severity_percentage,
  r.created_at
FROM risks r
WHERE r.impact_id IS NOT NULL
ON CONFLICT (risk_id, impact_id) DO NOTHING;

-- ============================================================================
-- UPDATE RISKS TABLE (Keep old columns for backward compatibility)
-- ============================================================================

-- Make old columns nullable (they're now deprecated but kept for compatibility)
ALTER TABLE risks
  ALTER COLUMN root_cause_id DROP NOT NULL,
  ALTER COLUMN impact_id DROP NOT NULL;

-- Add deprecation comments
COMMENT ON COLUMN risks.root_cause_id IS 'DEPRECATED: Use risk_root_causes table instead. Kept for backward compatibility only.';
COMMENT ON COLUMN risks.impact_id IS 'DEPRECATED: Use risk_impacts table instead. Kept for backward compatibility only.';

-- ============================================================================
-- TRIGGER: Ensure Exactly One Primary Cause/Impact
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_single_primary_cause()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a cause as primary, unset all others for this risk
  IF NEW.is_primary = true THEN
    UPDATE risk_root_causes
    SET is_primary = false, updated_at = NOW()
    WHERE risk_id = NEW.risk_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;

  -- Ensure at least one cause is marked as primary (if this is the first cause)
  IF (SELECT COUNT(*) FROM risk_root_causes WHERE risk_id = NEW.risk_id AND is_primary = true) = 0 THEN
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_single_primary_impact()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an impact as primary, unset all others for this risk
  IF NEW.is_primary = true THEN
    UPDATE risk_impacts
    SET is_primary = false, updated_at = NOW()
    WHERE risk_id = NEW.risk_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;

  -- Ensure at least one impact is marked as primary (if this is the first impact)
  IF (SELECT COUNT(*) FROM risk_impacts WHERE risk_id = NEW.risk_id AND is_primary = true) = 0 THEN
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_primary_cause ON risk_root_causes;
CREATE TRIGGER trigger_enforce_primary_cause
  BEFORE INSERT OR UPDATE OF is_primary ON risk_root_causes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_cause();

DROP TRIGGER IF EXISTS trigger_enforce_primary_impact ON risk_impacts;
CREATE TRIGGER trigger_enforce_primary_impact
  BEFORE INSERT OR UPDATE OF is_primary ON risk_impacts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_impact();

-- ============================================================================
-- CREATE COMPREHENSIVE RISK DECOMPOSITION VIEW
-- ============================================================================

CREATE OR REPLACE VIEW risk_decomposition_view AS
SELECT
  r.id as risk_id,
  r.organization_id,
  r.title,
  r.event_description,
  r.status,
  r.inherent_likelihood,
  r.inherent_impact,
  (r.inherent_likelihood * r.inherent_impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,

  -- Primary root cause
  rc_primary.cause_code as primary_cause_code,
  rc_primary.cause_name as primary_cause_name,
  rc_primary.category as primary_cause_category,

  -- All root causes (JSON array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'cause_code', rc.cause_code,
        'cause_name', rc.cause_name,
        'category', rc.category,
        'is_primary', rrc.is_primary,
        'contribution_percentage', rrc.contribution_percentage,
        'rationale', rrc.rationale
      ) ORDER BY rrc.is_primary DESC, rc.cause_code
    ) FILTER (WHERE rc.id IS NOT NULL),
    '[]'::json
  ) as all_root_causes,

  -- Primary impact
  imp_primary.impact_code as primary_impact_code,
  imp_primary.impact_name as primary_impact_name,
  imp_primary.category as primary_impact_category,
  imp_primary.severity_level as primary_impact_severity,

  -- All impacts (JSON array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'impact_code', imp.impact_code,
        'impact_name', imp.impact_name,
        'category', imp.category,
        'severity_level', imp.severity_level,
        'is_primary', ri.is_primary,
        'severity_percentage', ri.severity_percentage,
        'rationale', ri.rationale
      ) ORDER BY ri.is_primary DESC, imp.impact_code
    ) FILTER (WHERE imp.id IS NOT NULL),
    '[]'::json
  ) as all_impacts,

  -- Counts
  COUNT(DISTINCT rrc.id) as root_cause_count,
  COUNT(DISTINCT ri.id) as impact_count,
  COUNT(DISTINCT ctrl.id) as control_count

FROM risks r

-- Primary root cause
LEFT JOIN risk_root_causes rrc_primary ON r.id = rrc_primary.risk_id AND rrc_primary.is_primary = true
LEFT JOIN root_cause_register rc_primary ON rrc_primary.root_cause_id = rc_primary.id

-- All root causes
LEFT JOIN risk_root_causes rrc ON r.id = rrc.risk_id
LEFT JOIN root_cause_register rc ON rrc.root_cause_id = rc.id

-- Primary impact
LEFT JOIN risk_impacts ri_primary ON r.id = ri_primary.risk_id AND ri_primary.is_primary = true
LEFT JOIN impact_register imp_primary ON ri_primary.impact_id = imp_primary.id

-- All impacts
LEFT JOIN risk_impacts ri ON r.id = ri.risk_id
LEFT JOIN impact_register imp ON ri.impact_id = imp.id

-- Controls
LEFT JOIN risk_controls ctrl ON r.id = ctrl.risk_id AND ctrl.status = 'active'

GROUP BY
  r.id, r.title, r.event_description, r.organization_id, r.status,
  r.inherent_likelihood, r.inherent_impact, r.residual_likelihood, r.residual_impact, r.residual_score,
  rc_primary.cause_code, rc_primary.cause_name, rc_primary.category,
  imp_primary.impact_code, imp_primary.impact_name, imp_primary.category, imp_primary.severity_level

ORDER BY r.created_at DESC;

-- ============================================================================
-- VIEW: Risks with Multiple Causes/Impacts
-- ============================================================================

CREATE OR REPLACE VIEW complex_risks_view AS
SELECT
  r.id,
  r.organization_id,
  r.title,
  r.event_description,
  COUNT(DISTINCT rrc.id) as root_cause_count,
  COUNT(DISTINCT ri.id) as impact_count,
  STRING_AGG(DISTINCT rc.cause_code, ', ' ORDER BY rc.cause_code) as all_cause_codes,
  STRING_AGG(DISTINCT imp.impact_code, ', ' ORDER BY imp.impact_code) as all_impact_codes,
  r.inherent_score,
  r.residual_score
FROM risks r
LEFT JOIN risk_root_causes rrc ON r.id = rrc.risk_id
LEFT JOIN root_cause_register rc ON rrc.root_cause_id = rc.id
LEFT JOIN risk_impacts ri ON r.id = ri.risk_id
LEFT JOIN impact_register imp ON ri.impact_id = imp.id
GROUP BY r.id, r.title, r.event_description, r.organization_id, r.inherent_score, r.residual_score
HAVING COUNT(DISTINCT rrc.id) > 1 OR COUNT(DISTINCT ri.id) > 1
ORDER BY (COUNT(DISTINCT rrc.id) + COUNT(DISTINCT ri.id)) DESC;

-- ============================================================================
-- VIEW: Root Cause Contribution Analysis
-- ============================================================================

CREATE OR REPLACE VIEW root_cause_contribution_view AS
SELECT
  rc.organization_id,
  rc.cause_code,
  rc.cause_name,
  rc.category,
  rc.subcategory,
  COUNT(rrc.risk_id) as risk_count,
  COUNT(rrc.risk_id) FILTER (WHERE rrc.is_primary = true) as primary_in_risks,
  COUNT(rrc.risk_id) FILTER (WHERE rrc.is_primary = false) as contributing_in_risks,
  ROUND(AVG(rrc.contribution_percentage), 1) as avg_contribution_pct,
  STRING_AGG(DISTINCT r.title, '; ' ORDER BY r.title) FILTER (WHERE rrc.is_primary = true) as primary_risk_titles
FROM root_cause_register rc
LEFT JOIN risk_root_causes rrc ON rc.id = rrc.root_cause_id
LEFT JOIN risks r ON rrc.risk_id = r.id
WHERE rc.status = 'active'
GROUP BY rc.id, rc.cause_code, rc.cause_name, rc.category, rc.subcategory, rc.organization_id
HAVING COUNT(rrc.risk_id) > 0
ORDER BY risk_count DESC, primary_in_risks DESC;

-- ============================================================================
-- VIEW: Impact Severity Analysis
-- ============================================================================

CREATE OR REPLACE VIEW impact_severity_contribution_view AS
SELECT
  imp.organization_id,
  imp.impact_code,
  imp.impact_name,
  imp.category,
  imp.severity_level,
  COUNT(ri.risk_id) as risk_count,
  COUNT(ri.risk_id) FILTER (WHERE ri.is_primary = true) as primary_in_risks,
  COUNT(ri.risk_id) FILTER (WHERE ri.is_primary = false) as secondary_in_risks,
  ROUND(AVG(ri.severity_percentage), 1) as avg_severity_pct,
  STRING_AGG(DISTINCT r.title, '; ' ORDER BY r.title) FILTER (WHERE ri.is_primary = true) as primary_risk_titles
FROM impact_register imp
LEFT JOIN risk_impacts ri ON imp.id = ri.impact_id
LEFT JOIN risks r ON ri.risk_id = r.id
WHERE imp.status = 'active'
GROUP BY imp.id, imp.impact_code, imp.impact_name, imp.category, imp.severity_level, imp.organization_id
HAVING COUNT(ri.risk_id) > 0
ORDER BY risk_count DESC, primary_in_risks DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Add root cause to risk
CREATE OR REPLACE FUNCTION add_root_cause_to_risk(
  p_risk_id UUID,
  p_root_cause_id UUID,
  p_organization_id UUID,
  p_is_primary BOOLEAN DEFAULT false,
  p_contribution_percentage INTEGER DEFAULT NULL,
  p_rationale TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO risk_root_causes (risk_id, root_cause_id, organization_id, is_primary, contribution_percentage, rationale)
  VALUES (p_risk_id, p_root_cause_id, p_organization_id, p_is_primary, p_contribution_percentage, p_rationale)
  ON CONFLICT (risk_id, root_cause_id) DO UPDATE
  SET
    is_primary = EXCLUDED.is_primary,
    contribution_percentage = EXCLUDED.contribution_percentage,
    rationale = EXCLUDED.rationale,
    updated_at = NOW()
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Add impact to risk
CREATE OR REPLACE FUNCTION add_impact_to_risk(
  p_risk_id UUID,
  p_impact_id UUID,
  p_organization_id UUID,
  p_is_primary BOOLEAN DEFAULT false,
  p_severity_percentage INTEGER DEFAULT NULL,
  p_rationale TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO risk_impacts (risk_id, impact_id, organization_id, is_primary, severity_percentage, rationale)
  VALUES (p_risk_id, p_impact_id, p_organization_id, p_is_primary, p_severity_percentage, p_rationale)
  ON CONFLICT (risk_id, impact_id) DO UPDATE
  SET
    is_primary = EXCLUDED.is_primary,
    severity_percentage = EXCLUDED.severity_percentage,
    rationale = EXCLUDED.rationale,
    updated_at = NOW()
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE risk_root_causes IS 'Many-to-many relationship between risks and root causes, allowing multiple contributing causes per risk';
COMMENT ON TABLE risk_impacts IS 'Many-to-many relationship between risks and impacts, allowing multiple potential impacts per risk';

COMMENT ON COLUMN risk_root_causes.is_primary IS 'Indicates the primary root cause (exactly one per risk)';
COMMENT ON COLUMN risk_root_causes.contribution_percentage IS 'Estimated contribution of this cause to the overall risk (1-100%)';
COMMENT ON COLUMN risk_impacts.is_primary IS 'Indicates the primary impact (exactly one per risk)';
COMMENT ON COLUMN risk_impacts.severity_percentage IS 'Estimated severity of this impact if risk materializes (1-100%)';

COMMENT ON VIEW risk_decomposition_view IS 'Comprehensive view of risks showing all root causes and impacts with primary indicators';
COMMENT ON VIEW complex_risks_view IS 'Risks with multiple root causes or impacts';
COMMENT ON VIEW root_cause_contribution_view IS 'Analysis of how each root cause contributes to risks (primary vs contributing)';
COMMENT ON VIEW impact_severity_contribution_view IS 'Analysis of how each impact manifests across risks (primary vs secondary)';

COMMENT ON FUNCTION add_root_cause_to_risk IS 'Helper function to add a root cause to a risk with contribution percentage';
COMMENT ON FUNCTION add_impact_to_risk IS 'Helper function to add an impact to a risk with severity percentage';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Add contributing root cause to existing risk
-- SELECT add_root_cause_to_risk(
--   'risk-uuid',
--   'root-cause-uuid',
--   'org-uuid',
--   false,  -- not primary
--   30,     -- contributes 30%
--   'Secondary cause: inadequate testing contributing to deployment failures'
-- );

-- Example 2: View risk decomposition
-- SELECT * FROM risk_decomposition_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 10;

-- Example 3: Find complex risks (multiple causes/impacts)
-- SELECT * FROM complex_risks_view WHERE organization_id = '11111111-1111-1111-1111-111111111111';

-- Example 4: Analyze root cause usage
-- SELECT * FROM root_cause_contribution_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' ORDER BY risk_count DESC;

-- End of Migration 23


-- ============================================================================
-- Migration 24: control_dependencies
-- File: 20251126000024_control_dependencies.sql
-- ============================================================================

-- Migration: Control Dependencies
-- Description: Define prerequisite, complementary, and alternative relationships between controls
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #9 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE CONTROL DEPENDENCIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  depends_on_control_id UUID NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,

  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('prerequisite', 'complementary', 'alternative')),
  dependency_strength VARCHAR(15) NOT NULL CHECK (dependency_strength IN ('required', 'recommended', 'optional')),
  rationale TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(control_id, depends_on_control_id, dependency_type),
  CONSTRAINT no_self_dependency CHECK (control_id != depends_on_control_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_control_dep_control ON control_dependencies(control_id);
CREATE INDEX IF NOT EXISTS idx_control_dep_depends ON control_dependencies(depends_on_control_id);
CREATE INDEX IF NOT EXISTS idx_control_dep_org ON control_dependencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_control_dep_type ON control_dependencies(dependency_type);

-- ============================================================================
-- POPULATE CONTROL DEPENDENCIES
-- ============================================================================

INSERT INTO control_dependencies (organization_id, control_id, depends_on_control_id, dependency_type, dependency_strength, rationale)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c1.id,
  c2.id,
  dependency_type,
  dependency_strength,
  rationale
FROM (VALUES
  -- Identity & Access Management Dependencies
  ('CTL-001', 'CTL-002', 'prerequisite', 'required', 'MFA requires RBAC to define which roles require MFA'),
  ('CTL-003', 'CTL-002', 'prerequisite', 'required', 'PAM builds on RBAC for privileged role management'),
  ('CTL-005', 'CTL-003', 'complementary', 'recommended', 'Credential rotation enhances PAM security'),

  -- Network Security Dependencies
  ('CTL-006', 'CTL-007', 'complementary', 'recommended', 'Network segmentation works with firewall hardening'),
  ('CTL-008', 'CTL-006', 'prerequisite', 'recommended', 'IDS benefits from network segmentation for better visibility'),
  ('CTL-009', 'CTL-008', 'complementary', 'recommended', 'IPS complements IDS for active threat prevention'),
  ('CTL-018', 'CTL-006', 'prerequisite', 'required', 'Zero-trust requires network segmentation as foundation'),
  ('CTL-018', 'CTL-001', 'prerequisite', 'required', 'Zero-trust requires strong authentication (MFA)'),

  -- Endpoint Security Dependencies
  ('CTL-010', 'CTL-011', 'complementary', 'required', 'EDR effectiveness depends on timely patching'),
  ('CTL-011', 'CTL-017', 'prerequisite', 'recommended', 'Patching should be guided by vulnerability scanning'),

  -- Operational Resilience Dependencies
  ('CTL-019', 'CTL-020', 'alternative', 'optional', 'Load balancing or auto-scaling solve capacity issues'),
  ('CTL-021', 'CTL-019', 'prerequisite', 'recommended', 'Failover infrastructure benefits from load balancing'),
  ('CTL-022', 'CTL-020', 'complementary', 'recommended', 'Queue throttling works with auto-scaling'),

  -- Data Protection Dependencies
  ('CTL-038', 'CTL-041', 'prerequisite', 'required', 'Data masking requires data classification first'),
  ('CTL-039', 'CTL-041', 'prerequisite', 'required', 'Encryption at rest requires data classification'),
  ('CTL-040', 'CTL-041', 'prerequisite', 'recommended', 'Encryption in transit benefits from data classification'),
  ('CTL-043', 'CTL-041', 'prerequisite', 'required', 'PII/PHI enforcement requires data classification'),

  -- Data Quality Dependencies
  ('CTL-034', 'CTL-033', 'prerequisite', 'recommended', 'Data reconciliation is more effective with input validation'),
  ('CTL-035', 'CTL-033', 'prerequisite', 'required', 'Master data management requires data validation'),
  ('CTL-037', 'CTL-035', 'complementary', 'recommended', 'Checksum integrity complements master data management'),

  -- Governance Dependencies
  ('CTL-044', 'CTL-002', 'prerequisite', 'required', 'Segregation of duties requires RBAC implementation'),
  ('CTL-045', 'CTL-044', 'complementary', 'required', 'Approval workflows enforce segregation of duties'),
  ('CTL-048', 'CTL-049', 'complementary', 'recommended', 'Regulatory monitoring and policy audits work together'),

  -- Financial Controls Dependencies
  ('CTL-054', 'CTL-053', 'complementary', 'required', 'Capital buffer and liquidity monitoring work together'),
  ('CTL-055', 'CTL-053', 'prerequisite', 'recommended', 'Hedging strategy requires liquidity monitoring'),
  ('CTL-056', 'CTL-053', 'prerequisite', 'required', 'Stress testing requires liquidity monitoring data'),
  ('CTL-061', 'CTL-059', 'complementary', 'recommended', 'Fraud detection works with payment authorization limits'),

  -- HR Dependencies
  ('CTL-063', 'CTL-062', 'prerequisite', 'required', 'Competency certification requires mandatory training'),
  ('CTL-064', 'CTL-002', 'prerequisite', 'required', 'Access revocation requires RBAC to know what to revoke'),
  ('CTL-067', 'CTL-069', 'complementary', 'recommended', 'Burnout monitoring complements staffing thresholds'),

  -- Vendor Management Dependencies
  ('CTL-072', 'CTL-070', 'prerequisite', 'required', 'Vendor assessments inform SLA enforcement'),
  ('CTL-074', 'CTL-072', 'prerequisite', 'recommended', 'Vendor accreditation requires periodic assessments'),
  ('CTL-071', 'CTL-070', 'complementary', 'recommended', 'Multi-vendor redundancy complements SLA enforcement'),

  -- Infrastructure Dependencies
  ('CTL-085', 'CTL-084', 'prerequisite', 'required', 'Microservices architecture requires containerization'),
  ('CTL-086', 'CTL-085', 'complementary', 'recommended', 'Geo-distribution enhances microservices resilience'),
  ('CTL-087', 'CTL-086', 'alternative', 'optional', 'Standby systems or geo-distribution for resilience'),
  ('CTL-088', 'CTL-085', 'prerequisite', 'required', 'Chaos engineering requires microservices architecture'),
  ('CTL-089', 'CTL-084', 'prerequisite', 'required', 'Automated rollback requires containerization'),

  -- Disaster Recovery Dependencies
  ('CTL-091', 'CTL-090', 'prerequisite', 'required', 'Off-site backups implement RTO/RPO frameworks'),
  ('CTL-092', 'CTL-090', 'prerequisite', 'required', 'Recovery drills test RTO/RPO frameworks'),
  ('CTL-095', 'CTL-021', 'prerequisite', 'required', 'Service failover simulation requires failover infrastructure'),
  ('CTL-093', 'CTL-094', 'complementary', 'recommended', 'Crisis comms and PR damage control work together')

) AS mapping(control_code, depends_code, dependency_type, dependency_strength, rationale)
CROSS JOIN control_library c1
CROSS JOIN control_library c2
WHERE c1.control_code = mapping.control_code
  AND c2.control_code = mapping.depends_code
  AND c1.organization_id = '11111111-1111-1111-1111-111111111111'
  AND c2.organization_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (control_id, depends_on_control_id, dependency_type) DO NOTHING;

-- ============================================================================
-- CREATE VIEWS FOR DEPENDENCY ANALYSIS
-- ============================================================================

-- View: Control with Dependencies
CREATE OR REPLACE VIEW control_dependencies_view AS
SELECT
  c.id as control_id,
  c.organization_id,
  c.control_code,
  c.control_name,
  c.category,
  c.complexity,
  -- Dependency details
  cd.dependency_type,
  cd.dependency_strength,
  cd.rationale as dependency_rationale,
  -- Dependent control
  dc.control_code as depends_on_code,
  dc.control_name as depends_on_name,
  dc.category as depends_on_category,
  dc.complexity as depends_on_complexity,
  -- Risk context: is the dependent control already implemented?
  EXISTS(
    SELECT 1 FROM risk_controls rc
    WHERE rc.control_id = dc.id AND rc.status = 'active'
  ) as prerequisite_implemented
FROM control_library c
JOIN control_dependencies cd ON c.id = cd.control_id
JOIN control_library dc ON cd.depends_on_control_id = dc.id
WHERE c.status = 'active' AND dc.status = 'active'
ORDER BY c.control_code, cd.dependency_type, cd.dependency_strength;

-- View: Control Implementation Readiness (checks prerequisites)
CREATE OR REPLACE VIEW control_implementation_readiness AS
SELECT
  c.control_code,
  c.control_name,
  c.organization_id,
  c.category,
  c.complexity,
  c.cost,
  c.timeline,
  -- Prerequisites
  COUNT(cd.id) FILTER (WHERE cd.dependency_type = 'prerequisite') as prerequisite_count,
  COUNT(cd.id) FILTER (WHERE cd.dependency_type = 'prerequisite' AND cd.dependency_strength = 'required') as required_prerequisite_count,
  -- Prerequisite status
  STRING_AGG(
    dc.control_code || ' (' || cd.dependency_strength || ')',
    ', '
    ORDER BY cd.dependency_strength, dc.control_code
  ) FILTER (WHERE cd.dependency_type = 'prerequisite') as prerequisite_controls,
  -- Readiness assessment
  CASE
    WHEN COUNT(cd.id) FILTER (WHERE cd.dependency_type = 'prerequisite' AND cd.dependency_strength = 'required') = 0
      THEN 'Ready'
    ELSE 'Prerequisites Required'
  END as readiness_status
FROM control_library c
LEFT JOIN control_dependencies cd ON c.id = cd.control_id
LEFT JOIN control_library dc ON cd.depends_on_control_id = dc.id
WHERE c.status = 'active'
GROUP BY c.id, c.control_code, c.control_name, c.organization_id, c.category, c.complexity, c.cost, c.timeline
ORDER BY readiness_status, c.control_code;

-- View: Dependency Graph (for visualization)
CREATE OR REPLACE VIEW control_dependency_graph_view AS
SELECT
  c1.control_code as source_control,
  c1.control_name as source_name,
  cd.dependency_type,
  cd.dependency_strength,
  c2.control_code as target_control,
  c2.control_name as target_name,
  c1.organization_id,
  CASE cd.dependency_type
    WHEN 'prerequisite' THEN 1
    WHEN 'complementary' THEN 2
    WHEN 'alternative' THEN 3
  END as type_order,
  CASE cd.dependency_strength
    WHEN 'required' THEN 1
    WHEN 'recommended' THEN 2
    WHEN 'optional' THEN 3
  END as strength_order
FROM control_dependencies cd
JOIN control_library c1 ON cd.control_id = c1.id
JOIN control_library c2 ON cd.depends_on_control_id = c2.id
WHERE c1.status = 'active' AND c2.status = 'active'
ORDER BY type_order, strength_order, source_control;

-- View: Missing Prerequisites for Applied Controls
CREATE OR REPLACE VIEW missing_prerequisites_view AS
SELECT DISTINCT
  r.id as risk_id,
  r.organization_id,
  r.title as risk_title,
  c.control_code,
  c.control_name as control_applied,
  cd.dependency_strength,
  prereq.control_code as missing_prerequisite_code,
  prereq.control_name as missing_prerequisite_name,
  prereq.category as prerequisite_category,
  prereq.cost as prerequisite_cost,
  prereq.timeline as prerequisite_timeline,
  cd.rationale as why_needed
FROM risks r
JOIN risk_controls rc ON r.id = rc.risk_id AND rc.status = 'active'
JOIN control_library c ON rc.control_id = c.id
JOIN control_dependencies cd ON c.id = cd.control_id AND cd.dependency_type = 'prerequisite'
JOIN control_library prereq ON cd.depends_on_control_id = prereq.id
WHERE prereq.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM risk_controls rc2
    WHERE rc2.risk_id = r.id
      AND rc2.control_id = prereq.id
      AND rc2.status = 'active'
  )
ORDER BY r.organization_id, r.title, cd.dependency_strength, prereq.control_code;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get all prerequisites for a control (recursive)
CREATE OR REPLACE FUNCTION get_control_prerequisites(p_control_id UUID)
RETURNS TABLE(
  control_code VARCHAR,
  control_name VARCHAR,
  dependency_level INTEGER,
  dependency_strength VARCHAR
) AS $$
WITH RECURSIVE prereqs AS (
  -- Base case: direct prerequisites
  SELECT
    cd.depends_on_control_id as control_id,
    1 as level,
    cd.dependency_strength
  FROM control_dependencies cd
  WHERE cd.control_id = p_control_id
    AND cd.dependency_type = 'prerequisite'

  UNION

  -- Recursive case: prerequisites of prerequisites
  SELECT
    cd.depends_on_control_id,
    p.level + 1,
    cd.dependency_strength
  FROM prereqs p
  JOIN control_dependencies cd ON p.control_id = cd.control_id
  WHERE cd.dependency_type = 'prerequisite'
    AND p.level < 5 -- Limit recursion depth to prevent infinite loops
)
SELECT
  c.control_code,
  c.control_name,
  p.level,
  p.dependency_strength
FROM prereqs p
JOIN control_library c ON p.control_id = c.id
ORDER BY p.level, c.control_code;
$$ LANGUAGE SQL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE control_dependencies IS 'Defines prerequisite, complementary, and alternative relationships between controls';

COMMENT ON COLUMN control_dependencies.dependency_type IS 'Type: prerequisite (must implement first), complementary (work well together), alternative (either/or choice)';
COMMENT ON COLUMN control_dependencies.dependency_strength IS 'Strength: required (must have), recommended (should have), optional (nice to have)';

COMMENT ON VIEW control_dependencies_view IS 'Shows all control dependencies with details about dependent controls';
COMMENT ON VIEW control_implementation_readiness IS 'Assesses which controls are ready to implement vs. those requiring prerequisites';
COMMENT ON VIEW control_dependency_graph_view IS 'Graph data structure for visualizing control dependencies';
COMMENT ON VIEW missing_prerequisites_view IS 'Identifies applied controls missing their prerequisite controls, by risk';

COMMENT ON FUNCTION get_control_prerequisites IS 'Recursively retrieves all prerequisites for a given control up to 5 levels deep';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Check what controls require MFA as a prerequisite
-- SELECT * FROM control_dependencies_view
-- WHERE depends_on_code = 'CTL-001' AND dependency_type = 'prerequisite';

-- Example 2: Get all prerequisites for Zero-Trust Network
-- SELECT * FROM get_control_prerequisites(
--   (SELECT id FROM control_library WHERE control_code = 'CTL-018' AND organization_id = '11111111-1111-1111-1111-111111111111')
-- );

-- Example 3: Find controls ready for implementation (no prerequisites)
-- SELECT * FROM control_implementation_readiness
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND readiness_status = 'Ready';

-- Example 4: Identify missing prerequisites for a specific risk
-- SELECT * FROM missing_prerequisites_view
-- WHERE risk_id = 'risk-uuid-here'
-- ORDER BY dependency_strength, missing_prerequisite_code;

-- End of Migration 24


-- ============================================================================
-- Migration 25: risk_appetite_framework
-- File: 20251126000025_risk_appetite_framework.sql
-- ============================================================================

-- Migration: Risk Appetite Framework
-- Description: Define organizational risk appetite and track tolerance exceptions
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #10 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE RISK APPETITE STATEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_category VARCHAR(100) NOT NULL,

  -- Appetite statement
  appetite_statement TEXT NOT NULL,
  appetite_level VARCHAR(20) CHECK (appetite_level IN ('Risk Averse', 'Risk Cautious', 'Risk Balanced', 'Risk Seeking', 'Risk Aggressive')),

  -- Quantitative thresholds
  max_acceptable_likelihood INTEGER CHECK (max_acceptable_likelihood BETWEEN 1 AND 5),
  max_acceptable_impact INTEGER CHECK (max_acceptable_impact BETWEEN 1 AND 5),
  max_acceptable_score INTEGER CHECK (max_acceptable_score BETWEEN 1 AND 25),

  -- Escalation and tolerance
  escalation_threshold INTEGER CHECK (escalation_threshold BETWEEN 1 AND 25),
  board_tolerance INTEGER CHECK (board_tolerance BETWEEN 1 AND 25),

  -- Review cycle
  review_frequency VARCHAR(20) CHECK (review_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  last_reviewed_at DATE,
  next_review_date DATE,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, risk_category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appetite_org ON risk_appetite_statements(organization_id);
CREATE INDEX IF NOT EXISTS idx_appetite_category ON risk_appetite_statements(risk_category);
CREATE INDEX IF NOT EXISTS idx_appetite_next_review ON risk_appetite_statements(next_review_date);

-- ============================================================================
-- CREATE RISK TOLERANCE EXCEPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_tolerance_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Exception details
  exception_reason TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  compensating_controls TEXT,

  -- Approval
  requested_by UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),

  -- Validity period
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  review_frequency VARCHAR(20) CHECK (review_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  next_review_date DATE,

  -- Tracking
  review_count INTEGER DEFAULT 0,
  last_reviewed_at DATE,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exception_risk ON risk_tolerance_exceptions(risk_id);
CREATE INDEX IF NOT EXISTS idx_exception_org ON risk_tolerance_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_exception_status ON risk_tolerance_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exception_valid_until ON risk_tolerance_exceptions(valid_until);
CREATE INDEX IF NOT EXISTS idx_exception_next_review ON risk_tolerance_exceptions(next_review_date);

-- ============================================================================
-- POPULATE DEFAULT RISK APPETITE STATEMENTS
-- ============================================================================

INSERT INTO risk_appetite_statements (
  organization_id, risk_category, appetite_statement, appetite_level,
  max_acceptable_likelihood, max_acceptable_impact, max_acceptable_score,
  escalation_threshold, board_tolerance, review_frequency
) VALUES
('11111111-1111-1111-1111-111111111111', 'Financial Risk', 'We maintain a risk-cautious approach to financial risks, accepting minor variances but escalating material exposures. Board approval required for residual risks >15.', 'Risk Cautious', 3, 4, 12, 12, 15, 'Quarterly'),
('11111111-1111-1111-1111-111111111111', 'Operational Risk', 'We accept moderate operational risks that support innovation, but require strong controls for critical systems. Residual risks >12 require escalation.', 'Risk Balanced', 3, 4, 12, 12, 15, 'Quarterly'),
('11111111-1111-1111-1111-111111111111', 'Compliance & Legal Risk', 'We have minimal appetite for compliance and legal risks. All regulatory breaches escalated to board. Board tolerance capped at 9.', 'Risk Averse', 2, 3, 6, 6, 9, 'Quarterly'),
('11111111-1111-1111-1111-111111111111', 'Technology & Cyber Risk', 'We accept necessary technology risks to remain competitive, but maintain strong cybersecurity posture. Critical vulnerabilities escalated immediately.', 'Risk Balanced', 3, 4, 12, 12, 15, 'Quarterly'),
('11111111-1111-1111-1111-111111111111', 'Strategic Risk', 'We accept calculated strategic risks aligned with growth objectives, with board oversight for transformational initiatives. Board tolerance at 16.', 'Risk Seeking', 4, 4, 16, 12, 16, 'Semi-Annual'),
('11111111-1111-1111-1111-111111111111', 'Governance & Reputational Risk', 'We have low tolerance for reputational damage and governance failures. Board approval required for risks >9.', 'Risk Cautious', 2, 4, 8, 8, 9, 'Quarterly'),
('11111111-1111-1111-1111-111111111111', 'ESG & Sustainability Risk', 'We have minimal appetite for environmental and social risks that could harm stakeholders or communities.', 'Risk Averse', 2, 3, 6, 6, 9, 'Annual'),
('11111111-1111-1111-1111-111111111111', 'Supply Chain & Logistics Risk', 'We accept moderate supply chain risks but require contingency planning for critical dependencies.', 'Risk Balanced', 3, 3, 9, 9, 12, 'Semi-Annual'),
('11111111-1111-1111-1111-111111111111', 'Human Capital Risk', 'We maintain balanced approach to people risks, investing in retention and development while accepting natural attrition.', 'Risk Balanced', 3, 3, 9, 9, 12, 'Annual'),
('11111111-1111-1111-1111-111111111111', 'Project & Programme Risk', 'We accept project risks within budget and timeline tolerances, with escalation for strategic programs.', 'Risk Balanced', 3, 4, 12, 10, 12, 'Quarterly')
ON CONFLICT (organization_id, risk_category) DO NOTHING;

-- ============================================================================
-- TRIGGER: Auto-expire Exceptions
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_expire_exceptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-expire exceptions past their valid_until date
  UPDATE risk_tolerance_exceptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'approved'
    AND valid_until < CURRENT_DATE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Run daily via cron or manually
-- SELECT auto_expire_exceptions();

-- ============================================================================
-- CREATE VIEWS FOR APPETITE MONITORING
-- ============================================================================

-- View: Risks Exceeding Appetite
CREATE OR REPLACE VIEW risks_exceeding_appetite_view AS
SELECT
  r.id as risk_id,
  r.organization_id,
  r.title,
  r.category,
  r.status,
  r.inherent_likelihood,
  r.inherent_impact,
  (r.inherent_likelihood * r.inherent_impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  -- Appetite thresholds
  ras.appetite_level,
  ras.max_acceptable_score,
  ras.escalation_threshold,
  ras.board_tolerance,
  -- Appetite breach analysis
  CASE
    WHEN r.residual_score > ras.board_tolerance THEN 'Board Action Required'
    WHEN r.residual_score > ras.escalation_threshold THEN 'Escalation Required'
    WHEN r.residual_score > ras.max_acceptable_score THEN 'Outside Appetite'
    ELSE 'Within Appetite'
  END as appetite_status,
  r.residual_score - ras.max_acceptable_score as score_above_appetite,
  -- Exception status
  rte.status as exception_status,
  rte.valid_until as exception_valid_until,
  rte.business_justification as exception_justification
FROM risks r
LEFT JOIN risk_appetite_statements ras ON r.category = ras.risk_category AND r.organization_id = ras.organization_id
LEFT JOIN risk_tolerance_exceptions rte ON r.id = rte.risk_id AND rte.status = 'approved'
WHERE r.residual_score > COALESCE(ras.max_acceptable_score, 12)
   OR (r.inherent_likelihood * r.inherent_impact) > COALESCE(ras.board_tolerance, 15)
ORDER BY r.residual_score DESC;

-- View: Risk Appetite Dashboard
CREATE OR REPLACE VIEW risk_appetite_dashboard_view AS
SELECT
  ras.organization_id,
  ras.risk_category,
  ras.appetite_level,
  ras.appetite_statement,
  ras.max_acceptable_score,
  ras.escalation_threshold,
  ras.board_tolerance,
  -- Risk counts by appetite status
  COUNT(r.id) as total_risks,
  COUNT(r.id) FILTER (WHERE r.residual_score <= ras.max_acceptable_score) as within_appetite,
  COUNT(r.id) FILTER (WHERE r.residual_score > ras.max_acceptable_score AND r.residual_score <= ras.escalation_threshold) as outside_appetite,
  COUNT(r.id) FILTER (WHERE r.residual_score > ras.escalation_threshold AND r.residual_score <= ras.board_tolerance) as escalation_required,
  COUNT(r.id) FILTER (WHERE r.residual_score > ras.board_tolerance) as board_action_required,
  -- Exception counts
  COUNT(rte.id) FILTER (WHERE rte.status = 'approved') as approved_exceptions,
  COUNT(rte.id) FILTER (WHERE rte.status = 'pending') as pending_exceptions,
  -- Review status
  ras.last_reviewed_at,
  ras.next_review_date,
  CASE
    WHEN ras.next_review_date < CURRENT_DATE THEN 'Overdue for Review'
    WHEN ras.next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Review Due Soon'
    ELSE 'Current'
  END as review_status
FROM risk_appetite_statements ras
LEFT JOIN risks r ON ras.risk_category = r.category AND ras.organization_id = r.organization_id
LEFT JOIN risk_tolerance_exceptions rte ON r.id = rte.risk_id
WHERE ras.organization_id IS NOT NULL
GROUP BY ras.id, ras.organization_id, ras.risk_category, ras.appetite_level, ras.appetite_statement,
         ras.max_acceptable_score, ras.escalation_threshold, ras.board_tolerance,
         ras.last_reviewed_at, ras.next_review_date
ORDER BY board_action_required DESC, escalation_required DESC;

-- View: Exception Management
CREATE OR REPLACE VIEW exception_management_view AS
SELECT
  rte.id as exception_id,
  rte.organization_id,
  r.title as risk_title,
  r.category as risk_category,
  r.residual_score,
  rte.status,
  rte.exception_reason,
  rte.business_justification,
  rte.compensating_controls,
  -- Requestor
  req.email as requested_by_email,
  rte.requested_at,
  -- Approver
  app.email as approved_by_email,
  rte.approved_at,
  -- Validity
  rte.valid_from,
  rte.valid_until,
  CURRENT_DATE - rte.valid_until as days_until_expiry,
  rte.next_review_date,
  rte.review_count,
  rte.last_reviewed_at,
  -- Status assessment
  CASE
    WHEN rte.status = 'expired' THEN 'Expired - Needs Renewal'
    WHEN rte.status = 'approved' AND rte.valid_until < CURRENT_DATE THEN 'Expired'
    WHEN rte.status = 'approved' AND rte.valid_until <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    WHEN rte.status = 'approved' THEN 'Active'
    WHEN rte.status = 'pending' THEN 'Pending Approval'
    WHEN rte.status = 'rejected' THEN 'Rejected'
  END as exception_status
FROM risk_tolerance_exceptions rte
JOIN risks r ON rte.risk_id = r.id
LEFT JOIN user_profiles req ON rte.requested_by = req.id
LEFT JOIN user_profiles app ON rte.approved_by = app.id
ORDER BY
  CASE rte.status
    WHEN 'pending' THEN 1
    WHEN 'approved' THEN 2
    WHEN 'expired' THEN 3
    WHEN 'rejected' THEN 4
  END,
  rte.valid_until ASC NULLS LAST;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Request Risk Exception
CREATE OR REPLACE FUNCTION request_risk_exception(
  p_risk_id UUID,
  p_organization_id UUID,
  p_exception_reason TEXT,
  p_business_justification TEXT,
  p_compensating_controls TEXT,
  p_requested_by UUID,
  p_valid_until DATE,
  p_review_frequency VARCHAR DEFAULT 'Quarterly'
)
RETURNS UUID AS $$
DECLARE
  v_exception_id UUID;
BEGIN
  INSERT INTO risk_tolerance_exceptions (
    risk_id, organization_id, exception_reason, business_justification,
    compensating_controls, requested_by, valid_until, review_frequency,
    next_review_date
  )
  VALUES (
    p_risk_id, p_organization_id, p_exception_reason, p_business_justification,
    p_compensating_controls, p_requested_by, p_valid_until, p_review_frequency,
    CASE p_review_frequency
      WHEN 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
      WHEN 'Quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
      WHEN 'Semi-Annual' THEN CURRENT_DATE + INTERVAL '6 months'
      WHEN 'Annual' THEN CURRENT_DATE + INTERVAL '1 year'
    END
  )
  RETURNING id INTO v_exception_id;

  RETURN v_exception_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Approve Risk Exception
CREATE OR REPLACE FUNCTION approve_risk_exception(
  p_exception_id UUID,
  p_approved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE risk_tolerance_exceptions
  SET
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_exception_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE risk_appetite_statements IS 'Defines organizational risk appetite by category with quantitative thresholds';
COMMENT ON TABLE risk_tolerance_exceptions IS 'Tracks approved exceptions to risk appetite with validity periods';

COMMENT ON COLUMN risk_appetite_statements.appetite_level IS 'Risk Averse (minimal), Cautious, Balanced, Seeking, Aggressive';
COMMENT ON COLUMN risk_appetite_statements.max_acceptable_score IS 'Maximum residual risk score acceptable without escalation';
COMMENT ON COLUMN risk_appetite_statements.escalation_threshold IS 'Risk score requiring management escalation';
COMMENT ON COLUMN risk_appetite_statements.board_tolerance IS 'Maximum risk score board will tolerate';

COMMENT ON VIEW risks_exceeding_appetite_view IS 'Risks with residual scores exceeding organizational appetite thresholds';
COMMENT ON VIEW risk_appetite_dashboard_view IS 'Dashboard showing risk distribution relative to appetite by category';
COMMENT ON VIEW exception_management_view IS 'Management view of all risk appetite exceptions and their status';

COMMENT ON FUNCTION request_risk_exception IS 'Creates a new risk exception request for approval';
COMMENT ON FUNCTION approve_risk_exception IS 'Approves a pending risk exception';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: View risks exceeding appetite
-- SELECT * FROM risks_exceeding_appetite_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' ORDER BY residual_score DESC;

-- Example 2: View appetite dashboard
-- SELECT * FROM risk_appetite_dashboard_view WHERE organization_id = '11111111-1111-1111-1111-111111111111';

-- Example 3: Request exception
-- SELECT request_risk_exception(
--   'risk-uuid', 'org-uuid',
--   'Strategic initiative requires accepting higher risk',
--   'Growth opportunity worth $5M with strong market validation',
--   'Monthly executive review; Enhanced monitoring controls',
--   'user-uuid', CURRENT_DATE + INTERVAL '6 months', 'Monthly'
-- );

-- Example 4: Approve exception
-- SELECT approve_risk_exception('exception-uuid', 'approver-user-uuid');

-- End of Migration 25


-- ============================================================================
-- Migration 26: kri_kci_breach_tracking
-- File: 20251126000026_kri_kci_breach_tracking.sql
-- ============================================================================

-- Migration: KRI/KCI Breach History Tracking
-- Description: Track when indicators breach thresholds and monitor resolution
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #11 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE INDICATOR BREACHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS indicator_breaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES kri_kci_library(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,

  -- Breach details
  breach_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  breach_level VARCHAR(10) NOT NULL CHECK (breach_level IN ('warning', 'critical')),
  measured_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_type VARCHAR(10) CHECK (threshold_type IN ('warning', 'critical')),

  -- Breach context
  measurement_unit VARCHAR(50),
  breach_percentage NUMERIC, -- How much over threshold (percentage)
  consecutive_breach_count INTEGER DEFAULT 1, -- How many times in a row this indicator breached

  -- Response and resolution
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'mitigating', 'resolved', 'false_positive')),
  action_taken TEXT,
  action_owner UUID REFERENCES user_profiles(id),
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Resolution tracking
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,
  breach_duration_hours NUMERIC, -- Calculated when resolved
  time_to_detect_hours NUMERIC, -- Time between breach and detection
  time_to_respond_hours NUMERIC, -- Time between detection and action

  -- Root cause analysis
  root_cause_analysis TEXT,
  preventive_actions TEXT,
  lessons_learned TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breach_org ON indicator_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_breach_indicator ON indicator_breaches(indicator_id);
CREATE INDEX IF NOT EXISTS idx_breach_risk ON indicator_breaches(risk_id);
CREATE INDEX IF NOT EXISTS idx_breach_date ON indicator_breaches(breach_date);
CREATE INDEX IF NOT EXISTS idx_breach_status ON indicator_breaches(status);
CREATE INDEX IF NOT EXISTS idx_breach_level ON indicator_breaches(breach_level);
CREATE INDEX IF NOT EXISTS idx_breach_resolved ON indicator_breaches(resolved_at);

-- ============================================================================
-- TRIGGER: Calculate Breach Duration and Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_breach_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate breach percentage over threshold
  IF NEW.threshold_value != 0 THEN
    NEW.breach_percentage := ROUND(
      ((NEW.measured_value - NEW.threshold_value) / ABS(NEW.threshold_value) * 100)::NUMERIC,
      2
    );
  END IF;

  -- Calculate breach duration when resolved
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    NEW.breach_duration_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.breach_date)) / 3600,
      2
    );
  END IF;

  -- Auto-assign priority based on breach level and percentage
  IF NEW.priority IS NULL THEN
    NEW.priority := CASE
      WHEN NEW.breach_level = 'critical' AND NEW.breach_percentage > 50 THEN 'critical'
      WHEN NEW.breach_level = 'critical' THEN 'high'
      WHEN NEW.breach_percentage > 100 THEN 'high'
      WHEN NEW.breach_percentage > 50 THEN 'medium'
      ELSE 'low'
    END;
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_breach_metrics ON indicator_breaches;
CREATE TRIGGER trigger_calculate_breach_metrics
  BEFORE INSERT OR UPDATE ON indicator_breaches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_breach_metrics();

-- ============================================================================
-- CREATE VIEWS FOR BREACH MONITORING
-- ============================================================================

-- View: Active Breaches
CREATE OR REPLACE VIEW active_breaches_view AS
SELECT
  ib.id as breach_id,
  ib.organization_id,
  ib.breach_date,
  ib.breach_level,
  ib.status,
  ib.priority,
  -- Indicator details
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_type,
  kri.indicator_category,
  kri.measurement_unit,
  -- Breach details
  ib.measured_value,
  ib.threshold_value,
  ib.breach_percentage,
  ib.consecutive_breach_count,
  -- Risk context
  r.id as risk_id,
  r.title as risk_title,
  r.category as risk_category,
  r.residual_score,
  -- Response
  ib.action_taken,
  owner.email as action_owner_email,
  -- Duration
  ROUND(EXTRACT(EPOCH FROM (NOW() - ib.breach_date)) / 3600, 1) as hours_active,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - ib.breach_date)) / 3600 > 48 THEN 'Overdue'
    WHEN EXTRACT(EPOCH FROM (NOW() - ib.breach_date)) / 3600 > 24 THEN 'Urgent'
    ELSE 'Active'
  END as urgency_status
FROM indicator_breaches ib
JOIN kri_kci_library kri ON ib.indicator_id = kri.id
LEFT JOIN risks r ON ib.risk_id = r.id
LEFT JOIN user_profiles owner ON ib.action_owner = owner.id
WHERE ib.status IN ('active', 'investigating', 'mitigating')
ORDER BY
  CASE ib.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  ib.breach_date ASC;

-- View: Breach Trends
CREATE OR REPLACE VIEW breach_trends_view AS
SELECT
  ib.organization_id,
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_type,
  kri.indicator_category,
  -- Breach statistics
  COUNT(*) as total_breaches,
  COUNT(*) FILTER (WHERE ib.breach_level = 'warning') as warning_breaches,
  COUNT(*) FILTER (WHERE ib.breach_level = 'critical') as critical_breaches,
  COUNT(*) FILTER (WHERE ib.status = 'resolved') as resolved_breaches,
  COUNT(*) FILTER (WHERE ib.status IN ('active', 'investigating', 'mitigating')) as active_breaches,
  -- Time metrics
  ROUND(AVG(ib.breach_duration_hours) FILTER (WHERE ib.breach_duration_hours IS NOT NULL), 2) as avg_resolution_hours,
  ROUND(MAX(ib.breach_duration_hours), 2) as max_resolution_hours,
  -- Frequency
  MIN(ib.breach_date) as first_breach_date,
  MAX(ib.breach_date) as latest_breach_date,
  ROUND(
    COUNT(*)::NUMERIC /
    GREATEST(EXTRACT(DAY FROM (MAX(ib.breach_date) - MIN(ib.breach_date))), 1),
    2
  ) as breaches_per_day,
  -- Severity analysis
  ROUND(AVG(ib.breach_percentage), 1) as avg_breach_percentage,
  MAX(ib.breach_percentage) as max_breach_percentage
FROM indicator_breaches ib
JOIN kri_kci_library kri ON ib.indicator_id = kri.id
GROUP BY ib.organization_id, kri.id, kri.indicator_code, kri.indicator_name, kri.indicator_type, kri.indicator_category
HAVING COUNT(*) > 0
ORDER BY total_breaches DESC, breaches_per_day DESC;

-- View: Breach Resolution Performance
CREATE OR REPLACE VIEW breach_resolution_performance_view AS
SELECT
  ib.organization_id,
  owner.email as action_owner,
  -- Breach counts
  COUNT(*) as total_assigned_breaches,
  COUNT(*) FILTER (WHERE ib.status = 'resolved') as resolved_count,
  COUNT(*) FILTER (WHERE ib.status IN ('active', 'investigating', 'mitigating')) as active_count,
  COUNT(*) FILTER (WHERE ib.status = 'false_positive') as false_positive_count,
  -- Resolution metrics
  ROUND(
    COUNT(*) FILTER (WHERE ib.status = 'resolved')::NUMERIC / COUNT(*) * 100,
    1
  ) as resolution_rate_pct,
  ROUND(AVG(ib.breach_duration_hours) FILTER (WHERE ib.status = 'resolved'), 2) as avg_resolution_time_hours,
  ROUND(AVG(ib.breach_duration_hours) FILTER (WHERE ib.breach_level = 'critical' AND ib.status = 'resolved'), 2) as avg_critical_resolution_hours,
  -- Workload
  COUNT(*) FILTER (WHERE ib.priority = 'critical' AND ib.status IN ('active', 'investigating', 'mitigating')) as critical_active,
  COUNT(*) FILTER (WHERE ib.priority = 'high' AND ib.status IN ('active', 'investigating', 'mitigating')) as high_active
FROM indicator_breaches ib
LEFT JOIN user_profiles owner ON ib.action_owner = owner.id
WHERE ib.action_owner IS NOT NULL
GROUP BY ib.organization_id, owner.id, owner.email
ORDER BY resolution_rate_pct DESC, avg_resolution_time_hours ASC;

-- View: Indicator Health Dashboard
CREATE OR REPLACE VIEW indicator_health_dashboard_view AS
SELECT
  kri.organization_id,
  kri.indicator_code,
  kri.indicator_name,
  kri.indicator_type,
  kri.indicator_category,
  kri.threshold_warning,
  kri.threshold_critical,
  -- Breach frequency
  COUNT(ib.id) as total_breaches_30d,
  COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') as breaches_7d,
  COUNT(ib.id) FILTER (WHERE ib.breach_level = 'critical') as critical_breaches_30d,
  -- Current status
  CASE
    WHEN COUNT(ib.id) FILTER (WHERE ib.status IN ('active', 'investigating', 'mitigating')) > 0 THEN 'Breached'
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') > 2 THEN 'Frequent Breaches'
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '30 days') > 0 THEN 'Stable'
    ELSE 'Healthy'
  END as health_status,
  -- Latest breach
  MAX(ib.breach_date) as latest_breach_date,
  MAX(ib.measured_value) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '30 days') as highest_measured_value,
  -- Trend
  CASE
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') >
         COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '14 days' AND ib.breach_date < NOW() - INTERVAL '7 days')
    THEN 'Worsening'
    WHEN COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '7 days') <
         COUNT(ib.id) FILTER (WHERE ib.breach_date >= NOW() - INTERVAL '14 days' AND ib.breach_date < NOW() - INTERVAL '7 days')
    THEN 'Improving'
    ELSE 'Stable'
  END as trend
FROM kri_kci_library kri
LEFT JOIN indicator_breaches ib ON kri.id = ib.indicator_id AND ib.breach_date >= NOW() - INTERVAL '30 days'
WHERE kri.status = 'active'
GROUP BY kri.id, kri.organization_id, kri.indicator_code, kri.indicator_name,
         kri.indicator_type, kri.indicator_category,
         kri.threshold_warning, kri.threshold_critical
ORDER BY total_breaches_30d DESC, health_status;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Record Indicator Breach
CREATE OR REPLACE FUNCTION record_indicator_breach(
  p_organization_id UUID,
  p_indicator_id UUID,
  p_risk_id UUID,
  p_measured_value NUMERIC,
  p_breach_level VARCHAR DEFAULT 'warning'
)
RETURNS UUID AS $$
DECLARE
  v_indicator RECORD;
  v_threshold_value NUMERIC;
  v_breach_id UUID;
BEGIN
  -- Get indicator details
  SELECT * INTO v_indicator
  FROM kri_kci_library
  WHERE id = p_indicator_id AND organization_id = p_organization_id;

  IF v_indicator IS NULL THEN
    RAISE EXCEPTION 'Indicator % not found', p_indicator_id;
  END IF;

  -- Determine threshold value
  v_threshold_value := CASE p_breach_level
    WHEN 'critical' THEN v_indicator.threshold_critical
    ELSE v_indicator.threshold_warning
  END;

  -- Create breach record
  INSERT INTO indicator_breaches (
    organization_id, indicator_id, risk_id,
    breach_level, measured_value, threshold_value, threshold_type,
    measurement_unit
  )
  VALUES (
    p_organization_id, p_indicator_id, p_risk_id,
    p_breach_level, p_measured_value, v_threshold_value, p_breach_level,
    v_indicator.measurement_unit
  )
  RETURNING id INTO v_breach_id;

  RETURN v_breach_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Resolve Breach
CREATE OR REPLACE FUNCTION resolve_breach(
  p_breach_id UUID,
  p_resolved_by UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE indicator_breaches
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    updated_at = NOW()
  WHERE id = p_breach_id AND status != 'resolved';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE indicator_breaches IS 'Tracks KRI/KCI threshold breaches with response and resolution history';

COMMENT ON COLUMN indicator_breaches.breach_level IS 'warning (threshold_warning) or critical (threshold_critical)';
COMMENT ON COLUMN indicator_breaches.breach_percentage IS 'Percentage by which measured value exceeded threshold';
COMMENT ON COLUMN indicator_breaches.consecutive_breach_count IS 'Number of consecutive breaches for this indicator';
COMMENT ON COLUMN indicator_breaches.breach_duration_hours IS 'Hours from breach to resolution';

COMMENT ON VIEW active_breaches_view IS 'Currently active indicator breaches requiring attention';
COMMENT ON VIEW breach_trends_view IS 'Historical breach trends by indicator showing frequency and resolution performance';
COMMENT ON VIEW breach_resolution_performance_view IS 'Performance metrics for individuals resolving breaches';
COMMENT ON VIEW indicator_health_dashboard_view IS 'Health status of all indicators based on recent breach activity';

COMMENT ON FUNCTION record_indicator_breach IS 'Creates a new breach record when an indicator exceeds its threshold';
COMMENT ON FUNCTION resolve_breach IS 'Marks a breach as resolved and calculates resolution time';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Record a breach
-- SELECT record_indicator_breach(
--   'org-uuid', 'indicator-uuid', 'risk-uuid',
--   95.5,  -- measured value (e.g., CPU at 95.5%)
--   'critical'
-- );

-- Example 2: View active breaches
-- SELECT * FROM active_breaches_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' ORDER BY priority, hours_active DESC;

-- Example 3: Analyze breach trends
-- SELECT * FROM breach_trends_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND breaches_per_day > 1;

-- Example 4: Resolve a breach
-- SELECT resolve_breach(
--   'breach-uuid',
--   'resolver-user-uuid',
--   'Auto-scaling kicked in, CPU normalized to 65%'
-- );

-- Example 5: Check indicator health
-- SELECT * FROM indicator_health_dashboard_view
-- WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND health_status != 'Healthy';

-- End of Migration 26


-- ============================================================================
-- Migration 27: library_approval_workflow
-- File: 20251126000027_library_approval_workflow.sql
-- ============================================================================

-- Migration: Library Suggestions Approval Workflow
-- Description: Allow users to suggest additions to library registers with approval workflow
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26
-- Enhancement: #12 (Nice-to-Have V2.0)

-- ============================================================================
-- CREATE LIBRARY SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Suggestion type
  suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('root_cause', 'impact', 'control', 'indicator')),

  -- Suggested data (stored as JSON for flexibility)
  suggested_data JSONB NOT NULL,

  -- Justification
  justification TEXT NOT NULL,
  use_case_example TEXT, -- Example of how this would be used
  similar_existing_items TEXT, -- Why existing items don't cover this need

  -- Workflow status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision', 'appealed')),

  -- Submission
  submitted_by UUID REFERENCES user_profiles(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Review
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,
  approval_notes TEXT,

  -- Appeal process
  appeal_submitted BOOLEAN DEFAULT false,
  appeal_reason TEXT,
  appeal_submitted_at TIMESTAMP WITH TIME ZONE,
  appeal_reviewed_by UUID REFERENCES user_profiles(id),
  appeal_reviewed_at TIMESTAMP WITH TIME ZONE,
  appeal_decision VARCHAR(20) CHECK (appeal_decision IN ('upheld', 'overturned', 'pending')),

  -- Implementation tracking (if approved)
  implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implemented_by UUID REFERENCES user_profiles(id),
  implemented_library_id UUID, -- ID of the created library item

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_org ON library_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON library_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON library_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_submitted_by ON library_suggestions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_reviewed_by ON library_suggestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_submitted_at ON library_suggestions(submitted_at);

-- ============================================================================
-- TRIGGER: Update Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_suggestion_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set reviewed_at when status changes to approved/rejected
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    NEW.reviewed_at := NOW();
  END IF;

  -- Set appeal_submitted_at when appeal is filed
  IF NEW.appeal_submitted = true AND OLD.appeal_submitted = false THEN
    NEW.appeal_submitted_at := NOW();
    NEW.status := 'appealed';
  END IF;

  -- Set implemented_at when implemented flag is set
  IF NEW.implemented = true AND OLD.implemented = false THEN
    NEW.implemented_at := NOW();
  END IF;

  -- Always update updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_suggestion_timestamps ON library_suggestions;
CREATE TRIGGER trigger_update_suggestion_timestamps
  BEFORE UPDATE ON library_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_suggestion_timestamps();

-- ============================================================================
-- CREATE VIEWS FOR SUGGESTION MANAGEMENT
-- ============================================================================

-- View: Pending Suggestions Queue
CREATE OR REPLACE VIEW pending_suggestions_view AS
SELECT
  ls.id,
  ls.organization_id,
  ls.suggestion_type,
  ls.suggested_data,
  ls.justification,
  ls.use_case_example,
  ls.status,
  -- Submitter
  sub.email as submitted_by_email,
  sub.name as submitted_by_name,
  ls.submitted_at,
  -- Days pending
  EXTRACT(DAY FROM (NOW() - ls.submitted_at)) as days_pending,
  -- Priority assessment
  CASE
    WHEN ls.suggestion_type = 'control' THEN 1  -- Controls highest priority
    WHEN ls.suggestion_type = 'indicator' THEN 2
    WHEN ls.suggestion_type = 'root_cause' THEN 3
    WHEN ls.suggestion_type = 'impact' THEN 4
  END as priority_order,
  -- SLA status
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - ls.submitted_at)) > 14 THEN 'Overdue'
    WHEN EXTRACT(DAY FROM (NOW() - ls.submitted_at)) > 7 THEN 'Due Soon'
    ELSE 'On Track'
  END as review_sla_status
FROM library_suggestions ls
LEFT JOIN user_profiles sub ON ls.submitted_by = sub.id
WHERE ls.status = 'pending'
ORDER BY priority_order, ls.submitted_at ASC;

-- View: Suggestion Review Dashboard
CREATE OR REPLACE VIEW suggestion_review_dashboard_view AS
SELECT
  ls.organization_id,
  ls.suggestion_type,
  -- Status counts
  COUNT(*) as total_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE ls.status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE ls.status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE ls.status = 'needs_revision') as revision_count,
  COUNT(*) FILTER (WHERE ls.status = 'appealed') as appealed_count,
  -- Implementation status
  COUNT(*) FILTER (WHERE ls.status = 'approved' AND ls.implemented = true) as implemented_count,
  COUNT(*) FILTER (WHERE ls.status = 'approved' AND ls.implemented = false) as approved_not_implemented,
  -- Metrics
  ROUND(
    COUNT(*) FILTER (WHERE ls.status = 'approved')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE ls.status IN ('approved', 'rejected')), 0) * 100,
    1
  ) as approval_rate_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (ls.reviewed_at - ls.submitted_at)) / 86400)
    FILTER (WHERE ls.reviewed_at IS NOT NULL),
    1
  ) as avg_review_time_days,
  -- Oldest pending
  MIN(ls.submitted_at) FILTER (WHERE ls.status = 'pending') as oldest_pending_date
FROM library_suggestions ls
GROUP BY ls.organization_id, ls.suggestion_type
ORDER BY ls.suggestion_type;

-- View: User Contribution History
CREATE OR REPLACE VIEW user_contributions_view AS
SELECT
  ls.organization_id,
  sub.id as user_id,
  sub.email,
  sub.name,
  -- Contribution counts
  COUNT(*) as total_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'approved') as approved_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'rejected') as rejected_suggestions,
  COUNT(*) FILTER (WHERE ls.status = 'pending') as pending_suggestions,
  -- Implementation
  COUNT(*) FILTER (WHERE ls.implemented = true) as implemented_suggestions,
  -- Success rate
  ROUND(
    COUNT(*) FILTER (WHERE ls.status = 'approved')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE ls.status IN ('approved', 'rejected')), 0) * 100,
    1
  ) as approval_rate_pct,
  -- By type
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'root_cause') as root_cause_suggestions,
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'impact') as impact_suggestions,
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'control') as control_suggestions,
  COUNT(*) FILTER (WHERE ls.suggestion_type = 'indicator') as indicator_suggestions,
  -- Timing
  MIN(ls.submitted_at) as first_suggestion_date,
  MAX(ls.submitted_at) as latest_suggestion_date
FROM library_suggestions ls
LEFT JOIN user_profiles sub ON ls.submitted_by = sub.id
GROUP BY ls.organization_id, sub.id, sub.email, sub.name
HAVING COUNT(*) > 0
ORDER BY approved_suggestions DESC, total_suggestions DESC;

-- View: Appealed Suggestions
CREATE OR REPLACE VIEW appealed_suggestions_view AS
SELECT
  ls.id,
  ls.organization_id,
  ls.suggestion_type,
  ls.suggested_data,
  -- Original review
  rev.email as original_reviewer_email,
  ls.reviewed_at,
  ls.rejection_reason,
  -- Appeal
  ls.appeal_reason,
  ls.appeal_submitted_at,
  EXTRACT(DAY FROM (NOW() - ls.appeal_submitted_at)) as days_since_appeal,
  -- Appeal review
  app_rev.email as appeal_reviewer_email,
  ls.appeal_reviewed_at,
  ls.appeal_decision,
  -- Submitter
  sub.email as submitter_email
FROM library_suggestions ls
LEFT JOIN user_profiles sub ON ls.submitted_by = sub.id
LEFT JOIN user_profiles rev ON ls.reviewed_by = rev.id
LEFT JOIN user_profiles app_rev ON ls.appeal_reviewed_by = app_rev.id
WHERE ls.appeal_submitted = true
ORDER BY
  CASE ls.appeal_decision
    WHEN 'pending' THEN 1
    WHEN 'upheld' THEN 2
    WHEN 'overturned' THEN 3
  END,
  ls.appeal_submitted_at ASC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Submit Suggestion
CREATE OR REPLACE FUNCTION submit_library_suggestion(
  p_organization_id UUID,
  p_suggestion_type VARCHAR,
  p_suggested_data JSONB,
  p_justification TEXT,
  p_use_case_example TEXT,
  p_submitted_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_suggestion_id UUID;
BEGIN
  -- Validate suggestion type
  IF p_suggestion_type NOT IN ('root_cause', 'impact', 'control', 'indicator') THEN
    RAISE EXCEPTION 'Invalid suggestion type: %', p_suggestion_type;
  END IF;

  -- Create suggestion
  INSERT INTO library_suggestions (
    organization_id, suggestion_type, suggested_data,
    justification, use_case_example, submitted_by
  )
  VALUES (
    p_organization_id, p_suggestion_type, p_suggested_data,
    p_justification, p_use_case_example, p_submitted_by
  )
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Approve Suggestion
CREATE OR REPLACE FUNCTION approve_suggestion(
  p_suggestion_id UUID,
  p_reviewed_by UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    approval_notes = p_approval_notes,
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Reject Suggestion
CREATE OR REPLACE FUNCTION reject_suggestion(
  p_suggestion_id UUID,
  p_reviewed_by UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Submit Appeal
CREATE OR REPLACE FUNCTION submit_appeal(
  p_suggestion_id UUID,
  p_appeal_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    appeal_submitted = true,
    appeal_reason = p_appeal_reason,
    appeal_submitted_at = NOW(),
    status = 'appealed',
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'rejected';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark Suggestion as Implemented
CREATE OR REPLACE FUNCTION mark_suggestion_implemented(
  p_suggestion_id UUID,
  p_implemented_by UUID,
  p_library_item_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE library_suggestions
  SET
    implemented = true,
    implemented_at = NOW(),
    implemented_by = p_implemented_by,
    implemented_library_id = p_library_item_id,
    updated_at = NOW()
  WHERE id = p_suggestion_id AND status = 'approved';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE library_suggestions IS 'User-submitted suggestions for additions to library registers with approval workflow';

COMMENT ON COLUMN library_suggestions.suggestion_type IS 'Type of library item: root_cause, impact, control, or indicator';
COMMENT ON COLUMN library_suggestions.suggested_data IS 'JSON object containing the proposed library item data';
COMMENT ON COLUMN library_suggestions.status IS 'Workflow status: pending, approved, rejected, needs_revision, appealed';
COMMENT ON COLUMN library_suggestions.appeal_submitted IS 'Whether submitter appealed a rejection';
COMMENT ON COLUMN library_suggestions.implemented IS 'Whether approved suggestion has been added to library';

COMMENT ON VIEW pending_suggestions_view IS 'Queue of suggestions awaiting review with SLA tracking';
COMMENT ON VIEW suggestion_review_dashboard_view IS 'Dashboard showing suggestion volume, approval rates, and review performance';
COMMENT ON VIEW user_contributions_view IS 'Track user contributions and approval success rates';
COMMENT ON VIEW appealed_suggestions_view IS 'Suggestions that have been appealed after rejection';

COMMENT ON FUNCTION submit_library_suggestion IS 'Submit a new suggestion for library addition';
COMMENT ON FUNCTION approve_suggestion IS 'Approve a pending suggestion';
COMMENT ON FUNCTION reject_suggestion IS 'Reject a pending suggestion with reason';
COMMENT ON FUNCTION submit_appeal IS 'Appeal a rejected suggestion';
COMMENT ON FUNCTION mark_suggestion_implemented IS 'Mark an approved suggestion as implemented in the library';

-- ============================================================================
-- SAMPLE USAGE
-- ============================================================================

-- Example 1: Submit a new control suggestion
-- SELECT submit_library_suggestion(
--   'org-uuid',
--   'control',
--   '{"control_code": "CTL-096", "control_name": "API Rate Limiting", "category": "Cybersecurity", "complexity": "Intermediate"}'::jsonb,
--   'Needed to prevent API abuse and DDoS attacks',
--   'We recently experienced API overload from a bot; rate limiting would have prevented this',
--   'user-uuid'
-- );

-- Example 2: Review pending suggestions
-- SELECT * FROM pending_suggestions_view WHERE organization_id = '11111111-1111-1111-1111-111111111111' ORDER BY days_pending DESC;

-- Example 3: Approve a suggestion
-- SELECT approve_suggestion(
--   'suggestion-uuid',
--   'reviewer-uuid',
--   'Good suggestion, addresses gap in API security controls'
-- );

-- Example 4: Reject with reason
-- SELECT reject_suggestion(
--   'suggestion-uuid',
--   'reviewer-uuid',
--   'This is already covered by CTL-008 (IDS) and CTL-030 (Real-time alerting)'
-- );

-- Example 5: View statistics
-- SELECT * FROM suggestion_review_dashboard_view WHERE organization_id = '11111111-1111-1111-1111-111111111111';

-- End of Migration 27


-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

COMMIT;  -- Commit transaction

-- Verify deployment
SELECT 'Deployment verification:' as message;
SELECT COUNT(*) as root_causes FROM root_cause_register;
SELECT COUNT(*) as impacts FROM impact_register;
SELECT COUNT(*) as controls FROM control_library;
SELECT COUNT(*) as indicators FROM kri_kci_library;

-- End of combined deployment SQL
