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
  control_name VARCHAR(200) NOT NULL,
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
      NULL as control_category,
      NULL as control_sub_category,
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
  control_name VARCHAR(200) NOT NULL,
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
DROP TABLE IF EXISTS control_library_backup_20251126;
DROP VIEW IF EXISTS control_library_backup_20251126;
-- Rename table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'control_library') THEN
    ALTER TABLE control_library RENAME TO control_library_backup_20251126;
  END IF;
END $$;
-- Force drop view if it exists (in case it was a view not a table)
DROP VIEW IF EXISTS control_library CASCADE;

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
DROP VIEW IF EXISTS dime_variance_view;
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
DROP VIEW IF EXISTS control_maturity_view;
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

-- Control Implementation Readiness View
DROP VIEW IF EXISTS control_implementation_readiness_view;
CREATE OR REPLACE VIEW control_implementation_readiness_view AS
SELECT
  automation_level,
  complexity_level,
  COUNT(*) as control_count,
  ROUND(AVG((design_score + implementation_score + monitoring_score + evaluation_score) / 4.0), 1) as avg_dime,
  ARRAY_AGG(control_code ORDER BY control_code) as control_codes
FROM control_library
WHERE organization_id = '11111111-1111-1111-1111-111111111111' AND status = 'active'
GROUP BY automation_level, complexity_level
ORDER BY
  CASE automation_level
    WHEN 'Fully-Automated' THEN 1
    WHEN 'Semi-Automated' THEN 2
    WHEN 'Manual' THEN 3
  END,
  CASE complexity_level
    WHEN 'Basic' THEN 1
    WHEN 'Intermediate' THEN 2
    WHEN 'Advanced' THEN 3
  END;

-- ============================================================================
-- PART 7: MIGRATION HELPERS
-- ============================================================================

-- Function to add custom control
CREATE OR REPLACE FUNCTION add_custom_control(
  p_organization_id UUID,
  p_control_code VARCHAR(20),
  p_control_name VARCHAR(200),
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
  v_control_name VARCHAR(200);
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
