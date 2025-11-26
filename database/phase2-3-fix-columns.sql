-- ============================================================================
-- Fix KRI Definitions Table Column Mismatch
-- ============================================================================
-- Issue: Column names don't match TypeScript interface
-- This script alters the table to match the expected schema
-- ============================================================================

-- Drop the existing table and recreate with correct columns
DROP TABLE IF EXISTS kri_data_entries CASCADE;
DROP TABLE IF EXISTS kri_alerts CASCADE;
DROP TABLE IF EXISTS kri_definitions CASCADE;

-- Recreate KRI Definitions with correct column names
CREATE TABLE kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- KRI Identity (matches TypeScript interface exactly)
  kri_code VARCHAR(50) NOT NULL,
  kri_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  indicator_type VARCHAR(20), -- leading, lagging, concurrent

  -- Measurement Details
  measurement_unit VARCHAR(100),
  data_source VARCHAR(255),
  collection_frequency VARCHAR(20), -- Daily, Weekly, Monthly, Quarterly, Annually

  -- Thresholds
  target_value DECIMAL(15,2),
  lower_threshold DECIMAL(15,2),
  upper_threshold DECIMAL(15,2),
  threshold_direction VARCHAR(20), -- above, below, between

  -- Management
  responsible_user VARCHAR(255),
  enabled BOOLEAN DEFAULT true,

  -- Risk Linking
  linked_risk_codes TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT kri_definitions_unique_code UNIQUE (organization_id, kri_code)
);

-- Recreate KRI Data Entries
CREATE TABLE kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,

  -- Measurement Data
  value DECIMAL(15,2) NOT NULL,
  period VARCHAR(50),
  alert_status VARCHAR(10) DEFAULT 'green', -- green, yellow, red

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate KRI Alerts
CREATE TABLE kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  kri_code VARCHAR(50) NOT NULL,

  -- Alert Details
  alert_level VARCHAR(10) NOT NULL, -- yellow, red
  measured_value DECIMAL(15,2) NOT NULL,
  threshold_breached VARCHAR(50),

  -- Alert Status
  status VARCHAR(20) DEFAULT 'open', -- open, acknowledged, resolved
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate Indexes
CREATE INDEX idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX idx_kri_definitions_code ON kri_definitions(kri_code);
CREATE INDEX idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX idx_kri_data_entries_created ON kri_data_entries(created_at DESC);
CREATE INDEX idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX idx_kri_alerts_status ON kri_alerts(status) WHERE status IN ('open', 'acknowledged');

-- Enable RLS
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;

-- Recreate RLS Policies for KRI Definitions
CREATE POLICY "Users can view their own KRI definitions"
  ON kri_definitions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org KRI definitions"
  ON kri_definitions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'primary_admin', 'super_admin')
    )
  );

CREATE POLICY "Users can insert their own KRI definitions"
  ON kri_definitions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own KRI definitions"
  ON kri_definitions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own KRI definitions"
  ON kri_definitions FOR DELETE
  USING (user_id = auth.uid());

-- Recreate RLS Policies for KRI Data Entries
CREATE POLICY "Users can view KRI data entries"
  ON kri_data_entries FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE user_id = auth.uid()
      UNION
      SELECT id FROM kri_definitions WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'primary_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Users can insert KRI data entries"
  ON kri_data_entries FOR INSERT
  WITH CHECK (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE user_id = auth.uid()
      OR organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Recreate RLS Policies for KRI Alerts
CREATE POLICY "Users can view KRI alerts"
  ON kri_alerts FOR SELECT
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE user_id = auth.uid()
      UNION
      SELECT id FROM kri_definitions WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update KRI alerts"
  ON kri_alerts FOR UPDATE
  USING (
    kri_id IN (
      SELECT id FROM kri_definitions WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_kri_definitions_updated_at
  BEFORE UPDATE ON kri_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'KRI Tables Fixed' AS status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'kri_definitions'
ORDER BY ordinal_position;
