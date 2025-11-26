-- ============================================================================
-- KRI Monitoring - Complete Migration (All-in-One)
-- Creates tables, adds constraints, enables RLS, and creates policies
-- ============================================================================

-- Drop existing tables if needed (CAREFUL - removes all data!)
-- DROP TABLE IF EXISTS kri_risk_links CASCADE;
-- DROP TABLE IF EXISTS kri_alerts CASCADE;
-- DROP TABLE IF EXISTS kri_data_entries CASCADE;
-- DROP TABLE IF EXISTS kri_definitions CASCADE;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  kri_code TEXT NOT NULL,
  kri_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  indicator_type TEXT CHECK (indicator_type IN ('leading', 'lagging', 'concurrent')),
  measurement_unit TEXT,
  data_source TEXT,
  collection_frequency TEXT CHECK (collection_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
  target_value NUMERIC,
  lower_threshold NUMERIC,
  upper_threshold NUMERIC,
  threshold_direction TEXT CHECK (threshold_direction IN ('above', 'below', 'between')),
  responsible_user TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, kri_code)
);

CREATE TABLE IF NOT EXISTS kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  measurement_value NUMERIC NOT NULL,
  alert_status TEXT CHECK (alert_status IN ('green', 'yellow', 'red')),
  data_quality TEXT NOT NULL DEFAULT 'verified' CHECK (data_quality IN ('verified', 'estimated', 'provisional')),
  notes TEXT,
  entered_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kri_id, measurement_date)
);

CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('yellow', 'red')),
  alert_date DATE NOT NULL,
  measured_value NUMERIC NOT NULL,
  threshold_breached NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,
  resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kri_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  ai_link_confidence NUMERIC CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100),
  linked_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kri_id, risk_code)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_code ON kri_definitions(kri_code);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_enabled ON kri_definitions(enabled);

CREATE INDEX IF NOT EXISTS idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_date ON kri_data_entries(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_alert ON kri_data_entries(alert_status);

CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_level ON kri_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_date ON kri_alerts(alert_date DESC);

CREATE INDEX IF NOT EXISTS idx_kri_risk_links_kri ON kri_risk_links(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_risk_links_risk ON kri_risk_links(risk_code);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS kri_definitions_select_policy ON kri_definitions;
CREATE POLICY kri_definitions_select_policy ON kri_definitions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS kri_definitions_insert_policy ON kri_definitions;
CREATE POLICY kri_definitions_insert_policy ON kri_definitions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS kri_definitions_update_policy ON kri_definitions;
CREATE POLICY kri_definitions_update_policy ON kri_definitions FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS kri_definitions_delete_policy ON kri_definitions;
CREATE POLICY kri_definitions_delete_policy ON kri_definitions FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS kri_data_entries_select_policy ON kri_data_entries;
CREATE POLICY kri_data_entries_select_policy ON kri_data_entries FOR SELECT
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_data_entries_insert_policy ON kri_data_entries;
CREATE POLICY kri_data_entries_insert_policy ON kri_data_entries FOR INSERT
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_data_entries_update_policy ON kri_data_entries;
CREATE POLICY kri_data_entries_update_policy ON kri_data_entries FOR UPDATE
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_data_entries_delete_policy ON kri_data_entries;
CREATE POLICY kri_data_entries_delete_policy ON kri_data_entries FOR DELETE
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_alerts_select_policy ON kri_alerts;
CREATE POLICY kri_alerts_select_policy ON kri_alerts FOR SELECT
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_alerts_insert_policy ON kri_alerts;
CREATE POLICY kri_alerts_insert_policy ON kri_alerts FOR INSERT
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_alerts_update_policy ON kri_alerts;
CREATE POLICY kri_alerts_update_policy ON kri_alerts FOR UPDATE
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_risk_links_select_policy ON kri_risk_links;
CREATE POLICY kri_risk_links_select_policy ON kri_risk_links FOR SELECT
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_risk_links_insert_policy ON kri_risk_links;
CREATE POLICY kri_risk_links_insert_policy ON kri_risk_links FOR INSERT
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_risk_links_delete_policy ON kri_risk_links;
CREATE POLICY kri_risk_links_delete_policy ON kri_risk_links FOR DELETE
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_kri_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kri_definitions_updated_at ON kri_definitions;
CREATE TRIGGER kri_definitions_updated_at
  BEFORE UPDATE ON kri_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_kri_definitions_updated_at();

-- ============================================================================
-- DONE
-- ============================================================================
