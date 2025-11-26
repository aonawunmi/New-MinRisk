-- Migration: Add Metadata Columns to Control Library
-- Description: Add cost, timeline, ownership, and complexity columns from MASTER_CONTROL_LIBRARY
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Add new metadata columns to control_library
ALTER TABLE control_library
  ADD COLUMN IF NOT EXISTS cost VARCHAR(20) CHECK (cost IN ('Low', 'Medium', 'High')),
  ADD COLUMN IF NOT EXISTS timeline VARCHAR(20) CHECK (timeline IN ('Short', 'Medium', 'Long')),
  ADD COLUMN IF NOT EXISTS ownership VARCHAR(100), -- e.g., 'IT/Security', 'Finance', 'HR/Risk'
  ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) CHECK (complexity IN ('Basic', 'Intermediate', 'Advanced'));

-- Create indexes for filtering by metadata
CREATE INDEX IF NOT EXISTS idx_control_cost ON control_library(cost);
CREATE INDEX IF NOT EXISTS idx_control_timeline ON control_library(timeline);
CREATE INDEX IF NOT EXISTS idx_control_complexity ON control_library(complexity);

-- Comments for documentation
COMMENT ON COLUMN control_library.cost IS 'Implementation cost: Low, Medium, or High';
COMMENT ON COLUMN control_library.timeline IS 'Implementation timeline: Short (< 3 months), Medium (3-6 months), Long (6+ months)';
COMMENT ON COLUMN control_library.ownership IS 'Organizational ownership (e.g., IT, Security, Finance, HR, Ops)';
COMMENT ON COLUMN control_library.complexity IS 'Implementation complexity: Basic, Intermediate, or Advanced';
