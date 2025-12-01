-- Migration: Hybrid Root Cause Library (Global Foundation + Org Customizations)
-- Description: Refactor root causes to use global library with org-specific overrides
-- Feature Branch: feature/hybrid-multi-tenant
-- Date: 2025-11-26
-- Enhancement: #1 (Critical) - Refactored for Multi-Tenancy

-- ============================================================================
-- PART 1: CREATE GLOBAL ROOT CAUSE LIBRARY (Shared by All Organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS global_root_cause_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cause_code VARCHAR(20) UNIQUE NOT NULL,
  cause_name VARCHAR(255) NOT NULL,
  cause_description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  parent_cause_id UUID REFERENCES global_root_cause_library(id),
  severity_indicator VARCHAR(20) CHECK (severity_indicator IN ('Low', 'Medium', 'High', 'Critical')),
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_root_cause_code ON global_root_cause_library(cause_code);
CREATE INDEX IF NOT EXISTS idx_global_root_cause_category ON global_root_cause_library(category);
CREATE INDEX IF NOT EXISTS idx_global_root_cause_parent ON global_root_cause_library(parent_cause_id);

-- ============================================================================
-- PART 2: POPULATE GLOBAL ROOT CAUSE LIBRARY (45 Standard Root Causes)
-- ============================================================================

INSERT INTO global_root_cause_library (
  cause_code, cause_name, cause_description, category, subcategory, severity_indicator
) VALUES
-- Original 23 Root Causes (from Phase 1)
('RC-001', 'Inadequate internal controls', 'Lack of proper internal controls or control failures', 'Operational Risk', 'Internal Control Failure', 'High'),
('RC-002', 'Policy non-compliance', 'Failure to comply with established policies and procedures', 'Governance & Reputational Risk', 'Policy Violation', 'High'),
('RC-003', 'Legacy systems', 'Outdated technology infrastructure causing operational issues', 'Technology & Cyber Risk', 'Technology Obsolescence', 'High'),
('RC-004', 'Third-party failure', 'Failure or disruption caused by external vendors or partners', 'Supply Chain & Logistics Risk', 'Vendor Management', 'Critical'),
('RC-005', 'Insufficient resources', 'Lack of adequate human or financial resources', 'Financial Risk', 'Budgeting & Forecasting', 'Medium'),
('RC-006', 'Inadequate training', 'Insufficient training or skill development for personnel', 'Human Capital Risk', 'Skills Shortage', 'Medium'),
('RC-007', 'Human error', 'Mistakes or errors made by personnel', 'Operational Risk', 'Human Error', 'Medium'),
('RC-008', 'Unclear processes', 'Ambiguous or poorly defined business processes', 'Operational Risk', 'Process Inefficiency', 'Medium'),
('RC-009', 'System failure', 'Technical system outages or malfunctions', 'Technology & Cyber Risk', 'IT Service Management', 'Critical'),
('RC-010', 'Vendor failure', 'Critical vendor inability to deliver services or products', 'Supply Chain & Logistics Risk', 'Vendor Management', 'High'),
('RC-011', 'Fraud or misconduct', 'Intentional fraudulent activity or ethical violations', 'Governance & Reputational Risk', 'Ethical Conduct', 'Critical'),
('RC-012', 'Cybersecurity breach', 'Security incidents including unauthorized access or data breaches', 'Technology & Cyber Risk', 'Cybersecurity Threats', 'Critical'),
('RC-013', 'Regulatory changes', 'New or updated regulations requiring compliance', 'Legal & Compliance Risk', 'Regulatory Compliance', 'High'),
('RC-014', 'Poor data quality', 'Inaccurate, incomplete, or outdated data', 'Data & Information Risk', 'Data Quality', 'Medium'),
('RC-015', 'Insufficient monitoring', 'Lack of adequate monitoring or oversight', 'Operational Risk', 'Process Monitoring', 'Medium'),
('RC-016', 'External market changes', 'Adverse changes in market conditions or competitive environment', 'Market & Strategic Risk', 'Market Volatility', 'High'),
('RC-017', 'Natural disaster', 'Physical disasters or environmental events', 'Operational Risk', 'Natural Catastrophes', 'Critical'),
('RC-018', 'Change management failure', 'Poor execution of organizational or technical changes', 'Project & Programme Risk', 'Change Management', 'High'),
('RC-019', 'Inadequate communication', 'Breakdown in communication channels or information flow', 'Governance & Reputational Risk', 'Stakeholder Management', 'Medium'),
('RC-020', 'Concentration risk', 'Over-reliance on single customer, vendor, or market', 'Market & Strategic Risk', 'Single Points of Failure', 'High'),
('RC-021', 'Political instability', 'Adverse political or geopolitical events', 'External Risk', 'Geopolitical', 'High'),
('RC-022', 'Supply chain disruption', 'Interruptions in supply chain operations', 'Supply Chain & Logistics Risk', 'Logistics Management', 'High'),
('RC-023', 'Inadequate testing', 'Insufficient testing of systems or processes before deployment', 'Operational Risk', 'Quality Management', 'Medium'),

-- New 22 Root Causes (Enhancement #1)
-- Documentation & Knowledge Management
('RC-024', 'Inadequate documentation', 'Lack of comprehensive, up-to-date documentation for systems, processes, or procedures', 'Operational Risk', 'Process Inefficiency', 'Medium'),
('RC-031', 'Over-reliance on tribal knowledge', 'Critical knowledge held by individuals without formal documentation or knowledge transfer', 'Human Capital Risk', 'Skills Shortage', 'High'),

-- Technology & Innovation
('RC-025', 'Shadow IT proliferation', 'Unauthorized IT systems or applications deployed without proper governance', 'Technology & Cyber Risk', 'IT Service Management', 'High'),
('RC-027', 'Insufficient process automation', 'Manual processes where automation would reduce errors and improve efficiency', 'Operational Risk', 'Process Inefficiency', 'Medium'),
('RC-034', 'Excessive system complexity', 'Overly complex technical architecture increasing failure risk', 'Technology & Cyber Risk', 'Technology Obsolescence', 'High'),
('RC-045', 'Technology debt accumulation', 'Accumulated technical debt from shortcuts and deferred refactoring', 'Technology & Cyber Risk', 'Technology Obsolescence', 'High'),

-- Human Capital & Skills
('RC-026', 'Technical skill gaps', 'Lack of required technical skills or expertise within the team', 'Human Capital Risk', 'Skills Shortage', 'High'),
('RC-035', 'Key person dependency', 'Critical dependence on specific individuals for essential functions', 'Human Capital Risk', 'Succession Planning', 'Critical'),
('RC-043', 'Lack of security awareness', 'Insufficient security awareness training for staff', 'Technology & Cyber Risk', 'Cybersecurity Threats', 'High'),

-- Organizational & Governance
('RC-028', 'Unclear role accountability', 'Ambiguous roles and responsibilities leading to gaps in coverage', 'Governance & Reputational Risk', 'Corporate Governance Structure', 'Medium'),
('RC-029', 'Siloed organizational structure', 'Organizational silos preventing effective collaboration and information sharing', 'Governance & Reputational Risk', 'Organizational Restructuring', 'Medium'),
('RC-038', 'Lack of senior management support', 'Insufficient executive sponsorship or support for critical initiatives', 'Governance & Reputational Risk', 'Executive Leadership', 'High'),

-- Change & Culture
('RC-030', 'Resistance to change', 'Organizational or individual resistance to necessary changes', 'Governance & Reputational Risk', 'Corporate Culture', 'Medium'),
('RC-039', 'Ineffective communication channels', 'Poor communication mechanisms leading to misunderstandings and errors', 'Governance & Reputational Risk', 'Stakeholder Management', 'Medium'),

-- Resource Constraints
('RC-032', 'Budget constraints', 'Insufficient budget allocation for critical needs', 'Financial Risk', 'Budgeting & Forecasting', 'High'),
('RC-033', 'Time pressure / rushed decisions', 'Insufficient time allocated leading to rushed, suboptimal decisions', 'Operational Risk', 'Process Inefficiency', 'Medium'),

-- Quality & Testing
('RC-036', 'Inadequate testing (comprehensive)', 'Insufficient testing of systems, processes, or changes before deployment', 'Operational Risk', 'Quality Management', 'High'),
('RC-037', 'Poor requirements gathering', 'Incomplete or inaccurate requirements definition', 'Project & Programme Risk', 'Scope Creep', 'Medium'),

-- Operational Resilience
('RC-040', 'Lack of performance metrics', 'Insufficient monitoring and measurement of performance', 'Operational Risk', 'Process Monitoring', 'Medium'),
('RC-041', 'Inadequate disaster recovery planning', 'Insufficient disaster recovery or business continuity planning', 'Operational Risk', 'Disaster Recovery', 'Critical'),
('RC-042', 'Poor incident response procedures', 'Inadequate procedures for responding to incidents', 'Operational Risk', 'Business Continuity', 'High'),

-- Third-Party & Vendor
('RC-044', 'Inadequate vendor due diligence', 'Insufficient vetting and ongoing monitoring of vendors', 'Supply Chain & Logistics Risk', 'Vendor Management', 'High')

ON CONFLICT (cause_code) DO NOTHING;

-- Set up hierarchical relationships
UPDATE global_root_cause_library SET parent_cause_id = (SELECT id FROM global_root_cause_library WHERE cause_code = 'RC-007') WHERE cause_code = 'RC-026'; -- Technical skill gaps → Human error
UPDATE global_root_cause_library SET parent_cause_id = (SELECT id FROM global_root_cause_library WHERE cause_code = 'RC-007') WHERE cause_code = 'RC-043'; -- Lack of security awareness → Human error
UPDATE global_root_cause_library SET parent_cause_id = (SELECT id FROM global_root_cause_library WHERE cause_code = 'RC-003') WHERE cause_code = 'RC-045'; -- Technology debt → Legacy systems
UPDATE global_root_cause_library SET parent_cause_id = (SELECT id FROM global_root_cause_library WHERE cause_code = 'RC-010') WHERE cause_code = 'RC-044'; -- Inadequate vendor due diligence → Vendor failure

-- ============================================================================
-- PART 3: CREATE ORGANIZATION CUSTOMIZATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_root_causes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference to global cause (if this is an override)
  global_cause_id UUID REFERENCES global_root_cause_library(id),

  -- Custom/override fields
  cause_code VARCHAR(20) NOT NULL,
  cause_name VARCHAR(255) NOT NULL,
  cause_description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  parent_cause_id UUID, -- Can reference global or org cause
  severity_indicator VARCHAR(20) CHECK (severity_indicator IN ('Low', 'Medium', 'High', 'Critical')),

  -- Metadata
  is_custom BOOLEAN DEFAULT false, -- true if org-created, false if override
  is_hidden BOOLEAN DEFAULT false, -- true to hide global cause from this org
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique cause codes per org
  UNIQUE(organization_id, cause_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_root_causes_org_id ON org_root_causes(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_root_causes_code ON org_root_causes(organization_id, cause_code);
CREATE INDEX IF NOT EXISTS idx_org_root_causes_global_ref ON org_root_causes(global_cause_id);

-- Enable RLS
ALTER TABLE org_root_causes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their organization's customizations
CREATE POLICY "Users can view org root causes"
ON org_root_causes
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can insert for their organization
CREATE POLICY "Users can insert org root causes"
ON org_root_causes
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can update their organization's causes
CREATE POLICY "Users can update org root causes"
ON org_root_causes
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- ============================================================================
-- PART 4: CREATE UNIFIED VIEW (Global + Org Customizations)
-- ============================================================================

-- Backup existing root_cause_register table if it exists
ALTER TABLE IF EXISTS root_cause_register RENAME TO root_cause_register_backup_20251126;

-- Create unified view
CREATE OR REPLACE VIEW root_cause_register AS
-- Global causes (visible to all orgs unless hidden)
SELECT
  g.id,
  NULL::UUID as organization_id, -- NULL indicates global
  g.cause_code,
  g.cause_name,
  g.cause_description,
  g.category,
  g.subcategory,
  g.parent_cause_id,
  g.severity_indicator,
  'active'::VARCHAR(20) as status, -- For compatibility
  NOW() as approved_at, -- For compatibility
  'global' as source,
  g.created_at,
  g.updated_at
FROM global_root_cause_library g
WHERE g.is_active = true

UNION ALL

-- Organization customizations and additions
SELECT
  o.id,
  o.organization_id,
  o.cause_code,
  o.cause_name,
  o.cause_description,
  o.category,
  o.subcategory,
  o.parent_cause_id,
  o.severity_indicator,
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  CASE
    WHEN o.is_custom THEN 'custom'
    ELSE 'override'
  END as source,
  o.created_at,
  o.updated_at
FROM org_root_causes o
WHERE o.is_hidden = false;

-- Create hierarchical view (updated for global + org)
CREATE OR REPLACE VIEW root_cause_hierarchy_view AS
WITH RECURSIVE cause_tree AS (
  -- Base case: root causes (no parent) from global library
  SELECT
    id,
    NULL::UUID as organization_id,
    cause_code,
    cause_name,
    parent_cause_id,
    severity_indicator,
    category,
    subcategory,
    1 as depth,
    cause_code::TEXT as path  -- Cast to TEXT to match recursive case
  FROM global_root_cause_library
  WHERE parent_cause_id IS NULL
    AND is_active = true

  UNION ALL

  -- Recursive case: child causes from global
  SELECT
    g.id,
    NULL::UUID as organization_id,
    g.cause_code,
    g.cause_name,
    g.parent_cause_id,
    g.severity_indicator,
    g.category,
    g.subcategory,
    ct.depth + 1,
    ct.path || ' > ' || g.cause_code  -- This is TEXT
  FROM global_root_cause_library g
  INNER JOIN cause_tree ct ON g.parent_cause_id = ct.id
  WHERE g.is_active = true
)
SELECT * FROM cause_tree
ORDER BY path;

-- ============================================================================
-- PART 5: MIGRATION HELPERS
-- ============================================================================

-- Function to help organizations add custom root causes
CREATE OR REPLACE FUNCTION add_custom_root_cause(
  p_organization_id UUID,
  p_cause_code VARCHAR(20),
  p_cause_name VARCHAR(255),
  p_cause_description TEXT,
  p_category VARCHAR(100),
  p_severity_indicator VARCHAR(20)
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO org_root_causes (
    organization_id, cause_code, cause_name, cause_description,
    category, severity_indicator, is_custom
  )
  VALUES (
    p_organization_id, p_cause_code, p_cause_name, p_cause_description,
    p_category, p_severity_indicator, true
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to override global root cause
CREATE OR REPLACE FUNCTION override_global_root_cause(
  p_organization_id UUID,
  p_global_cause_id UUID,
  p_cause_name VARCHAR(255),
  p_cause_description TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_cause_code VARCHAR(20);
BEGIN
  -- Get cause code from global library
  SELECT cause_code INTO v_cause_code
  FROM global_root_cause_library
  WHERE id = p_global_cause_id;

  IF v_cause_code IS NULL THEN
    RAISE EXCEPTION 'Global cause ID not found';
  END IF;

  INSERT INTO org_root_causes (
    organization_id, global_cause_id, cause_code,
    cause_name, cause_description, is_custom
  )
  VALUES (
    p_organization_id, p_global_cause_id, v_cause_code,
    p_cause_name, p_cause_description, false
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify global library populated
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM global_root_cause_library;
  RAISE NOTICE 'Global root cause library: % causes loaded', v_count;

  IF v_count < 45 THEN
    RAISE WARNING 'Expected 45 global root causes, found %', v_count;
  END IF;
END $$;
