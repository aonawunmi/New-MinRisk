-- ============================================================================
-- KRI Monitoring - Supabase-Safe Migration
-- Creates tables first, then adds all constraints separately
-- ============================================================================

-- Drop existing tables if needed
DROP TABLE IF EXISTS kri_risk_links CASCADE;
DROP TABLE IF EXISTS kri_alerts CASCADE;
DROP TABLE IF EXISTS kri_data_entries CASCADE;
DROP TABLE IF EXISTS kri_definitions CASCADE;

-- ============================================================================
-- STEP 1: CREATE TABLES (No constraints, no foreign keys)
-- ============================================================================

CREATE TABLE kri_definitions (
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

CREATE TABLE kri_data_entries (
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

CREATE TABLE kri_alerts (
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

CREATE TABLE kri_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL,
  risk_code TEXT NOT NULL,
  ai_link_confidence NUMERIC,
  linked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- kri_definitions foreign keys
ALTER TABLE kri_definitions
  ADD CONSTRAINT fk_kri_definitions_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE kri_definitions
  ADD CONSTRAINT fk_kri_definitions_user
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- kri_data_entries foreign keys
ALTER TABLE kri_data_entries
  ADD CONSTRAINT fk_kri_data_entries_kri
  FOREIGN KEY (kri_id) REFERENCES kri_definitions(id) ON DELETE CASCADE;

ALTER TABLE kri_data_entries
  ADD CONSTRAINT fk_kri_data_entries_entered_by
  FOREIGN KEY (entered_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- kri_alerts foreign keys
ALTER TABLE kri_alerts
  ADD CONSTRAINT fk_kri_alerts_kri
  FOREIGN KEY (kri_id) REFERENCES kri_definitions(id) ON DELETE CASCADE;

ALTER TABLE kri_alerts
  ADD CONSTRAINT fk_kri_alerts_acknowledged_by
  FOREIGN KEY (acknowledged_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

ALTER TABLE kri_alerts
  ADD CONSTRAINT fk_kri_alerts_resolved_by
  FOREIGN KEY (resolved_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- kri_risk_links foreign keys
ALTER TABLE kri_risk_links
  ADD CONSTRAINT fk_kri_risk_links_kri
  FOREIGN KEY (kri_id) REFERENCES kri_definitions(id) ON DELETE CASCADE;

ALTER TABLE kri_risk_links
  ADD CONSTRAINT fk_kri_risk_links_linked_by
  FOREIGN KEY (linked_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: ADD CHECK CONSTRAINTS
-- ============================================================================

ALTER TABLE kri_definitions
  ADD CONSTRAINT check_indicator_type
  CHECK (indicator_type IN ('leading', 'lagging', 'concurrent'));

ALTER TABLE kri_definitions
  ADD CONSTRAINT check_collection_frequency
  CHECK (collection_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'));

ALTER TABLE kri_definitions
  ADD CONSTRAINT check_threshold_direction
  CHECK (threshold_direction IN ('above', 'below', 'between'));

ALTER TABLE kri_data_entries
  ADD CONSTRAINT check_alert_status
  CHECK (alert_status IN ('green', 'yellow', 'red'));

ALTER TABLE kri_data_entries
  ADD CONSTRAINT check_data_quality
  CHECK (data_quality IN ('verified', 'estimated', 'provisional'));

ALTER TABLE kri_alerts
  ADD CONSTRAINT check_alert_level
  CHECK (alert_level IN ('yellow', 'red'));

ALTER TABLE kri_alerts
  ADD CONSTRAINT check_status
  CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed'));

ALTER TABLE kri_risk_links
  ADD CONSTRAINT check_ai_confidence
  CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100);

-- ============================================================================
-- STEP 4: ADD UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE kri_definitions
  ADD CONSTRAINT unique_org_kri_code
  UNIQUE (organization_id, kri_code);

ALTER TABLE kri_data_entries
  ADD CONSTRAINT unique_kri_measurement_date
  UNIQUE (kri_id, measurement_date);

ALTER TABLE kri_risk_links
  ADD CONSTRAINT unique_kri_risk_code
  UNIQUE (kri_id, risk_code);

-- ============================================================================
-- STEP 5: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX idx_kri_definitions_code ON kri_definitions(kri_code);
CREATE INDEX idx_kri_definitions_enabled ON kri_definitions(enabled);

CREATE INDEX idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX idx_kri_data_entries_date ON kri_data_entries(measurement_date DESC);
CREATE INDEX idx_kri_data_entries_alert ON kri_data_entries(alert_status);

CREATE INDEX idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX idx_kri_alerts_status ON kri_alerts(status);
CREATE INDEX idx_kri_alerts_level ON kri_alerts(alert_level);
CREATE INDEX idx_kri_alerts_date ON kri_alerts(alert_date DESC);

CREATE INDEX idx_kri_risk_links_kri ON kri_risk_links(kri_id);
CREATE INDEX idx_kri_risk_links_risk ON kri_risk_links(risk_code);

-- ============================================================================
-- STEP 6: ENABLE RLS
-- ============================================================================

ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_risk_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- kri_definitions policies
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

-- kri_data_entries policies
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

-- kri_alerts policies
DROP POLICY IF EXISTS kri_alerts_select_policy ON kri_alerts;
CREATE POLICY kri_alerts_select_policy ON kri_alerts FOR SELECT
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_alerts_insert_policy ON kri_alerts;
CREATE POLICY kri_alerts_insert_policy ON kri_alerts FOR INSERT
  WITH CHECK (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS kri_alerts_update_policy ON kri_alerts;
CREATE POLICY kri_alerts_update_policy ON kri_alerts FOR UPDATE
  USING (kri_id IN (SELECT id FROM kri_definitions WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())));

-- kri_risk_links policies
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
-- STEP 8: CREATE TRIGGERS
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
-- DONE! KRI Monitoring tables are ready
-- ============================================================================
