-- Migration: Create KRI/KCI Library
-- Description: Create table for Key Risk Indicators (KRIs) and Key Control Indicators (KCIs)
-- Feature Branch: feature/risk-register-upgrade
-- Date: 2025-11-26

-- Create kri_kci_library table
CREATE TABLE IF NOT EXISTS kri_kci_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(20) NOT NULL,
  indicator_type VARCHAR(10) NOT NULL CHECK (indicator_type IN ('KRI', 'KCI')),
  indicator_name VARCHAR(200) NOT NULL,
  indicator_description TEXT,

  -- Measurement details
  measurement_unit VARCHAR(50), -- e.g., %, count, $, hours
  measurement_frequency VARCHAR(50) CHECK (measurement_frequency IN ('real-time', 'daily', 'weekly', 'monthly', 'quarterly', 'annually')),

  -- Thresholds
  threshold_warning NUMERIC, -- Warning level
  threshold_critical NUMERIC, -- Critical level

  -- Data source
  data_source VARCHAR(200), -- Where the data comes from (e.g., monitoring system, manual report)
  calculation_method TEXT, -- How the indicator is calculated

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'pending')),
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_indicator_code UNIQUE(organization_id, indicator_code)
);

-- Create indexes for performance
CREATE INDEX idx_indicator_org ON kri_kci_library(organization_id);
CREATE INDEX idx_indicator_status ON kri_kci_library(status);
CREATE INDEX idx_indicator_type ON kri_kci_library(indicator_type);
CREATE INDEX idx_indicator_frequency ON kri_kci_library(measurement_frequency);
CREATE INDEX idx_indicator_name ON kri_kci_library(indicator_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_indicator_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER indicator_updated_at
  BEFORE UPDATE ON kri_kci_library
  FOR EACH ROW
  EXECUTE FUNCTION update_indicator_timestamp();

-- Row Level Security (RLS)
ALTER TABLE kri_kci_library ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view indicators from their organization
CREATE POLICY indicator_view_policy ON kri_kci_library
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can suggest new indicators (creates with 'pending' status)
CREATE POLICY indicator_suggest_policy ON kri_kci_library
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND status = 'pending'
    AND created_by = auth.uid()
  );

-- Policy: Only admins can approve/update indicators
CREATE POLICY indicator_admin_update_policy ON kri_kci_library
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete indicators
CREATE POLICY indicator_admin_delete_policy ON kri_kci_library
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE kri_kci_library IS 'Library of Key Risk Indicators (KRIs) for root causes and Key Control Indicators (KCIs) for impacts';
COMMENT ON COLUMN kri_kci_library.indicator_code IS 'Unique code for the indicator (e.g., KRI-001 or KCI-001)';
COMMENT ON COLUMN kri_kci_library.indicator_type IS 'Type: KRI (Key Risk Indicator - monitors root causes) or KCI (Key Control Indicator - monitors impacts)';
COMMENT ON COLUMN kri_kci_library.indicator_name IS 'Short name of the indicator (e.g., Server CPU utilization %)';
COMMENT ON COLUMN kri_kci_library.measurement_unit IS 'Unit of measurement (e.g., %, count, $, hours)';
COMMENT ON COLUMN kri_kci_library.measurement_frequency IS 'How often the indicator is measured';
COMMENT ON COLUMN kri_kci_library.threshold_warning IS 'Warning threshold value';
COMMENT ON COLUMN kri_kci_library.threshold_critical IS 'Critical threshold value';
COMMENT ON COLUMN kri_kci_library.data_source IS 'Where the indicator data comes from';
COMMENT ON COLUMN kri_kci_library.calculation_method IS 'How the indicator is calculated';
COMMENT ON COLUMN kri_kci_library.usage_count IS 'Number of risks currently using this indicator';
