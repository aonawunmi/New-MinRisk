-- Migration: Add Metadata Columns to KRI/KCI Library
-- Description: Add indicator category and subtype from KRI/KCI files
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Add new metadata columns to kri_kci_library
ALTER TABLE kri_kci_library
  ADD COLUMN IF NOT EXISTS indicator_category VARCHAR(50), -- Infrastructure, Cybersecurity, Operations, etc.
  ADD COLUMN IF NOT EXISTS indicator_subtype VARCHAR(50); -- Threshold, Trend, Anomaly, Count, Impact, etc.

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_indicator_category ON kri_kci_library(indicator_category);
CREATE INDEX IF NOT EXISTS idx_indicator_subtype ON kri_kci_library(indicator_subtype);

-- Comments for documentation
COMMENT ON COLUMN kri_kci_library.indicator_category IS 'Indicator category: Infrastructure, Cybersecurity, Operations, Finance, HR, Governance, Compliance, etc.';
COMMENT ON COLUMN kri_kci_library.indicator_subtype IS 'Indicator subtype: Threshold, Trend, Anomaly, Count, Security, Capacity, Impact, Loss, Efficiency, etc.';
