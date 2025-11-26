-- ============================================================================
-- KRI Tables - Add Constraints and Indexes (Step 2 of 3)
-- Run this after 01-create-kri-tables-minimal.sql
-- ============================================================================

-- Add foreign keys to kri_definitions
ALTER TABLE kri_definitions
  ADD CONSTRAINT fk_kri_definitions_org
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE kri_definitions
  ADD CONSTRAINT fk_kri_definitions_user
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to kri_definitions
ALTER TABLE kri_definitions
  ADD CONSTRAINT uk_kri_code UNIQUE(organization_id, kri_code);

ALTER TABLE kri_definitions
  ADD CONSTRAINT ck_indicator_type
  CHECK (indicator_type IN ('leading', 'lagging', 'concurrent'));

ALTER TABLE kri_definitions
  ADD CONSTRAINT ck_collection_frequency
  CHECK (collection_frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'));

ALTER TABLE kri_definitions
  ADD CONSTRAINT ck_threshold_direction
  CHECK (threshold_direction IN ('above', 'below', 'between'));

-- Add foreign keys to kri_data_entries
ALTER TABLE kri_data_entries
  ADD CONSTRAINT fk_kri_data_entries_kri
  FOREIGN KEY (kri_id) REFERENCES kri_definitions(id) ON DELETE CASCADE;

ALTER TABLE kri_data_entries
  ADD CONSTRAINT fk_kri_data_entries_user
  FOREIGN KEY (entered_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to kri_data_entries
ALTER TABLE kri_data_entries
  ADD CONSTRAINT uk_kri_measurement_date UNIQUE(kri_id, measurement_date);

ALTER TABLE kri_data_entries
  ADD CONSTRAINT ck_alert_status
  CHECK (alert_status IN ('green', 'yellow', 'red'));

ALTER TABLE kri_data_entries
  ADD CONSTRAINT ck_data_quality
  CHECK (data_quality IN ('verified', 'estimated', 'provisional'));

-- Add foreign keys to kri_alerts
ALTER TABLE kri_alerts
  ADD CONSTRAINT fk_kri_alerts_kri
  FOREIGN KEY (kri_id) REFERENCES kri_definitions(id) ON DELETE CASCADE;

ALTER TABLE kri_alerts
  ADD CONSTRAINT fk_kri_alerts_acknowledged
  FOREIGN KEY (acknowledged_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

ALTER TABLE kri_alerts
  ADD CONSTRAINT fk_kri_alerts_resolved
  FOREIGN KEY (resolved_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to kri_alerts
ALTER TABLE kri_alerts
  ADD CONSTRAINT ck_alert_level CHECK (alert_level IN ('yellow', 'red'));

ALTER TABLE kri_alerts
  ADD CONSTRAINT ck_alert_status
  CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed'));

-- Add foreign keys to kri_risk_links
ALTER TABLE kri_risk_links
  ADD CONSTRAINT fk_kri_risk_links_kri
  FOREIGN KEY (kri_id) REFERENCES kri_definitions(id) ON DELETE CASCADE;

ALTER TABLE kri_risk_links
  ADD CONSTRAINT fk_kri_risk_links_user
  FOREIGN KEY (linked_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraints to kri_risk_links
ALTER TABLE kri_risk_links
  ADD CONSTRAINT uk_kri_risk_link UNIQUE(kri_id, risk_code);

ALTER TABLE kri_risk_links
  ADD CONSTRAINT ck_ai_confidence
  CHECK (ai_link_confidence >= 0 AND ai_link_confidence <= 100);

-- Create indexes
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
