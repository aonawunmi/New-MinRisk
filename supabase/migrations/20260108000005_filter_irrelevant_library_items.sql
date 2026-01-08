-- Migration: Filter Irrelevant Library Items
-- Description: Add industry_tags and is_universal to global libraries to allow filtering irrelevant items by industry.
-- Date: 2026-01-08

-- 1. Add columns to global tables
ALTER TABLE global_root_cause_library
ADD COLUMN IF NOT EXISTS industry_tags TEXT[],
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT false;

ALTER TABLE global_impact_library
ADD COLUMN IF NOT EXISTS industry_tags TEXT[],
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT false;

ALTER TABLE global_control_library
ADD COLUMN IF NOT EXISTS industry_tags TEXT[],
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT false;

ALTER TABLE global_kri_kci_library
ADD COLUMN IF NOT EXISTS industry_tags TEXT[],
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT false;

-- 2. Update Views to expose new columns

-- A. Root Cause Register
DROP VIEW IF EXISTS root_cause_register CASCADE;

CREATE OR REPLACE VIEW root_cause_register AS
-- Global causes
SELECT
  g.id,
  NULL::UUID as organization_id,
  g.cause_code,
  g.cause_name,
  g.cause_description,
  g.category,
  g.subcategory,
  g.parent_cause_id,
  g.severity_indicator,
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at,
  g.industry_tags,
  g.is_universal
FROM global_root_cause_library g
WHERE g.is_active = true

UNION ALL

-- Organization customizations
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
  o.updated_at,
  NULL::TEXT[] as industry_tags, -- Org items are relevant to the org
  true as is_universal -- Treat as universal/always relevant for the org
FROM org_root_causes o
WHERE o.is_hidden = false;


-- B. Impact Register
DROP VIEW IF EXISTS impact_register CASCADE;

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
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at,
  g.industry_tags,
  g.is_universal
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
  o.updated_at,
  NULL::TEXT[] as industry_tags,
  true as is_universal
FROM org_impacts o
WHERE o.is_hidden = false;


-- C. Control Library
DROP VIEW IF EXISTS control_library CASCADE;

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
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at,
  g.industry_tags,
  g.is_universal
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
  NULL::TEXT as regulatory_references,
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
  o.updated_at,
  NULL::TEXT[] as industry_tags,
  true as is_universal
FROM org_controls o
WHERE o.is_hidden = false;


-- D. KRI/KCI Library
DROP VIEW IF EXISTS kri_kci_library CASCADE;

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
  'active'::VARCHAR(20) as status,
  NOW() as approved_at,
  'global' as source,
  g.created_at,
  g.updated_at,
  g.industry_tags,
  g.is_universal
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
  o.updated_at,
  NULL::TEXT[] as industry_tags,
  true as is_universal
FROM org_kri_kci o
WHERE o.is_hidden = false;
