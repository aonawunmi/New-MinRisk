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
      NULL as category,
      NULL as subcategory,
      NULL as target_value,
      threshold_warning as warning_threshold,
      threshold_critical as critical_threshold,
      NULL as threshold_direction
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
-- Backup existing kri_kci_library table
DROP TABLE IF EXISTS kri_kci_library_backup_20251126;
DROP VIEW IF EXISTS kri_kci_library_backup_20251126;

-- Rename table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kri_kci_library') THEN
    ALTER TABLE kri_kci_library RENAME TO kri_kci_library_backup_20251126;
  END IF;
END $$;

-- Force drop view if it exists (in case it was a view not a table)
DROP VIEW IF EXISTS kri_kci_library CASCADE;


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
