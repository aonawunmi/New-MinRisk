-- ============================================================================
-- KRI Tables - Minimal Version (Step 1 of 3)
-- Run this first to create the basic tables
-- ============================================================================

-- KRI Definitions
CREATE TABLE IF NOT EXISTS kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  kri_code TEXT NOT NULL,
  kri_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  indicator_type TEXT,
  measurement_unit TEXT,
  data_source TEXT,
  collection_frequency TEXT,
  target_value NUMERIC,
  lower_threshold NUMERIC,
  upper_threshold NUMERIC,
  threshold_direction TEXT,
  responsible_user TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KRI Data Entries
CREATE TABLE IF NOT EXISTS kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL,
  measurement_date DATE NOT NULL,
  measurement_value NUMERIC NOT NULL,
  alert_status TEXT,
  data_quality TEXT NOT NULL DEFAULT 'verified',
  notes TEXT,
  entered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KRI Alerts
CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL,
  alert_level TEXT NOT NULL,
  alert_date DATE NOT NULL,
  measured_value NUMERIC NOT NULL,
  threshold_breached NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KRI Risk Links
CREATE TABLE IF NOT EXISTS kri_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL,
  risk_code TEXT NOT NULL,
  ai_link_confidence NUMERIC,
  linked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
