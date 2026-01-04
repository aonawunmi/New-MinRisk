-- Migration: Add DIME descriptions to app_configs
-- Purpose: Allow admins to customize DIME framework score labels
-- Date: 2026-01-04

-- Add dime_descriptions column to app_configs table
ALTER TABLE app_configs 
ADD COLUMN IF NOT EXISTS dime_descriptions JSONB DEFAULT '{
  "design": {
    "0": {"label": "Not designed", "description": "Control does not address the risk"},
    "1": {"label": "Poorly designed", "description": "Control minimally addresses the risk"},
    "2": {"label": "Partially designed", "description": "Control partially addresses the risk"},
    "3": {"label": "Well designed", "description": "Control specifically addresses the risk"}
  },
  "implementation": {
    "0": {"label": "Not applied", "description": "Control is not applied or applied incorrectly"},
    "1": {"label": "Sometimes applied", "description": "Control is applied inconsistently"},
    "2": {"label": "Generally operational", "description": "Control is usually applied correctly"},
    "3": {"label": "Always applied", "description": "Control is always applied as intended"}
  },
  "monitoring": {
    "0": {"label": "Not monitored", "description": "Control is not monitored at all"},
    "1": {"label": "Ad-hoc monitoring", "description": "Control is monitored on an ad-hoc basis"},
    "2": {"label": "Usually monitored", "description": "Control is regularly monitored"},
    "3": {"label": "Always monitored", "description": "Control is continuously monitored"}
  },
  "evaluation": {
    "0": {"label": "Never evaluated", "description": "Control effectiveness is never evaluated"},
    "1": {"label": "Infrequently evaluated", "description": "Control effectiveness is rarely evaluated"},
    "2": {"label": "Occasionally evaluated", "description": "Control effectiveness is occasionally evaluated"},
    "3": {"label": "Regularly evaluated", "description": "Control effectiveness is regularly evaluated"}
  }
}'::jsonb;

-- Update existing rows with default values if null
UPDATE app_configs 
SET dime_descriptions = '{
  "design": {
    "0": {"label": "Not designed", "description": "Control does not address the risk"},
    "1": {"label": "Poorly designed", "description": "Control minimally addresses the risk"},
    "2": {"label": "Partially designed", "description": "Control partially addresses the risk"},
    "3": {"label": "Well designed", "description": "Control specifically addresses the risk"}
  },
  "implementation": {
    "0": {"label": "Not applied", "description": "Control is not applied or applied incorrectly"},
    "1": {"label": "Sometimes applied", "description": "Control is applied inconsistently"},
    "2": {"label": "Generally operational", "description": "Control is usually applied correctly"},
    "3": {"label": "Always applied", "description": "Control is always applied as intended"}
  },
  "monitoring": {
    "0": {"label": "Not monitored", "description": "Control is not monitored at all"},
    "1": {"label": "Ad-hoc monitoring", "description": "Control is monitored on an ad-hoc basis"},
    "2": {"label": "Usually monitored", "description": "Control is regularly monitored"},
    "3": {"label": "Always monitored", "description": "Control is continuously monitored"}
  },
  "evaluation": {
    "0": {"label": "Never evaluated", "description": "Control effectiveness is never evaluated"},
    "1": {"label": "Infrequently evaluated", "description": "Control effectiveness is rarely evaluated"},
    "2": {"label": "Occasionally evaluated", "description": "Control effectiveness is occasionally evaluated"},
    "3": {"label": "Regularly evaluated", "description": "Control effectiveness is regularly evaluated"}
  }
}'::jsonb
WHERE dime_descriptions IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN app_configs.dime_descriptions IS 'DIME framework score descriptions - admin configurable. Structure: {dimension: {score: {label, description}}}';
