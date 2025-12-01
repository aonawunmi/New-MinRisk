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
('IMP-012', 'Operational inefficiency', 'Reduced productivity and operational effectiveness', 'operational', 'Operational Risk', 'Process Inefficiency', 'Moderate', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-023', 'Supply chain disruption', 'Interruption to supply chain operations affecting delivery', 'operational', 'Supply Chain & Logistics Risk', 'Supply Disruptions', 'Major', 'active', 'YOUR_ORG_ID', NOW()),

-- People & Culture Impacts
('IMP-013', 'Employee morale decline', 'Reduction in employee satisfaction and engagement', 'strategic', 'Human Capital Risk', 'Employee Engagement', 'Moderate', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-014', 'Knowledge/skill loss', 'Loss of critical knowledge or expertise from the organization', 'strategic', 'Human Capital Risk', 'Succession Planning', 'Major', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-021', 'Talent attrition', 'Loss of key personnel to competitors or market', 'strategic', 'Human Capital Risk', 'Employee Retention', 'Major', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-030', 'Cultural degradation', 'Deterioration of organizational culture and values', 'strategic', 'Governance & Reputational Risk', 'Workplace Culture', 'Major', 'active', 'YOUR_ORG_ID', NOW()),

-- Innovation & Strategic Impacts
('IMP-015', 'Innovation stagnation', 'Slowdown or halt in innovation and product development', 'strategic', 'Strategic Risk', 'Innovation Pipeline', 'Major', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-018', 'Strategic misalignment', 'Divergence from strategic objectives and goals', 'strategic', 'Strategic Risk', 'Strategic Planning Failures', 'Severe', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-026', 'Competitive advantage erosion', 'Loss of market differentiators and competitive position', 'strategic', 'Strategic Risk', 'Market Competition', 'Severe', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-029', 'Business model obsolescence', 'Fundamental business model becoming outdated or unviable', 'strategic', 'Strategic Risk', 'Business Model Disruption', 'Catastrophic', 'active', 'YOUR_ORG_ID', NOW()),

-- Environmental & Social Impacts
('IMP-016', 'Environmental harm', 'Damage to the natural environment from operations', 'environmental', 'ESG & Sustainability Risk', 'Environmental Pollution', 'Severe', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-017', 'Community relations damage', 'Harm to relationships with local communities and stakeholders', 'reputational', 'ESG & Sustainability Risk', 'Community Relations', 'Major', 'active', 'YOUR_ORG_ID', NOW()),

-- Partnership & Relationship Impacts
('IMP-018-DUP', 'Partnership dissolution', 'Termination of strategic partnerships or alliances', 'strategic', 'Strategic Risk', 'Partnership & Alliance Risks', 'Major', 'active', 'YOUR_ORG_ID', NOW()),

-- Technology & Asset Impacts
('IMP-020', 'Technology debt accumulation', 'Buildup of technical debt reducing agility and increasing maintenance costs', 'operational', 'Technology & Cyber Risk', 'Technology Obsolescence', 'Major', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-025', 'Intellectual property loss', 'Loss or theft of intellectual property, trade secrets, or proprietary information', 'regulatory', 'Innovation & IP Risk', 'Trade Secret Protection', 'Severe', 'active', 'YOUR_ORG_ID', NOW()),

-- Market & Business Impacts
('IMP-022', 'Market credibility loss', 'Loss of market credibility and investor confidence', 'reputational', 'Governance & Reputational Risk', 'Brand Reputation', 'Severe', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-024', 'Shareholder value destruction', 'Significant reduction in shareholder value and market capitalization', 'financial', 'Financial Risk', 'Asset Valuation', 'Catastrophic', 'active', 'YOUR_ORG_ID', NOW()),

-- Legal & Contractual Impacts
('IMP-027', 'Contractual default', 'Failure to meet contractual obligations leading to default', 'regulatory', 'Compliance & Legal Risk', 'Contractual Obligations', 'Major', 'active', 'YOUR_ORG_ID', NOW()),
('IMP-028', 'Insurance claim', 'Triggering of insurance claims affecting premiums and coverage', 'financial', 'Financial Risk', 'Insurance Requirements', 'Moderate', 'active', 'YOUR_ORG_ID', NOW())
ON CONFLICT (organization_id, impact_code) DO NOTHING;

-- Fix duplicate impact code
UPDATE impact_register
SET impact_code = 'IMP-019'
WHERE impact_code = 'IMP-018-DUP' AND organization_id = 'YOUR_ORG_ID';

-- Update severity levels for existing impacts
UPDATE impact_register SET severity_level = 'Major' WHERE impact_code IN ('IMP-001', 'IMP-002', 'IMP-007', 'IMP-011') AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET severity_level = 'Severe' WHERE impact_code IN ('IMP-003', 'IMP-004', 'IMP-005', 'IMP-006', 'IMP-009') AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET severity_level = 'Major' WHERE impact_code IN ('IMP-008', 'IMP-010') AND organization_id = 'YOUR_ORG_ID';

-- Set recovery time estimates (examples)
UPDATE impact_register SET recovery_time_estimate = '< 1 day' WHERE severity_level = 'Minor' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET recovery_time_estimate = '1-7 days' WHERE severity_level = 'Moderate' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET recovery_time_estimate = '1-4 weeks' WHERE severity_level = 'Major' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET recovery_time_estimate = '1-3 months' WHERE severity_level = 'Severe' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET recovery_time_estimate = '> 3 months' WHERE severity_level = 'Catastrophic' AND organization_id = 'YOUR_ORG_ID';

-- Set financial ranges (examples - should be customized per organization)
UPDATE impact_register SET financial_range_min = 0, financial_range_max = 10000 WHERE severity_level = 'Minor' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET financial_range_min = 10000, financial_range_max = 100000 WHERE severity_level = 'Moderate' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET financial_range_min = 100000, financial_range_max = 1000000 WHERE severity_level = 'Major' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET financial_range_min = 1000000, financial_range_max = 10000000 WHERE severity_level = 'Severe' AND organization_id = 'YOUR_ORG_ID';
UPDATE impact_register SET financial_range_min = 10000000, financial_range_max = NULL WHERE severity_level = 'Catastrophic' AND organization_id = 'YOUR_ORG_ID';

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
WHERE organization_id = 'YOUR_ORG_ID' AND status = 'active'
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
