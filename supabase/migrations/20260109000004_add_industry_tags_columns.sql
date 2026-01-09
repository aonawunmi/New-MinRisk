-- SAFE VERSION: Add industry_tags columns to global library tables
-- This version skips re-creating views that might be tables in your environment

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
