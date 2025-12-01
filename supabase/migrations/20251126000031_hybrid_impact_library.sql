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
