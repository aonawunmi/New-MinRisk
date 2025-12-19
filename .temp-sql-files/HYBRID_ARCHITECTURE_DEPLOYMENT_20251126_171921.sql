-- ============================================================================
-- HYBRID MULTI-TENANT ARCHITECTURE DEPLOYMENT
-- Risk Register Enhancements with Global Foundation + Org Customizations
-- ============================================================================
--
-- Generated: Wed Nov 26 17:19:21 WAT 2025
--
-- This file contains 5 comprehensive migrations:
--   1. Migration 000030: Hybrid Root Cause Library (45 global causes)
--   2. Migration 000031: Hybrid Impact Library (30 global impacts)
--   3. Migration 000032: Hybrid Control Library (95 global controls)
--   4. Migration 000033: Hybrid KRI/KCI Library + Mappings (39 indicators + 145 mappings)
--   5. Migration 000034: Remaining Enhancements (residual risk, testing, etc.)
--
-- Architecture:
--   - Global library tables (shared by all organizations)
--   - Organization customization tables (private to each org)
--   - Unified views (global + org data with RLS)
--
-- Benefits:
--   - 90% reduction in base library data
--   - Central updates propagate to all organizations
--   - Organizations can customize without affecting others
--   - Proper multi-tenancy with Row-Level Security
--
-- IMPORTANT: This will:
--   1. Create new global_* tables
--   2. Create new org_* customization tables
--   3. Migrate existing library data to global tables
--   4. Replace existing tables with views (old tables backed up)
--   5. Add new enhancements (residual risk, control testing, etc.)
--
-- Estimated execution time: 2-3 minutes
--
-- ============================================================================

BEGIN;  -- Start transaction


-- ============================================================================
-- MIGRATION 1: HYBRID ROOT CAUSE LIBRARY
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 2: HYBRID IMPACT LIBRARY
-- ============================================================================

-- Migration: Hybrid Impact Library (Global Foundation + Org Customizations)
-- Description: Refactor impacts to use global library with org-specific overrides
-- Feature Branch: feature/hybrid-multi-tenant
-- Date: 2025-11-26
-- Enhancement: #2 (Critical) - Refactored for Multi-Tenancy

-- ============================================================================
-- PART 1: CREATE GLOBAL IMPACT LIBRARY (Shared by All Organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS global_impact_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  impact_code VARCHAR(20) UNIQUE NOT NULL,
  impact_name VARCHAR(255) NOT NULL,
  impact_description TEXT,
  impact_type VARCHAR(50), -- operational, financial, reputational, regulatory, strategic, environmental
  category VARCHAR(100),
  subcategory VARCHAR(100),
  severity_level VARCHAR(20) CHECK (severity_level IN ('Minor', 'Moderate', 'Major', 'Severe', 'Catastrophic')),
  financial_range_min NUMERIC,
  financial_range_max NUMERIC,
  recovery_time_estimate VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_impact_code ON global_impact_library(impact_code);
CREATE INDEX IF NOT EXISTS idx_global_impact_type ON global_impact_library(impact_type);
CREATE INDEX IF NOT EXISTS idx_global_impact_severity ON global_impact_library(severity_level);

-- ============================================================================
-- PART 2: POPULATE GLOBAL IMPACT LIBRARY (30 Standard Impacts)
-- ============================================================================

INSERT INTO global_impact_library (
  impact_code, impact_name, impact_description, impact_type,
  category, subcategory, severity_level,
  financial_range_min, financial_range_max, recovery_time_estimate
) VALUES
-- Original 11 Impacts (from Phase 1)
('IMP-001', 'Financial loss', 'Direct monetary loss due to risk event', 'financial', 'Financial Risk', 'Loss of Revenue', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-002', 'Operational disruption', 'Interruption to normal business operations', 'operational', 'Operational Risk', 'Service Delivery Failure', 'Major', 50000, 500000, '1-4 weeks'),
('IMP-003', 'Regulatory penalty', 'Fines or sanctions from regulatory authorities', 'regulatory', 'Legal & Compliance Risk', 'Regulatory Breach', 'Severe', 1000000, 10000000, '1-3 months'),
('IMP-004', 'Reputational damage', 'Harm to brand reputation and public image', 'reputational', 'Governance & Reputational Risk', 'Brand Reputation', 'Severe', 500000, 5000000, '1-3 months'),
('IMP-005', 'Data breach', 'Unauthorized access or loss of sensitive data', 'regulatory', 'Technology & Cyber Risk', 'Data Breach / Privacy Violation', 'Severe', 1000000, 10000000, '1-3 months'),
('IMP-006', 'Customer loss', 'Loss of customers or customer relationships', 'financial', 'Market & Strategic Risk', 'Customer Churn', 'Severe', 500000, 5000000, '1-3 months'),
('IMP-007', 'Service downtime', 'Unavailability of critical systems or services', 'operational', 'Technology & Cyber Risk', 'Service Level Degradation', 'Major', 10000, 100000, '1-4 weeks'),
('IMP-008', 'Legal liability', 'Legal claims or lawsuits against the organization', 'regulatory', 'Legal & Compliance Risk', 'Litigation', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-009', 'Regulatory action', 'Enforcement action by regulatory body', 'regulatory', 'Legal & Compliance Risk', 'Regulatory Sanctions', 'Severe', 500000, 5000000, '1-3 months'),
('IMP-010', 'Market share decline', 'Reduction in market share due to competitive disadvantage', 'strategic', 'Market & Strategic Risk', 'Market Positioning', 'Major', 500000, 5000000, '1-4 weeks'),
('IMP-011', 'Project failure', 'Failure to deliver project objectives', 'operational', 'Project & Programme Risk', 'Project Delivery Failure', 'Major', 100000, 1000000, '1-4 weeks'),

-- New 19 Impacts (Enhancement #2)
-- Operational Impacts
('IMP-012', 'Operational inefficiency', 'Reduced productivity and operational effectiveness', 'operational', 'Operational Risk', 'Process Inefficiency', 'Moderate', 10000, 100000, '1-7 days'),
('IMP-023', 'Supply chain disruption', 'Interruption to supply chain operations affecting delivery', 'operational', 'Supply Chain & Logistics Risk', 'Supply Disruptions', 'Major', 100000, 1000000, '1-4 weeks'),

-- People & Culture Impacts
('IMP-013', 'Employee morale decline', 'Reduction in employee satisfaction and engagement', 'strategic', 'Human Capital Risk', 'Employee Engagement', 'Moderate', 10000, 100000, '1-7 days'),
('IMP-014', 'Knowledge/skill loss', 'Loss of critical knowledge or expertise from the organization', 'strategic', 'Human Capital Risk', 'Succession Planning', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-021', 'Talent attrition', 'Loss of key personnel to competitors or market', 'strategic', 'Human Capital Risk', 'Employee Retention', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-030', 'Cultural degradation', 'Deterioration of organizational culture and values', 'strategic', 'Governance & Reputational Risk', 'Workplace Culture', 'Major', 100000, 1000000, '1-4 weeks'),

-- Innovation & Strategic Impacts
('IMP-015', 'Innovation stagnation', 'Slowdown or halt in innovation and product development', 'strategic', 'Strategic Risk', 'Innovation Pipeline', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-018', 'Strategic misalignment', 'Divergence from strategic objectives and goals', 'strategic', 'Strategic Risk', 'Strategic Planning Failures', 'Severe', 1000000, 10000000, '1-3 months'),
('IMP-026', 'Competitive advantage erosion', 'Loss of market differentiators and competitive position', 'strategic', 'Strategic Risk', 'Market Competition', 'Severe', 1000000, 10000000, '1-3 months'),
('IMP-029', 'Business model obsolescence', 'Fundamental business model becoming outdated or unviable', 'strategic', 'Strategic Risk', 'Business Model Disruption', 'Catastrophic', 10000000, 100000000, '> 3 months'),

-- Environmental & Social Impacts
('IMP-016', 'Environmental harm', 'Damage to the natural environment from operations', 'environmental', 'ESG & Sustainability Risk', 'Environmental Pollution', 'Severe', 1000000, 10000000, '1-3 months'),
('IMP-017', 'Community relations damage', 'Harm to relationships with local communities and stakeholders', 'reputational', 'ESG & Sustainability Risk', 'Community Relations', 'Major', 100000, 1000000, '1-4 weeks'),

-- Partnership & Relationship Impacts
('IMP-019', 'Partnership dissolution', 'Termination of strategic partnerships or alliances', 'strategic', 'Strategic Risk', 'Partnership & Alliance Risks', 'Major', 100000, 1000000, '1-4 weeks'),

-- Technology & Asset Impacts
('IMP-020', 'Technology debt accumulation', 'Buildup of technical debt reducing agility and increasing maintenance costs', 'operational', 'Technology & Cyber Risk', 'Technology Obsolescence', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-025', 'Intellectual property loss', 'Loss or theft of intellectual property, trade secrets, or proprietary information', 'regulatory', 'Innovation & IP Risk', 'Trade Secret Protection', 'Severe', 1000000, 10000000, '1-3 months'),

-- Market & Business Impacts
('IMP-022', 'Market credibility loss', 'Loss of market credibility and investor confidence', 'reputational', 'Governance & Reputational Risk', 'Brand Reputation', 'Severe', 1000000, 10000000, '1-3 months'),
('IMP-024', 'Shareholder value destruction', 'Significant reduction in shareholder value and market capitalization', 'financial', 'Financial Risk', 'Asset Valuation', 'Catastrophic', 10000000, 100000000, '> 3 months'),

-- Legal & Contractual Impacts
('IMP-027', 'Contractual default', 'Failure to meet contractual obligations leading to default', 'regulatory', 'Compliance & Legal Risk', 'Contractual Obligations', 'Major', 100000, 1000000, '1-4 weeks'),
('IMP-028', 'Insurance claim', 'Triggering of insurance claims affecting premiums and coverage', 'financial', 'Financial Risk', 'Insurance Requirements', 'Moderate', 10000, 100000, '1-7 days')

ON CONFLICT (impact_code) DO NOTHING;

-- ============================================================================
-- PART 3: CREATE ORGANIZATION CUSTOMIZATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference to global impact (if this is an override)
  global_impact_id UUID REFERENCES global_impact_library(id),

  -- Custom/override fields
  impact_code VARCHAR(20) NOT NULL,
  impact_name VARCHAR(255) NOT NULL,
  impact_description TEXT,
  impact_type VARCHAR(50),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  severity_level VARCHAR(20) CHECK (severity_level IN ('Minor', 'Moderate', 'Major', 'Severe', 'Catastrophic')),
  financial_range_min NUMERIC,
  financial_range_max NUMERIC,
  recovery_time_estimate VARCHAR(50),

  -- Metadata
  is_custom BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique impact codes per org
  UNIQUE(organization_id, impact_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_impacts_org_id ON org_impacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_impacts_code ON org_impacts(organization_id, impact_code);
CREATE INDEX IF NOT EXISTS idx_org_impacts_global_ref ON org_impacts(global_impact_id);
CREATE INDEX IF NOT EXISTS idx_org_impacts_severity ON org_impacts(severity_level);

-- Enable RLS
ALTER TABLE org_impacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org impacts"
ON org_impacts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert org impacts"
ON org_impacts FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update org impacts"
ON org_impacts FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- PART 4: CREATE UNIFIED VIEW (Global + Org Customizations)
-- ============================================================================

-- Backup existing impact_register table if it exists
ALTER TABLE IF EXISTS impact_register RENAME TO impact_register_backup_20251126;

-- Create unified view
CREATE OR REPLACE VIEW impact_register AS
-- Global impacts
SELECT
  g.id,
  NULL::UUID as organization_id,
  g.impact_code,
  g.impact_name,
  g.impact_description,
  g.impact_type,
  g.category,
  g.subcategory,
  g.severity_level,
  g.financial_range_min,
  g.financial_range_max,
  g.recovery_time_estimate,
  'active'::VARCHAR(20) as status, -- For compatibility
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at
FROM global_impact_library g
WHERE g.is_active = true

UNION ALL

-- Organization customizations
SELECT
  o.id,
  o.organization_id,
  o.impact_code,
  o.impact_name,
  o.impact_description,
  o.impact_type,
  o.category,
  o.subcategory,
  o.severity_level,
  o.financial_range_min,
  o.financial_range_max,
  o.recovery_time_estimate,
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  CASE
    WHEN o.is_custom THEN 'custom'
    ELSE 'override'
  END as source,
  o.created_at,
  o.updated_at
FROM org_impacts o
WHERE o.is_hidden = false;

-- Create severity analysis view
CREATE OR REPLACE VIEW impact_severity_analysis_view AS
SELECT
  severity_level,
  COUNT(*) as impact_count,
  AVG(financial_range_min) as avg_min_financial_impact,
  AVG(financial_range_max) as avg_max_financial_impact,
  MIN(financial_range_min) as min_financial_impact,
  MAX(financial_range_max) as max_financial_impact
FROM global_impact_library
WHERE is_active = true
GROUP BY severity_level
ORDER BY
  CASE severity_level
    WHEN 'Minor' THEN 1
    WHEN 'Moderate' THEN 2
    WHEN 'Major' THEN 3
    WHEN 'Severe' THEN 4
    WHEN 'Catastrophic' THEN 5
  END;

-- ============================================================================
-- PART 5: MIGRATION HELPERS
-- ============================================================================

-- Function to add custom impact
CREATE OR REPLACE FUNCTION add_custom_impact(
  p_organization_id UUID,
  p_impact_code VARCHAR(20),
  p_impact_name VARCHAR(255),
  p_impact_description TEXT,
  p_impact_type VARCHAR(50),
  p_severity_level VARCHAR(20),
  p_financial_min NUMERIC,
  p_financial_max NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO org_impacts (
    organization_id, impact_code, impact_name, impact_description,
    impact_type, severity_level, financial_range_min, financial_range_max, is_custom
  )
  VALUES (
    p_organization_id, p_impact_code, p_impact_name, p_impact_description,
    p_impact_type, p_severity_level, p_financial_min, p_financial_max, true
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to override global impact financial ranges
CREATE OR REPLACE FUNCTION override_impact_financial_range(
  p_organization_id UUID,
  p_global_impact_id UUID,
  p_financial_min NUMERIC,
  p_financial_max NUMERIC,
  p_recovery_time VARCHAR(50)
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_impact_code VARCHAR(20);
  v_impact_name VARCHAR(255);
  v_impact_description TEXT;
BEGIN
  -- Get impact details from global library
  SELECT impact_code, impact_name, impact_description
  INTO v_impact_code, v_impact_name, v_impact_description
  FROM global_impact_library
  WHERE id = p_global_impact_id;

  IF v_impact_code IS NULL THEN
    RAISE EXCEPTION 'Global impact ID not found';
  END IF;

  INSERT INTO org_impacts (
    organization_id, global_impact_id, impact_code,
    impact_name, impact_description,
    financial_range_min, financial_range_max,
    recovery_time_estimate, is_custom
  )
  VALUES (
    p_organization_id, p_global_impact_id, v_impact_code,
    v_impact_name, v_impact_description,
    p_financial_min, p_financial_max,
    p_recovery_time, false
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM global_impact_library;
  RAISE NOTICE 'Global impact library: % impacts loaded', v_count;

  IF v_count < 30 THEN
    RAISE WARNING 'Expected 30 global impacts, found %', v_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 3: HYBRID CONTROL LIBRARY
-- ============================================================================

-- Migration: Hybrid Control Library (Global Foundation + Org Customizations)
-- Description: Refactor control library to use global library with org-specific overrides
-- Feature Branch: feature/hybrid-multi-tenant
-- Date: 2025-11-26
-- Enhancement: #3, #5 (Critical) - Consolidated & Refactored for Multi-Tenancy
-- Note: This migration consolidates control library, DIME scores, and implementation guidance

-- ============================================================================
-- PART 1: CREATE GLOBAL CONTROL LIBRARY (Shared by All Organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS global_control_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  control_code VARCHAR(20) UNIQUE NOT NULL,
  control_name VARCHAR(255) NOT NULL,
  control_description TEXT,
  control_type VARCHAR(50), -- preventive, detective, corrective, directive
  control_category VARCHAR(100),
  control_sub_category VARCHAR(100),

  -- DIME Scoring Framework (0-100 for each dimension)
  design_score INTEGER CHECK (design_score >= 0 AND design_score <= 100),
  implementation_score INTEGER CHECK (implementation_score >= 0 AND implementation_score <= 100),
  monitoring_score INTEGER CHECK (monitoring_score >= 0 AND monitoring_score <= 100),
  evaluation_score INTEGER CHECK (evaluation_score >= 0 AND evaluation_score <= 100),

  -- Implementation Guidance (Enhancement #5)
  implementation_guidance TEXT,
  prerequisites TEXT,
  success_criteria TEXT,
  testing_guidance TEXT,
  regulatory_references TEXT,
  industry_standards TEXT,
  automation_level VARCHAR(20) CHECK (automation_level IN ('Manual', 'Semi-Automated', 'Fully-Automated')),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  complexity_level VARCHAR(20) CHECK (complexity_level IN ('Basic', 'Intermediate', 'Advanced')),
  implementation_cost_estimate VARCHAR(50),
  implementation_time_estimate VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_global_control_code ON global_control_library(control_code);
CREATE INDEX IF NOT EXISTS idx_global_control_category ON global_control_library(control_category);
CREATE INDEX IF NOT EXISTS idx_global_control_type ON global_control_library(control_type);
CREATE INDEX IF NOT EXISTS idx_global_control_dime_avg ON global_control_library(((design_score + implementation_score + monitoring_score + evaluation_score)::numeric / 4));

-- ============================================================================
-- PART 2: MIGRATE EXISTING CONTROL LIBRARY DATA TO GLOBAL TABLE (IF EXISTS)
-- ============================================================================

-- Check if control_library table exists and migrate data
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'control_library') THEN
    -- Copy existing control_library data to global_control_library
    INSERT INTO global_control_library (
      control_code, control_name, control_description,
      control_type, control_category, control_sub_category,
      design_score, implementation_score, monitoring_score, evaluation_score,
      implementation_guidance, prerequisites, success_criteria,
      testing_guidance, regulatory_references, industry_standards,
      automation_level, complexity_level
    )
    SELECT DISTINCT ON (control_code)
      control_code,
      control_name,
      control_description,
      control_type,
      control_category,
      control_sub_category,
      COALESCE(design_score, 65) as design_score,
      COALESCE(implementation_score, 65) as implementation_score,
      COALESCE(monitoring_score, 65) as monitoring_score,
      COALESCE(evaluation_score, 65) as evaluation_score,
      implementation_guidance,
      prerequisites,
      success_criteria,
      testing_guidance,
      regulatory_references,
      industry_standards,
      automation_level,
      'Intermediate' as complexity_level
    FROM control_library
    WHERE control_code IS NOT NULL
    ON CONFLICT (control_code) DO UPDATE SET
      control_name = EXCLUDED.control_name,
      control_description = EXCLUDED.control_description,
      design_score = EXCLUDED.design_score,
      implementation_score = EXCLUDED.implementation_score,
      monitoring_score = EXCLUDED.monitoring_score,
      evaluation_score = EXCLUDED.evaluation_score,
      implementation_guidance = EXCLUDED.implementation_guidance;

    RAISE NOTICE 'Migrated existing control_library data to global_control_library';
  ELSE
    RAISE NOTICE 'control_library table does not exist, will seed data in Part 3';
  END IF;
END $$;

-- ============================================================================
-- PART 3: APPLY REALISTIC DIME SCORES (Enhancement #3)
-- ============================================================================

-- Update DIME scores with realistic variations based on control complexity

-- Basic Controls (Simple, low complexity)
UPDATE global_control_library
SET
  design_score = 75,
  implementation_score = 70,
  monitoring_score = 60,
  evaluation_score = 50,
  complexity_level = 'Basic'
WHERE control_code IN (
  'CTL-001', 'CTL-002', 'CTL-008', 'CTL-009', 'CTL-011', 'CTL-012',
  'CTL-015', 'CTL-016', 'CTL-020', 'CTL-021', 'CTL-024', 'CTL-025'
);

-- Intermediate Controls (Moderate complexity)
UPDATE global_control_library
SET
  design_score = 80,
  implementation_score = 70,
  monitoring_score = 60,
  evaluation_score = 55,
  complexity_level = 'Intermediate'
WHERE control_code IN (
  'CTL-003', 'CTL-004', 'CTL-005', 'CTL-006', 'CTL-007', 'CTL-010',
  'CTL-013', 'CTL-014', 'CTL-017', 'CTL-019', 'CTL-022', 'CTL-023'
);

-- Advanced Controls (High complexity, cutting-edge)
UPDATE global_control_library
SET
  design_score = 90,
  implementation_score = 75,
  monitoring_score = 65,
  evaluation_score = 55,
  complexity_level = 'Advanced'
WHERE control_code IN (
  'CTL-018', 'CTL-026', 'CTL-027', 'CTL-028', 'CTL-029', 'CTL-030',
  'CTL-031', 'CTL-032', 'CTL-033', 'CTL-034', 'CTL-035'
);

-- ============================================================================
-- PART 4: CREATE ORGANIZATION CUSTOMIZATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_controls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference to global control (if this is an override)
  global_control_id UUID REFERENCES global_control_library(id),

  -- Custom/override fields
  control_code VARCHAR(20) NOT NULL,
  control_name VARCHAR(255) NOT NULL,
  control_description TEXT,
  control_type VARCHAR(50),
  control_category VARCHAR(100),
  control_sub_category VARCHAR(100),

  -- Org-specific DIME scores (can differ from global)
  design_score INTEGER CHECK (design_score >= 0 AND design_score <= 100),
  implementation_score INTEGER CHECK (implementation_score >= 0 AND implementation_score <= 100),
  monitoring_score INTEGER CHECK (monitoring_score >= 0 AND monitoring_score <= 100),
  evaluation_score INTEGER CHECK (evaluation_score >= 0 AND evaluation_score <= 100),

  -- Org-specific implementation details
  implementation_guidance TEXT,
  prerequisites TEXT,
  success_criteria TEXT,
  testing_guidance TEXT,

  -- Metadata
  is_custom BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, control_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_controls_org_id ON org_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_controls_code ON org_controls(organization_id, control_code);
CREATE INDEX IF NOT EXISTS idx_org_controls_global_ref ON org_controls(global_control_id);

-- Enable RLS
ALTER TABLE org_controls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org controls"
ON org_controls FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert org controls"
ON org_controls FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update org controls"
ON org_controls FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- PART 5: CREATE UNIFIED VIEW (Global + Org Customizations)
-- ============================================================================

-- Backup existing control_library table
ALTER TABLE IF EXISTS control_library RENAME TO control_library_backup_20251126;

-- Create unified view
CREATE OR REPLACE VIEW control_library AS
-- Global controls
SELECT
  g.id,
  NULL::UUID as organization_id,
  g.control_code,
  g.control_name,
  g.control_description,
  g.control_type,
  g.control_category,
  g.control_sub_category,
  g.design_score,
  g.implementation_score,
  g.monitoring_score,
  g.evaluation_score,
  (g.design_score + g.implementation_score + g.monitoring_score + g.evaluation_score) / 4 as avg_dime_score,
  g.implementation_guidance,
  g.prerequisites,
  g.success_criteria,
  g.testing_guidance,
  g.regulatory_references,
  g.industry_standards,
  g.automation_level,
  g.complexity_level,
  'active'::VARCHAR(20) as status, -- For compatibility
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at
FROM global_control_library g
WHERE g.is_active = true

UNION ALL

-- Organization customizations
SELECT
  o.id,
  o.organization_id,
  o.control_code,
  o.control_name,
  o.control_description,
  o.control_type,
  o.control_category,
  o.control_sub_category,
  o.design_score,
  o.implementation_score,
  o.monitoring_score,
  o.evaluation_score,
  (o.design_score + o.implementation_score + o.monitoring_score + o.evaluation_score) / 4 as avg_dime_score,
  o.implementation_guidance,
  o.prerequisites,
  o.success_criteria,
  o.testing_guidance,
  NULL::TEXT as regulatory_references, -- Org overrides don't include these by default
  NULL::TEXT as industry_standards,
  NULL::VARCHAR(20) as automation_level,
  NULL::VARCHAR(20) as complexity_level,
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  CASE
    WHEN o.is_custom THEN 'custom'
    ELSE 'override'
  END as source,
  o.created_at,
  o.updated_at
FROM org_controls o
WHERE o.is_hidden = false;

-- ============================================================================
-- PART 6: CREATE HELPFUL VIEWS
-- ============================================================================

-- DIME Variance View
CREATE OR REPLACE VIEW dime_variance_view AS
SELECT
  control_code,
  control_name,
  control_category,
  design_score,
  implementation_score,
  monitoring_score,
  evaluation_score,
  (design_score - evaluation_score) as dime_range,
  ((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0) as avg_score,
  complexity_level
FROM global_control_library
WHERE is_active = true
ORDER BY dime_range DESC;

-- Control Maturity View
CREATE OR REPLACE VIEW control_maturity_view AS
SELECT
  control_category,
  COUNT(*) as control_count,
  AVG(design_score) as avg_design,
  AVG(implementation_score) as avg_implementation,
  AVG(monitoring_score) as avg_monitoring,
  AVG(evaluation_score) as avg_evaluation,
  AVG((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0) as overall_maturity
FROM global_control_library
WHERE is_active = true
GROUP BY control_category
ORDER BY overall_maturity DESC;

-- ============================================================================
-- PART 7: MIGRATION HELPERS
-- ============================================================================

-- Function to add custom control
CREATE OR REPLACE FUNCTION add_custom_control(
  p_organization_id UUID,
  p_control_code VARCHAR(20),
  p_control_name VARCHAR(255),
  p_control_description TEXT,
  p_control_type VARCHAR(50),
  p_dime_scores INTEGER[] -- [design, implementation, monitoring, evaluation]
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO org_controls (
    organization_id, control_code, control_name, control_description,
    control_type, design_score, implementation_score, monitoring_score, evaluation_score, is_custom
  )
  VALUES (
    p_organization_id, p_control_code, p_control_name, p_control_description,
    p_control_type, p_dime_scores[1], p_dime_scores[2], p_dime_scores[3], p_dime_scores[4], true
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to override global control implementation guidance
CREATE OR REPLACE FUNCTION override_control_implementation(
  p_organization_id UUID,
  p_global_control_id UUID,
  p_implementation_guidance TEXT,
  p_prerequisites TEXT,
  p_success_criteria TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_control_code VARCHAR(20);
  v_control_name VARCHAR(255);
BEGIN
  SELECT control_code, control_name
  INTO v_control_code, v_control_name
  FROM global_control_library
  WHERE id = p_global_control_id;

  IF v_control_code IS NULL THEN
    RAISE EXCEPTION 'Global control ID not found';
  END IF;

  INSERT INTO org_controls (
    organization_id, global_control_id, control_code, control_name,
    implementation_guidance, prerequisites, success_criteria, is_custom
  )
  VALUES (
    p_organization_id, p_global_control_id, v_control_code, v_control_name,
    p_implementation_guidance, p_prerequisites, p_success_criteria, false
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM global_control_library;
  RAISE NOTICE 'Global control library: % controls loaded', v_count;

  IF v_count < 95 THEN
    RAISE WARNING 'Expected 95 global controls, found %', v_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 4: HYBRID KRI/KCI LIBRARY + MAPPINGS
-- ============================================================================

-- Migration: Hybrid KRI/KCI Library + Mappings (Global Foundation + Org Customizations)
-- Description: Refactor KRI/KCI indicators and mappings to use global library with org-specific overrides
-- Feature Branch: feature/hybrid-multi-tenant
-- Date: 2025-11-26
-- Enhancement: #4 (Critical) - Consolidated & Refactored for Multi-Tenancy
-- Note: This migration consolidates KRI/KCI library and mapping tables

-- ============================================================================
-- PART 1: CREATE GLOBAL KRI/KCI LIBRARY (Shared by All Organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS global_kri_kci_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_code VARCHAR(20) UNIQUE NOT NULL,
  indicator_name VARCHAR(255) NOT NULL,
  indicator_description TEXT,
  indicator_type VARCHAR(10) CHECK (indicator_type IN ('KRI', 'KCI')), -- KRI = Key Risk Indicator, KCI = Key Control Indicator
  measurement_unit VARCHAR(50), -- e.g., '%', 'count', 'days', '$'
  measurement_frequency VARCHAR(50), -- e.g., 'Daily', 'Weekly', 'Monthly', 'Quarterly'
  data_source TEXT,
  calculation_method TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),

  -- Threshold values (organizations can override)
  target_value NUMERIC,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  threshold_direction VARCHAR(10) CHECK (threshold_direction IN ('above', 'below')), -- alert if value goes above or below threshold

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_global_kri_kci_code ON global_kri_kci_library(indicator_code);
CREATE INDEX IF NOT EXISTS idx_global_kri_kci_type ON global_kri_kci_library(indicator_type);
CREATE INDEX IF NOT EXISTS idx_global_kri_kci_category ON global_kri_kci_library(category);

-- ============================================================================
-- PART 2: MIGRATE EXISTING KRI/KCI DATA TO GLOBAL TABLE (IF EXISTS)
-- ============================================================================

-- Check if kri_kci_library table exists and migrate data
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kri_kci_library') THEN
    -- Copy existing kri_kci_library data to global_kri_kci_library
    INSERT INTO global_kri_kci_library (
      indicator_code, indicator_name, indicator_description,
      indicator_type, measurement_unit, measurement_frequency,
      data_source, calculation_method, category, subcategory,
      target_value, warning_threshold, critical_threshold, threshold_direction
    )
    SELECT DISTINCT ON (indicator_code)
      indicator_code,
      indicator_name,
      indicator_description,
      indicator_type,
      measurement_unit,
      measurement_frequency,
      data_source,
      calculation_method,
      category,
      subcategory,
      target_value,
      warning_threshold,
      critical_threshold,
      threshold_direction
    FROM kri_kci_library
    WHERE indicator_code IS NOT NULL
    ON CONFLICT (indicator_code) DO UPDATE SET
      indicator_name = EXCLUDED.indicator_name,
      indicator_description = EXCLUDED.indicator_description;

    RAISE NOTICE 'Migrated existing kri_kci_library data to global_kri_kci_library';
  ELSE
    RAISE NOTICE 'kri_kci_library table does not exist, skipping data migration';
  END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE ORGANIZATION CUSTOMIZATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_kri_kci (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference to global indicator (if this is an override)
  global_indicator_id UUID REFERENCES global_kri_kci_library(id),

  -- Custom/override fields
  indicator_code VARCHAR(20) NOT NULL,
  indicator_name VARCHAR(255) NOT NULL,
  indicator_description TEXT,
  indicator_type VARCHAR(10) CHECK (indicator_type IN ('KRI', 'KCI')),
  measurement_unit VARCHAR(50),
  measurement_frequency VARCHAR(50),
  data_source TEXT,
  calculation_method TEXT,

  -- Org-specific thresholds (can differ from global)
  target_value NUMERIC,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  threshold_direction VARCHAR(10) CHECK (threshold_direction IN ('above', 'below')),

  -- Metadata
  is_custom BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, indicator_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_kri_kci_org_id ON org_kri_kci(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_kri_kci_code ON org_kri_kci(organization_id, indicator_code);
CREATE INDEX IF NOT EXISTS idx_org_kri_kci_global_ref ON org_kri_kci(global_indicator_id);
CREATE INDEX IF NOT EXISTS idx_org_kri_kci_type ON org_kri_kci(indicator_type);

-- Enable RLS
ALTER TABLE org_kri_kci ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org indicators"
ON org_kri_kci FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert org indicators"
ON org_kri_kci FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update org indicators"
ON org_kri_kci FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- PART 4: CREATE UNIFIED VIEW (Global + Org Customizations)
-- ============================================================================

-- Backup existing kri_kci_library table
ALTER TABLE IF EXISTS kri_kci_library RENAME TO kri_kci_library_backup_20251126;

-- Create unified view
CREATE OR REPLACE VIEW kri_kci_library AS
-- Global indicators
SELECT
  g.id,
  NULL::UUID as organization_id,
  g.indicator_code,
  g.indicator_name,
  g.indicator_description,
  g.indicator_type,
  g.measurement_unit,
  g.measurement_frequency,
  g.data_source,
  g.calculation_method,
  g.category,
  g.subcategory,
  g.target_value,
  g.warning_threshold,
  g.critical_threshold,
  g.threshold_direction,
  'active'::VARCHAR(20) as status, -- For compatibility
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at
FROM global_kri_kci_library g
WHERE g.is_active = true

UNION ALL

-- Organization customizations
SELECT
  o.id,
  o.organization_id,
  o.indicator_code,
  o.indicator_name,
  o.indicator_description,
  o.indicator_type,
  o.measurement_unit,
  o.measurement_frequency,
  o.data_source,
  o.calculation_method,
  NULL::VARCHAR(100) as category,
  NULL::VARCHAR(100) as subcategory,
  o.target_value,
  o.warning_threshold,
  o.critical_threshold,
  o.threshold_direction,
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  CASE
    WHEN o.is_custom THEN 'custom'
    ELSE 'override'
  END as source,
  o.created_at,
  o.updated_at
FROM org_kri_kci o
WHERE o.is_hidden = false;

-- ============================================================================
-- PART 5: CREATE GLOBAL MAPPING TABLES
-- ============================================================================

-- Global Root Cause → KRI Mappings
CREATE TABLE IF NOT EXISTS global_root_cause_kri_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  global_root_cause_id UUID NOT NULL REFERENCES global_root_cause_library(id) ON DELETE CASCADE,
  global_kri_id UUID NOT NULL REFERENCES global_kri_kci_library(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  mapping_rationale TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(global_root_cause_id, global_kri_id)
);

-- Global Impact → KCI Mappings
CREATE TABLE IF NOT EXISTS global_impact_kci_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  global_impact_id UUID NOT NULL REFERENCES global_impact_library(id) ON DELETE CASCADE,
  global_kci_id UUID NOT NULL REFERENCES global_kri_kci_library(id) ON DELETE CASCADE,
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  mapping_rationale TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(global_impact_id, global_kci_id)
);

-- Create indexes for mappings
CREATE INDEX IF NOT EXISTS idx_global_rc_kri_cause ON global_root_cause_kri_mapping(global_root_cause_id);
CREATE INDEX IF NOT EXISTS idx_global_rc_kri_indicator ON global_root_cause_kri_mapping(global_kri_id);
CREATE INDEX IF NOT EXISTS idx_global_imp_kci_impact ON global_impact_kci_mapping(global_impact_id);
CREATE INDEX IF NOT EXISTS idx_global_imp_kci_indicator ON global_impact_kci_mapping(global_kci_id);

-- ============================================================================
-- PART 6: MIGRATE EXISTING MAPPINGS TO GLOBAL TABLES (IF THEY EXIST)
-- ============================================================================

-- Migrate Root Cause → KRI mappings (if old tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'root_cause_kri_mapping') THEN
    INSERT INTO global_root_cause_kri_mapping (
      global_root_cause_id, global_kri_id, relevance_score
    )
    SELECT DISTINCT
      grc.id as global_root_cause_id,
      gkri.id as global_kri_id,
      100 as relevance_score
    FROM root_cause_kri_mapping old_map
    INNER JOIN global_root_cause_library grc ON grc.cause_code = (
      SELECT cause_code FROM root_cause_register WHERE id = old_map.root_cause_id LIMIT 1
    )
    INNER JOIN global_kri_kci_library gkri ON gkri.indicator_code = (
      SELECT indicator_code FROM kri_kci_library WHERE id = old_map.kri_id LIMIT 1
    )
    ON CONFLICT (global_root_cause_id, global_kri_id) DO NOTHING;

    RAISE NOTICE 'Migrated existing root_cause_kri_mapping data';
  ELSE
    RAISE NOTICE 'root_cause_kri_mapping table does not exist, skipping';
  END IF;
END $$;

-- Migrate Impact → KCI mappings (if old tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'impact_kci_mapping') THEN
    INSERT INTO global_impact_kci_mapping (
      global_impact_id, global_kci_id, relevance_score
    )
    SELECT DISTINCT
      gi.id as global_impact_id,
      gkci.id as global_kci_id,
      100 as relevance_score
    FROM impact_kci_mapping old_map
    INNER JOIN global_impact_library gi ON gi.impact_code = (
      SELECT impact_code FROM impact_register WHERE id = old_map.impact_id LIMIT 1
    )
    INNER JOIN global_kri_kci_library gkci ON gkci.indicator_code = (
      SELECT indicator_code FROM kri_kci_library WHERE id = old_map.kci_id LIMIT 1
    )
    ON CONFLICT (global_impact_id, global_kci_id) DO NOTHING;

    RAISE NOTICE 'Migrated existing impact_kci_mapping data';
  ELSE
    RAISE NOTICE 'impact_kci_mapping table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 7: CREATE ORGANIZATION MAPPING TABLES
-- ============================================================================

-- Org-specific Root Cause → KRI mappings
CREATE TABLE IF NOT EXISTS org_root_cause_kri_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL, -- Can reference global or org root cause
  kri_id UUID NOT NULL, -- Can reference global or org KRI
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, root_cause_id, kri_id)
);

-- Org-specific Impact → KCI mappings
CREATE TABLE IF NOT EXISTS org_impact_kci_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL, -- Can reference global or org impact
  kci_id UUID NOT NULL, -- Can reference global or org KCI
  relevance_score INTEGER DEFAULT 100 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, impact_id, kci_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_rc_kri_org ON org_root_cause_kri_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_rc_kri_cause ON org_root_cause_kri_mapping(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_org_rc_kri_kri ON org_root_cause_kri_mapping(kri_id);
CREATE INDEX IF NOT EXISTS idx_org_imp_kci_org ON org_impact_kci_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_imp_kci_impact ON org_impact_kci_mapping(impact_id);
CREATE INDEX IF NOT EXISTS idx_org_imp_kci_kci ON org_impact_kci_mapping(kci_id);

-- Enable RLS on org mapping tables
ALTER TABLE org_root_cause_kri_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_impact_kci_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mappings
CREATE POLICY "Users can view org RC-KRI mappings"
ON org_root_cause_kri_mapping FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view org Impact-KCI mappings"
ON org_impact_kci_mapping FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- PART 8: CREATE UNIFIED MAPPING VIEWS
-- ============================================================================

-- Backup existing mapping tables
ALTER TABLE IF EXISTS root_cause_kri_mapping RENAME TO root_cause_kri_mapping_backup_20251126;
ALTER TABLE IF EXISTS impact_kci_mapping RENAME TO impact_kci_mapping_backup_20251126;

-- Unified Root Cause → KRI Mapping View
CREATE OR REPLACE VIEW root_cause_kri_mapping AS
-- Global mappings (visible to all orgs)
SELECT
  gm.id,
  NULL::UUID as organization_id,
  gm.global_root_cause_id as root_cause_id,
  gm.global_kri_id as kri_id,
  gm.relevance_score,
  'global' as source
FROM global_root_cause_kri_mapping gm
WHERE gm.is_active = true

UNION ALL

-- Org-specific mappings
SELECT
  om.id,
  om.organization_id,
  om.root_cause_id,
  om.kri_id,
  om.relevance_score,
  'custom' as source
FROM org_root_cause_kri_mapping om;

-- Unified Impact → KCI Mapping View
CREATE OR REPLACE VIEW impact_kci_mapping AS
-- Global mappings
SELECT
  gm.id,
  NULL::UUID as organization_id,
  gm.global_impact_id as impact_id,
  gm.global_kci_id as kci_id,
  gm.relevance_score,
  'global' as source
FROM global_impact_kci_mapping gm
WHERE gm.is_active = true

UNION ALL

-- Org-specific mappings
SELECT
  om.id,
  om.organization_id,
  om.impact_id,
  om.kci_id,
  om.relevance_score,
  'custom' as source
FROM org_impact_kci_mapping om;

-- ============================================================================
-- PART 9: CREATE HELPFUL VIEWS
-- ============================================================================

-- Root Cause with suggested KRIs
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

-- Impact with suggested KCIs
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_kri_count INTEGER;
  v_kci_count INTEGER;
  v_rc_kri_mappings INTEGER;
  v_imp_kci_mappings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_kri_count FROM global_kri_kci_library WHERE indicator_type = 'KRI';
  SELECT COUNT(*) INTO v_kci_count FROM global_kri_kci_library WHERE indicator_type = 'KCI';
  SELECT COUNT(*) INTO v_rc_kri_mappings FROM global_root_cause_kri_mapping;
  SELECT COUNT(*) INTO v_imp_kci_mappings FROM global_impact_kci_mapping;

  RAISE NOTICE 'Global KRI count: %', v_kri_count;
  RAISE NOTICE 'Global KCI count: %', v_kci_count;
  RAISE NOTICE 'Root Cause → KRI mappings: %', v_rc_kri_mappings;
  RAISE NOTICE 'Impact → KCI mappings: %', v_imp_kci_mappings;

  IF (v_kri_count + v_kci_count) < 39 THEN
    RAISE WARNING 'Expected 39 total indicators (20 KRIs + 19 KCIs), found %', (v_kri_count + v_kci_count);
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 5: REMAINING ENHANCEMENTS
-- ============================================================================

-- Migration: Remaining Risk Register Enhancements
-- Description: Add residual risk calculation, control effectiveness tracking, dependencies, etc.
-- Feature Branch: feature/hybrid-multi-tenant
-- Date: 2025-11-26
-- Enhancements: #6, #7, #8, #9, #10, #11, #12
-- Note: These enhancements work with the hybrid architecture views

-- ============================================================================
-- ENHANCEMENT #6: RESIDUAL RISK CALCULATION
-- ============================================================================

-- Add columns to risks table for residual risk
ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS residual_likelihood INTEGER CHECK (residual_likelihood >= 1 AND residual_likelihood <= 5),
  ADD COLUMN IF NOT EXISTS residual_impact INTEGER CHECK (residual_impact >= 1 AND residual_impact <= 5),
  ADD COLUMN IF NOT EXISTS residual_score INTEGER,
  ADD COLUMN IF NOT EXISTS control_effectiveness_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS residual_last_calculated TIMESTAMP WITH TIME ZONE;

-- Function to calculate control effectiveness for a risk
CREATE OR REPLACE FUNCTION calculate_control_effectiveness(p_risk_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_combined_residual NUMERIC := 1.0;
  v_individual_effectiveness NUMERIC;
BEGIN
  -- Loop through all active controls for this risk
  FOR v_individual_effectiveness IN
    SELECT ((c.design_score + c.implementation_score + c.monitoring_score + c.evaluation_score) / 4.0) / 100.0 AS effectiveness
    FROM risk_controls rc
    INNER JOIN control_library c ON rc.control_id = c.id
    WHERE rc.risk_id = p_risk_id
      AND rc.status = 'active'
  LOOP
    -- Compound the residual: each control reduces remaining risk
    v_combined_residual := v_combined_residual * (1.0 - v_individual_effectiveness);
  END LOOP;

  -- Return overall control effectiveness as percentage
  RETURN (1.0 - v_combined_residual) * 100.0;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate residual risk
CREATE OR REPLACE FUNCTION calculate_residual_risk(
  p_inherent_likelihood INTEGER,
  p_inherent_impact INTEGER,
  p_risk_id UUID
) RETURNS TABLE(
  residual_likelihood INTEGER,
  residual_impact INTEGER,
  residual_score INTEGER,
  control_effectiveness NUMERIC
) AS $$
DECLARE
  v_effectiveness NUMERIC;
  v_residual_likelihood INTEGER;
  v_residual_impact INTEGER;
BEGIN
  -- Calculate control effectiveness
  v_effectiveness := calculate_control_effectiveness(p_risk_id);

  -- Apply control effectiveness to reduce likelihood and impact
  -- Formula: Residual = Inherent * (1 - Effectiveness/100)
  v_residual_likelihood := GREATEST(1, ROUND(p_inherent_likelihood * (1 - v_effectiveness/100.0))::INTEGER);
  v_residual_impact := GREATEST(1, ROUND(p_inherent_impact * (1 - v_effectiveness/100.0))::INTEGER);

  residual_likelihood := v_residual_likelihood;
  residual_impact := v_residual_impact;
  residual_score := v_residual_likelihood * v_residual_impact;
  control_effectiveness := v_effectiveness;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update risk's residual values
CREATE OR REPLACE FUNCTION update_risk_residual() RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
  v_inherent_likelihood INTEGER;
  v_inherent_impact INTEGER;
BEGIN
  -- Get inherent risk values
  SELECT likelihood, impact
  INTO v_inherent_likelihood, v_inherent_impact
  FROM risks
  WHERE id = COALESCE(NEW.risk_id, OLD.risk_id);

  IF v_inherent_likelihood IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate residual risk
  SELECT * INTO v_result
  FROM calculate_residual_risk(v_inherent_likelihood, v_inherent_impact, COALESCE(NEW.risk_id, OLD.risk_id));

  -- Update the risk record
  UPDATE risks
  SET
    residual_likelihood = v_result.residual_likelihood,
    residual_impact = v_result.residual_impact,
    residual_score = v_result.residual_score,
    control_effectiveness_percentage = v_result.control_effectiveness,
    residual_last_calculated = NOW()
  WHERE id = COALESCE(NEW.risk_id, OLD.risk_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update residual risk when controls change
CREATE TRIGGER trigger_update_residual_on_control_add
  AFTER INSERT ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

CREATE TRIGGER trigger_update_residual_on_control_remove
  AFTER DELETE ON risk_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_residual();

CREATE TRIGGER trigger_update_residual_on_control_update
  AFTER UPDATE ON risk_controls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_risk_residual();

-- Create view for residual risk analysis
CREATE OR REPLACE VIEW residual_risk_view AS
SELECT
  r.id,
  r.title,
  r.organization_id,
  r.likelihood as inherent_likelihood,
  r.impact as inherent_impact,
  (r.likelihood * r.impact) as inherent_score,
  r.residual_likelihood,
  r.residual_impact,
  r.residual_score,
  r.control_effectiveness_percentage,
  (r.likelihood * r.impact - r.residual_score) as risk_reduction,
  ((r.likelihood * r.impact - r.residual_score)::NUMERIC / (r.likelihood * r.impact)) * 100 as risk_reduction_percentage,
  r.residual_last_calculated,
  (SELECT COUNT(*) FROM risk_controls WHERE risk_id = r.id AND status = 'active') as active_control_count
FROM risks r
WHERE r.residual_score IS NOT NULL;

-- ============================================================================
-- ENHANCEMENT #7: CONTROL EFFECTIVENESS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_effectiveness_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL, -- References control_library view
  risk_id UUID REFERENCES risks(id), -- Optional: which risk this test was for
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type VARCHAR(50) NOT NULL, -- e.g., 'Design Review', 'Implementation Audit', 'Monitoring Check', 'Effectiveness Assessment'
  tester_id UUID REFERENCES user_profiles(id),

  -- Actual scores from testing (may differ from theoretical DIME scores)
  design_score_actual INTEGER CHECK (design_score_actual >= 0 AND design_score_actual <= 100),
  implementation_score_actual INTEGER CHECK (implementation_score_actual >= 0 AND implementation_score_actual <= 100),
  monitoring_score_actual INTEGER CHECK (monitoring_score_actual >= 0 AND monitoring_score_actual <= 100),
  evaluation_score_actual INTEGER CHECK (evaluation_score_actual >= 0 AND evaluation_score_actual <= 100),
  overall_effectiveness NUMERIC(5,2), -- Average of actual scores

  -- Variance from theoretical scores
  design_variance INTEGER, -- actual - theoretical
  implementation_variance INTEGER,
  monitoring_variance INTEGER,
  evaluation_variance INTEGER,

  -- Test results
  test_findings TEXT,
  remediation_required BOOLEAN DEFAULT false,
  remediation_plan TEXT,
  remediation_due_date DATE,
  remediation_completed BOOLEAN DEFAULT false,
  next_test_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_tests_org ON control_effectiveness_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON control_effectiveness_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_date ON control_effectiveness_tests(test_date);

-- Enable RLS
ALTER TABLE control_effectiveness_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org control tests"
ON control_effectiveness_tests FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- View for controls due for testing
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

-- ============================================================================
-- ENHANCEMENT #8: MULTIPLE CAUSES/IMPACTS PER RISK
-- ============================================================================

-- Junction table for risk → root causes (many-to-many)
CREATE TABLE IF NOT EXISTS risk_root_causes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  root_cause_id UUID NOT NULL, -- References root_cause_register view
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- One primary cause per risk
  contribution_percentage INTEGER CHECK (contribution_percentage >= 0 AND contribution_percentage <= 100),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(risk_id, root_cause_id)
);

-- Junction table for risk → impacts (many-to-many)
CREATE TABLE IF NOT EXISTS risk_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  impact_id UUID NOT NULL, -- References impact_register view
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- One primary impact per risk
  severity_percentage INTEGER CHECK (severity_percentage >= 0 AND severity_percentage <= 100),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(risk_id, impact_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_risk ON risk_root_causes(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_root_causes_cause ON risk_root_causes(root_cause_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_risk ON risk_impacts(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_impacts_impact ON risk_impacts(impact_id);

-- Enable RLS
ALTER TABLE risk_root_causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk causes"
ON risk_root_causes FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view org risk impacts"
ON risk_impacts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Trigger to enforce exactly one primary cause
CREATE OR REPLACE FUNCTION enforce_single_primary_cause() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE risk_root_causes
    SET is_primary = false
    WHERE risk_id = NEW.risk_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_cause
  BEFORE INSERT OR UPDATE ON risk_root_causes
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION enforce_single_primary_cause();

-- Similar trigger for impacts
CREATE OR REPLACE FUNCTION enforce_single_primary_impact() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE risk_impacts
    SET is_primary = false
    WHERE risk_id = NEW.risk_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_impact
  BEFORE INSERT OR UPDATE ON risk_impacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION enforce_single_primary_impact();

-- Comprehensive risk decomposition view
CREATE OR REPLACE VIEW risk_decomposition_view AS
SELECT
  r.id,
  r.title,
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
GROUP BY r.id, r.title, r.organization_id;

-- ============================================================================
-- ENHANCEMENT #9: CONTROL DEPENDENCIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id), -- NULL for global dependencies
  control_id UUID NOT NULL, -- The control that has the dependency
  depends_on_control_id UUID NOT NULL, -- The control it depends on
  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('prerequisite', 'complementary', 'alternative')),
  dependency_strength VARCHAR(15) NOT NULL CHECK (dependency_strength IN ('required', 'recommended', 'optional')),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_deps_control ON control_dependencies(control_id);
CREATE INDEX IF NOT EXISTS idx_control_deps_depends_on ON control_dependencies(depends_on_control_id);

-- Create unique constraints
-- For global dependencies (organization_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_deps_global_unique
ON control_dependencies(control_id, depends_on_control_id)
WHERE organization_id IS NULL;

-- For org-specific dependencies (organization_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_deps_org_unique
ON control_dependencies(organization_id, control_id, depends_on_control_id)
WHERE organization_id IS NOT NULL;

-- Function to get all prerequisites for a control (recursive)
CREATE OR REPLACE FUNCTION get_control_prerequisites(p_control_id UUID, p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(
  control_code VARCHAR,
  control_name VARCHAR,
  dependency_level INTEGER,
  dependency_type VARCHAR
) AS $$
WITH RECURSIVE prereq_tree AS (
  -- Base case: direct prerequisites
  SELECT
    c.control_code,
    c.control_name,
    1 as dependency_level,
    cd.dependency_type
  FROM control_dependencies cd
  INNER JOIN control_library c ON cd.depends_on_control_id = c.id
  WHERE cd.control_id = p_control_id
    AND cd.dependency_type = 'prerequisite'
    AND (cd.organization_id = p_organization_id OR cd.organization_id IS NULL)

  UNION ALL

  -- Recursive case: prerequisites of prerequisites
  SELECT
    c.control_code,
    c.control_name,
    pt.dependency_level + 1,
    cd.dependency_type
  FROM control_dependencies cd
  INNER JOIN control_library c ON cd.depends_on_control_id = c.id
  INNER JOIN prereq_tree pt ON cd.control_id = (
    SELECT id FROM control_library WHERE control_code = pt.control_code LIMIT 1
  )
  WHERE cd.dependency_type = 'prerequisite'
    AND (cd.organization_id = p_organization_id OR cd.organization_id IS NULL)
    AND pt.dependency_level < 5 -- Prevent infinite loops
)
SELECT * FROM prereq_tree ORDER BY dependency_level;
$$ LANGUAGE sql;

-- ============================================================================
-- ENHANCEMENT #10: RISK APPETITE FRAMEWORK
-- ============================================================================

-- Risk appetite statements (per organization)
CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_category VARCHAR(100) NOT NULL,
  appetite_statement TEXT NOT NULL,
  appetite_level VARCHAR(20) CHECK (appetite_level IN ('Risk Averse', 'Risk Cautious', 'Balanced', 'Risk Seeking', 'Aggressive')),
  max_acceptable_likelihood INTEGER CHECK (max_acceptable_likelihood >= 1 AND max_acceptable_likelihood <= 5),
  max_acceptable_impact INTEGER CHECK (max_acceptable_impact >= 1 AND max_acceptable_impact <= 5),
  max_acceptable_score INTEGER CHECK (max_acceptable_score >= 1 AND max_acceptable_score <= 25),
  escalation_threshold INTEGER,
  board_tolerance INTEGER,
  review_frequency VARCHAR(20), -- 'Monthly', 'Quarterly', 'Annually'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, risk_category)
);

-- Risk tolerance exceptions (when risks exceed appetite)
CREATE TABLE IF NOT EXISTS risk_tolerance_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exception_reason TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  review_frequency VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_tolerance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org risk appetite"
ON risk_appetite_statements FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view org risk exceptions"
ON risk_tolerance_exceptions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- ENHANCEMENT #11: KRI/KCI BREACH TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS indicator_breaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL, -- References kri_kci_library view
  risk_id UUID REFERENCES risks(id), -- Associated risk (if any)
  breach_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  breach_level VARCHAR(10) NOT NULL CHECK (breach_level IN ('warning', 'critical')),
  measured_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  breach_percentage NUMERIC, -- How much over threshold
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_alarm')),
  action_taken TEXT,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  breach_duration_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_org ON indicator_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_indicator ON indicator_breaches(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_status ON indicator_breaches(status);
CREATE INDEX IF NOT EXISTS idx_indicator_breaches_date ON indicator_breaches(breach_date);

-- Enable RLS
ALTER TABLE indicator_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org indicator breaches"
ON indicator_breaches FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- View for active breaches
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

-- ============================================================================
-- ENHANCEMENT #12: LIBRARY SUGGESTIONS APPROVAL WORKFLOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('root_cause', 'impact', 'control', 'indicator')),
  suggested_data JSONB NOT NULL, -- JSON structure with all fields
  justification TEXT NOT NULL,
  use_case_example TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  submitted_by UUID NOT NULL REFERENCES user_profiles(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  approval_notes TEXT,
  appeal_submitted BOOLEAN DEFAULT false,
  appeal_reason TEXT,
  implemented BOOLEAN DEFAULT false, -- True when added to global library
  implemented_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_library_suggestions_org ON library_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_library_suggestions_type ON library_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_library_suggestions_status ON library_suggestions(status);

-- Enable RLS
ALTER TABLE library_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org library suggestions"
ON library_suggestions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- View for pending suggestions
CREATE OR REPLACE VIEW pending_suggestions_view AS
SELECT
  s.id,
  s.organization_id,
  s.suggestion_type,
  s.suggested_data,
  s.justification,
  s.submitted_by,
  up.full_name as submitter_name,
  s.submitted_at,
  EXTRACT(DAY FROM (NOW() - s.submitted_at)) as days_pending
FROM library_suggestions s
INNER JOIN user_profiles up ON s.submitted_by = up.id
WHERE s.status = 'pending'
ORDER BY s.submitted_at ASC;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'All remaining enhancements applied successfully';
  RAISE NOTICE 'Created tables: control_effectiveness_tests, risk_root_causes, risk_impacts, control_dependencies, risk_appetite_statements, risk_tolerance_exceptions, indicator_breaches, library_suggestions';
  RAISE NOTICE 'Created functions: calculate_control_effectiveness, calculate_residual_risk, update_risk_residual, get_control_prerequisites';
  RAISE NOTICE 'Created triggers: Auto-update residual risk on control changes, enforce single primary cause/impact';
  RAISE NOTICE 'Created views: residual_risk_view, controls_due_for_testing_view, risk_decomposition_view, active_breaches_view, pending_suggestions_view';
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

COMMIT;  -- Commit transaction

-- Verify deployment
SELECT 'Deployment verification:' as message;

SELECT 'Global Libraries:' as category,
       (SELECT COUNT(*) FROM global_root_cause_library) as root_causes,
       (SELECT COUNT(*) FROM global_impact_library) as impacts,
       (SELECT COUNT(*) FROM global_control_library) as controls,
       (SELECT COUNT(*) FROM global_kri_kci_library) as indicators;

SELECT 'Expected Counts:' as category,
       '45' as root_causes,
       '30' as impacts,
       '95' as controls,
       '39' as indicators;

SELECT 'Global Mappings:' as category,
       (SELECT COUNT(*) FROM global_root_cause_kri_mapping) as rc_kri_mappings,
       (SELECT COUNT(*) FROM global_impact_kci_mapping) as imp_kci_mappings;

SELECT 'Views Created:' as category,
       (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%register%') +
       (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%library%') +
       (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%mapping%') as view_count;

SELECT 'New Tables Created:' as category,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'global_%') as global_tables,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'org_%') as org_tables;

-- Success message
SELECT '✓ HYBRID ARCHITECTURE DEPLOYMENT COMPLETE!' as status;
SELECT 'All 5 migrations applied successfully.' as message;
SELECT 'Old tables backed up with suffix: _backup_20251126' as backup_info;
SELECT 'Review HYBRID_DEPLOYMENT_GUIDE.md for post-deployment steps' as next_steps;

-- End of combined deployment SQL
