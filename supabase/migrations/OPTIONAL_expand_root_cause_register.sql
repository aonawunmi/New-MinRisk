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
